using System.Data;
using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Api.Shared.Time;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Pos;

public sealed class PosSessionService
{
  private readonly AppDbContext _db;
  private readonly FinanceService _finance;

  public PosSessionService(AppDbContext db, FinanceService finance)
  {
    _db = db;
    _finance = finance;
  }

  public async Task<PagedResult<PosRegisterResponse>> GetRegistersAsync(PosRegisterListQuery request, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var query = _db.PosRegisters.AsNoTracking().Where(register => register.BranchId == branchId);
    if (!request.IncludeInactive) query = query.Where(register => register.IsActive);
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(register => register.Code.ToLower().Contains(search) || register.Name.ToLower().Contains(search));
    }
    return await query.OrderBy(register => register.Code).ThenBy(register => register.Id)
      .Select(register => new PosRegisterResponse(
        register.Id,
        register.Code,
        register.Name,
        register.BranchId,
        register.IsActive,
        register.Sessions.Any(session => session.Status == PosSessionStatus.Open),
        register.Cashboxes.OrderBy(cashbox => cashbox.Currency.Code).Select(cashbox => new PosRegisterCashboxResponse(
          cashbox.MoneyAccountId, cashbox.MoneyAccount.Code, cashbox.MoneyAccount.Name,
          cashbox.CurrencyId, cashbox.Currency.Code, cashbox.Currency.DecimalPlaces)).ToList()))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PosRegisterResponse> GetRegisterAsync(Guid id, CancellationToken ct)
  {
    var branchId = RequireBranch();
    return await _db.PosRegisters.AsNoTracking()
      .Where(register => register.Id == id && register.BranchId == branchId)
      .Select(register => new PosRegisterResponse(
        register.Id,
        register.Code,
        register.Name,
        register.BranchId,
        register.IsActive,
        register.Sessions.Any(session => session.Status == PosSessionStatus.Open),
        register.Cashboxes.OrderBy(cashbox => cashbox.Currency.Code).Select(cashbox => new PosRegisterCashboxResponse(
          cashbox.MoneyAccountId, cashbox.MoneyAccount.Code, cashbox.MoneyAccount.Name,
          cashbox.CurrencyId, cashbox.Currency.Code, cashbox.Currency.DecimalPlaces)).ToList()))
      .SingleOrDefaultAsync(ct)
      ?? throw RegisterNotFound();
  }

  public async Task<PosRegisterResponse> CreateRegisterAsync(CreatePosRegisterRequest request, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var code = NormalizeCode(request.Code);
    if (await _db.PosRegisters.IgnoreQueryFilters().AnyAsync(register => register.Code == code, ct))
      throw new ConflictException(ErrorCodes.Pos.RegisterCodeTaken, $"POS Register code '{code}' is already in use.");
    var cashboxes = await ValidateRegisterCashboxesAsync(request.CashboxMoneyAccountIds, null, ct);

    var register = new PosRegisterEntity
    {
      Code = code,
      Name = request.Name.Trim(),
      BranchId = branchId,
      IsActive = true
    };
    foreach (var cashbox in cashboxes)
      register.Cashboxes.Add(new PosRegisterCashboxEntity
      {
        MoneyAccountId = cashbox.Id,
        BranchId = branchId,
        CurrencyId = cashbox.CurrencyId
      });
    _db.PosRegisters.Add(register);
    await SaveRegisterAsync(ct);
    return await GetRegisterAsync(register.Id, ct);
  }

  public async Task<PosRegisterResponse> UpdateRegisterAsync(Guid id, UpdatePosRegisterRequest request, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var register = await _db.PosRegisters.Include(item => item.Cashboxes)
      .SingleOrDefaultAsync(item => item.Id == id && item.BranchId == branchId, ct)
      ?? throw RegisterNotFound();
    var code = NormalizeCode(request.Code);
    if (code != register.Code && await _db.PosRegisters.IgnoreQueryFilters().AnyAsync(item => item.Code == code && item.Id != id, ct))
      throw new ConflictException(ErrorCodes.Pos.RegisterCodeTaken, $"POS Register code '{code}' is already in use.");
    if (!request.IsActive && await _db.PosSessions.AnyAsync(session => session.RegisterId == id && session.Status == PosSessionStatus.Open, ct))
      throw new ConflictException(ErrorCodes.Pos.SessionAlreadyOpen,
        "Close the active POS Session before deactivating this Register.");
    ValidateCashboxIdShape(request.CashboxMoneyAccountIds);
    var requestedCashboxIds = request.CashboxMoneyAccountIds.Distinct().Order().ToList();
    var currentCashboxIds = register.Cashboxes.Select(cashbox => cashbox.MoneyAccountId).Order().ToList();
    var assignmentsChanged = !requestedCashboxIds.SequenceEqual(currentCashboxIds);
    if (assignmentsChanged && await _db.PosSessions.AnyAsync(
      session => session.RegisterId == id && session.Status == PosSessionStatus.Open, ct))
      throw new ConflictException(ErrorCodes.Pos.CashboxAssignmentLocked,
        "Close the active POS Session before changing this Register's Cashboxes.");
    if (assignmentsChanged)
    {
      var cashboxes = await ValidateRegisterCashboxesAsync(request.CashboxMoneyAccountIds, register.Id, ct);
      var requestedByCurrency = cashboxes.ToDictionary(cashbox => cashbox.CurrencyId);
      foreach (var existing in register.Cashboxes
        .Where(mapping => !requestedByCurrency.ContainsKey(mapping.CurrencyId)).ToList())
      {
        _db.PosRegisterCashboxes.Remove(existing);
        register.Cashboxes.Remove(existing);
      }
      foreach (var cashbox in cashboxes)
      {
        var existing = register.Cashboxes.SingleOrDefault(mapping => mapping.CurrencyId == cashbox.CurrencyId);
        if (existing is not null)
        {
          existing.MoneyAccountId = cashbox.Id;
          continue;
        }
        register.Cashboxes.Add(new PosRegisterCashboxEntity
        {
          MoneyAccountId = cashbox.Id, BranchId = branchId, CurrencyId = cashbox.CurrencyId
        });
      }
    }

    register.Code = code;
    register.Name = request.Name.Trim();
    register.IsActive = request.IsActive;
    await SaveRegisterAsync(ct);
    return await GetRegisterAsync(register.Id, ct);
  }

  public async Task<PosSessionResponse?> GetActiveSessionAsync(Guid userId, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var session = await SessionQuery().AsNoTracking()
      .SingleOrDefaultAsync(item => item.BranchId == branchId && item.CashierUserId == userId && item.Status == PosSessionStatus.Open, ct);
    return session is null ? null : ToSessionResponse(session);
  }

  public async Task<PosSessionResponse> OpenSessionAsync(Guid userId, OpenPosSessionRequest request, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var register = await _db.PosRegisters
      .Include(item => item.Cashboxes).ThenInclude(cashbox => cashbox.MoneyAccount).ThenInclude(account => account.Currency)
      .Include(item => item.Cashboxes).ThenInclude(cashbox => cashbox.MoneyAccount).ThenInclude(account => account.AccessAssignments)
      .SingleOrDefaultAsync(item => item.Id == request.RegisterId && item.BranchId == branchId, ct)
      ?? throw RegisterNotFound();
    if (!register.IsActive)
      throw new BadRequestException(ErrorCodes.Pos.RegisterInactive, "Select an active POS Register.");
    if (await _db.PosSessions.AnyAsync(item => item.RegisterId == register.Id && item.Status == PosSessionStatus.Open, ct))
      throw new ConflictException(ErrorCodes.Pos.SessionAlreadyOpen, "This POS Register already has an open session.");
    if (await _db.PosSessions.AnyAsync(item => item.BranchId == branchId && item.CashierUserId == userId && item.Status == PosSessionStatus.Open, ct))
      throw new ConflictException(ErrorCodes.Pos.SessionAlreadyOpen, "You already have an open POS Session in this branch.");

    var openedAt = DateTimeOffset.UtcNow;
    var business = await GetBusinessAsync(ct);
    if (register.Cashboxes.Count == 0)
      throw new BadRequestException(ErrorCodes.Pos.RegisterCashboxInvalid,
        "Configure at least one active Cashbox for this POS Register before opening a session.");
    foreach (var mapping in register.Cashboxes)
      if (!mapping.MoneyAccount.IsActive || mapping.MoneyAccount.Type != MoneyAccountType.Cashbox
        || !mapping.MoneyAccount.Currency.IsActive
        || !mapping.MoneyAccount.AccessAssignments.Any(access => access.UserId == userId
          && access.AccessLevel == MoneyAccountAccessLevel.Operate))
        throw new BadRequestException(ErrorCodes.Pos.RegisterCashboxInvalid,
          $"Cashbox '{mapping.MoneyAccount.Code}' is inactive or the cashier does not have Operate access.");

    var ratesByAccount = new Dictionary<Guid, decimal>();
    foreach (var mapping in register.Cashboxes)
    {
      var rate = await ExchangeRateResolver.FindAsync(
        _db, mapping.CurrencyId, business.BaseCurrencyId, openedAt.UtcDateTime, ct);
      if (rate is null)
        throw new BadRequestException(ErrorCodes.Pos.OpeningCountInvalid,
          "Every operable Cashbox currency needs an effective exchange rate before a POS Session can open.");
      ratesByAccount[mapping.MoneyAccountId] = rate.Value;
    }
    ValidateOpeningCounts(request.OpeningCounts, ratesByAccount.Keys);
    var cashboxesById = register.Cashboxes.ToDictionary(cashbox => cashbox.MoneyAccountId);

    var session = new PosSessionEntity
    {
      SessionNumber = await NextSessionNumberAsync(ct),
      BranchId = branchId,
      RegisterId = register.Id,
      CashierUserId = userId,
      Status = PosSessionStatus.Open,
      OpenedAtUtc = openedAt,
      OpeningNotes = Trim(request.Notes),
      CreatedAtUtc = openedAt,
      UpdatedAtUtc = openedAt
    };

    foreach (var requestCount in request.OpeningCounts)
    {
      var mapping = cashboxesById[requestCount.MoneyAccountId];
      var rate = ratesByAccount[requestCount.MoneyAccountId];
      session.OpeningCounts.Add(new PosSessionOpeningCountEntity
      {
        BranchId = branchId,
        MoneyAccountId = requestCount.MoneyAccountId,
        CurrencyId = mapping.CurrencyId,
        Amount = Money(requestCount.Amount),
        ExchangeRate = rate,
        BaseAmount = Money(requestCount.Amount * rate)
      });
    }

    _db.PosSessions.Add(session);
    try
    {
      await _db.SaveChangesAsync(ct);
    }
    catch (Exception exception) when (PosConcurrency.IsConflict(exception))
    {
      throw new ConflictException(ErrorCodes.Pos.SessionAlreadyOpen,
        "The Register or cashier already has an open POS Session. Refresh and try again.");
    }
    return await GetSessionAsync(userId, session.Id, ct);
  }

  public async Task<PosSessionResponse> GetSessionAsync(Guid userId, Guid id, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var session = await SessionQuery().AsNoTracking().SingleOrDefaultAsync(item => item.Id == id && item.BranchId == branchId, ct)
      ?? throw SessionNotFound();
    await EnsureSessionAccessAsync(userId, session.CashierUserId, ct);
    return ToSessionResponse(session);
  }

  public async Task<PagedResult<PosSessionListResponse>> GetSessionsAsync(Guid userId, PosSessionListQuery request, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var management = await CanManageOthersAsync(userId, ct);
    var business = await GetBusinessAsync(ct);
    var query = _db.PosSessions.AsNoTracking().Where(session => session.BranchId == branchId);
    if (!management) query = query.Where(session => session.CashierUserId == userId);
    if (request.Status is not null) query = query.Where(session => session.Status == request.Status);
    if (request.RegisterId is not null) query = query.Where(session => session.RegisterId == request.RegisterId);
    if (request.CashierUserId is not null && management) query = query.Where(session => session.CashierUserId == request.CashierUserId);
    if (request.FromDate is not null)
    {
      var from = BusinessTime.UtcRange(business, request.FromDate.Value, request.FromDate.Value).FromUtc;
      query = query.Where(session => session.OpenedAtUtc >= from);
    }
    if (request.ToDate is not null)
    {
      var to = BusinessTime.UtcRange(business, request.ToDate.Value, request.ToDate.Value).ToUtc;
      query = query.Where(session => session.OpenedAtUtc < to);
    }

    return await query.OrderByDescending(session => session.OpenedAtUtc)
      .ThenByDescending(session => session.SessionNumber)
      .Select(session => new PosSessionListResponse(
        session.Id, session.SessionNumber, session.RegisterId, session.Register.Code, session.Register.Name,
        session.CashierUserId, session.CashierUser.Username, session.Status, session.OpenedAtUtc, session.ClosedAtUtc,
        session.PosContexts.Count(context => !context.SalesInvoice.IsDeleted),
        session.PosContexts.Where(context => !context.SalesInvoice.IsDeleted)
          .Sum(sale => (decimal?)sale.SalesInvoice.BaseTotal) ?? 0m,
        session.ClosingCounts.Sum(count => (decimal?)count.VarianceBaseAmount) ?? 0m,
        session.ZReport != null ? session.ZReport.BaseCurrencyCode : business.BaseCurrency.Code))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PosXReportResponse> GetXReportAsync(Guid userId, Guid sessionId, CancellationToken ct)
  {
    var session = await GetReportSessionAsync(userId, sessionId, trackChanges: false, ct);
    var business = await GetBusinessAsync(ct);
    return BuildXReport(session, business.BaseCurrencyId, business.BaseCurrency.Code);
  }

  public async Task<PosZReportResponse> CloseSessionAsync(
    Guid userId,
    Guid sessionId,
    ClosePosSessionRequest request,
    CancellationToken ct)
  {
    try
    {
      return await CloseSessionCoreAsync(userId, sessionId, request, ct);
    }
    catch (Exception exception) when (PosConcurrency.IsConflict(exception))
    {
      throw new ConflictException(ErrorCodes.Pos.SessionCloseConflict,
        "Another request changed this session or report numbering. Refresh and try again.");
    }
  }

  private async Task<PosZReportResponse> CloseSessionCoreAsync(
    Guid userId,
    Guid sessionId,
    ClosePosSessionRequest request,
    CancellationToken ct)
  {
    var branchId = RequireBranch();
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;

    if (UsesPostgres())
      await _db.Database.ExecuteSqlInterpolatedAsync(
        $"SELECT \"Id\" FROM pos_sessions WHERE \"Id\" = {sessionId} AND \"BranchId\" = {branchId} FOR UPDATE", ct);

    var session = await GetReportSessionAsync(userId, sessionId, trackChanges: true, ct);
    if (session.BranchId != branchId)
      throw SessionNotFound();
    var closingNotes = Trim(request.Notes);
    if (userId != session.CashierUserId && closingNotes is null)
      throw new BadRequestException(ErrorCodes.Pos.SessionClosingNoteRequired,
        "Enter a closing reason when closing another cashier's POS Session.");
    if (await _db.PosZReports.IgnoreQueryFilters().AnyAsync(report => report.PosSessionId == session.Id, ct))
      throw new ConflictException(ErrorCodes.Pos.SessionCloseConflict, "This POS Session already has a Z Report.");

    var business = await GetBusinessAsync(ct);
    var x = BuildXReport(session, business.BaseCurrencyId, business.BaseCurrency.Code);
    ValidateClosingCounts(request.ClosingCounts, x.Drawers.Select(drawer => drawer.MoneyAccountId));
    var closedAt = DateTimeOffset.UtcNow;
    var closingByAccount = request.ClosingCounts.ToDictionary(count => count.MoneyAccountId);

    foreach (var drawer in x.Drawers)
    {
      var requestCount = closingByAccount[drawer.MoneyAccountId];
      var rate = await _finance.ResolveCurrentRateAsync(drawer.CurrencyId, business.BaseCurrencyId, closedAt.UtcDateTime, ct);
      var counted = Money(requestCount.CountedAmount);
      var countedBase = Money(counted * rate);
      _db.PosSessionClosingCounts.Add(new PosSessionClosingCountEntity
      {
        PosSession = session,
        BranchId = session.BranchId,
        MoneyAccountId = drawer.MoneyAccountId,
        CurrencyId = drawer.CurrencyId,
        ExpectedAmount = drawer.ExpectedAmount,
        CountedAmount = counted,
        VarianceAmount = Money(counted - drawer.ExpectedAmount),
        ExchangeRate = rate,
        ExpectedBaseAmount = Money(drawer.ExpectedAmount * rate),
        CountedBaseAmount = countedBase,
        VarianceBaseAmount = Money((counted - drawer.ExpectedAmount) * rate)
      });
    }

    var closer = await _db.Users.AsNoTracking().SingleAsync(user => user.Id == userId, ct);
    session.Status = PosSessionStatus.Closed;
    session.ClosedAtUtc = closedAt;
    session.ClosedByUserId = userId;
    session.ClosingNotes = closingNotes;
    session.UpdatedAtUtc = closedAt;

    var z = CreateZReport(session, x, new PosZReportIdentity(
      Guid.NewGuid(),
      await NextZReportNumberAsync(ct),
      session.BranchId,
      session.Branch.Code,
      session.Branch.Name,
      session.RegisterId,
      session.Register.Code,
      session.Register.Name,
      session.CashierUserId,
      session.CashierUser.Username,
      userId,
      closer.Username,
      business.BaseCurrencyId,
      business.BaseCurrency.Code,
      session.OpenedAtUtc,
      closedAt),
      closedAt);

    _db.PosZReports.Add(z);
    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);

    return await GetZReportAsync(userId, z.Id, ct);
  }

  public async Task<PagedResult<PosZReportListResponse>> GetZReportsAsync(
    Guid userId,
    PosZReportListQuery request,
    CancellationToken ct)
  {
    var branchId = RequireBranch();
    var management = await CanManageOthersAsync(userId, ct);
    var business = await GetBusinessAsync(ct);
    var query = _db.PosZReports.AsNoTracking().Where(report => report.BranchId == branchId);
    if (!management) query = query.Where(report => report.CashierUserId == userId);
    if (request.RegisterId is not null) query = query.Where(report => report.RegisterId == request.RegisterId);
    if (request.CashierUserId is not null && management) query = query.Where(report => report.CashierUserId == request.CashierUserId);
    if (request.FromDate is not null)
    {
      var from = BusinessTime.UtcRange(business, request.FromDate.Value, request.FromDate.Value).FromUtc;
      query = query.Where(report => report.ClosedAtUtc >= from);
    }
    if (request.ToDate is not null)
    {
      var to = BusinessTime.UtcRange(business, request.ToDate.Value, request.ToDate.Value).ToUtc;
      query = query.Where(report => report.ClosedAtUtc < to);
    }

    return await query.OrderByDescending(report => report.ClosedAtUtc)
      .ThenByDescending(report => report.ReportNumber)
      .Select(report => new PosZReportListResponse(
        report.Id, report.ReportNumber, report.PosSessionId, report.PosSession.SessionNumber,
        report.RegisterId, report.RegisterCode, report.RegisterName,
        report.CashierUserId, report.CashierUsername, report.OpenedAtUtc, report.ClosedAtUtc,
        report.SaleCount, report.GrossSalesBase,
        report.RefundCount, report.RefundTotalBase, report.NetSalesBase,
        report.DrawerSummaries.Sum(drawer => (decimal?)drawer.VarianceBaseAmount) ?? 0m,
        report.BaseCurrencyCode))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PosZReportResponse> GetZReportAsync(Guid userId, Guid id, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var report = await _db.PosZReports.AsNoTracking()
      .Include(item => item.PosSession)
      .Include(item => item.PaymentSummaries)
      .Include(item => item.DrawerSummaries)
      .SingleOrDefaultAsync(item => item.Id == id && item.BranchId == branchId, ct)
      ?? throw new NotFoundException(ErrorCodes.Pos.ZReportNotFound, "POS Z Report was not found.");
    await EnsureSessionAccessAsync(userId, report.CashierUserId, ct);
    return ToZReportResponse(report);
  }

  internal async Task<PosSessionEntity> RequireOpenSessionAsync(
    Guid userId,
    Guid sessionId,
    Guid branchId,
    CancellationToken ct)
  {
    var selectedBranchId = RequireBranch();
    if (branchId != selectedBranchId)
      throw new BadRequestException(ErrorCodes.Pos.SessionAccessDenied,
        "The checkout branch must match the active branch workspace.");
    // Lock before reading status so checkout and closing serialize on the same row.
    if (UsesPostgres())
      await _db.Database.ExecuteSqlInterpolatedAsync(
        $"SELECT \"Id\" FROM pos_sessions WHERE \"Id\" = {sessionId} AND \"BranchId\" = {branchId} FOR UPDATE", ct);
    var session = await _db.PosSessions.Include(item => item.OpeningCounts)
      .SingleOrDefaultAsync(item => item.Id == sessionId && item.BranchId == branchId, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.SessionRequired, "Open a POS Session before completing a checkout.");
    if (session.Status != PosSessionStatus.Open)
      throw new ConflictException(ErrorCodes.Pos.SessionClosed, "This POS Session is already closed. Open a new session.");
    if (session.CashierUserId != userId)
      throw new ForbiddenException(ErrorCodes.Pos.SessionAccessDenied,
        "A cashier can only complete sales in their own open POS Session.");
    return session;
  }

  internal async Task<PosSessionEntity> RequireOpenSessionForManagementAsync(
    Guid userId,
    Guid sessionId,
    Guid branchId,
    CancellationToken ct)
  {
    var selectedBranchId = RequireBranch();
    if (branchId != selectedBranchId)
      throw new BadRequestException(ErrorCodes.Pos.SessionAccessDenied,
        "The POS Session must belong to the active branch workspace.");
    if (UsesPostgres())
      await _db.Database.ExecuteSqlInterpolatedAsync(
        $"SELECT \"Id\" FROM pos_sessions WHERE \"Id\" = {sessionId} AND \"BranchId\" = {branchId} FOR UPDATE", ct);
    var session = await _db.PosSessions.Include(item => item.OpeningCounts)
      .SingleOrDefaultAsync(item => item.Id == sessionId && item.BranchId == branchId, ct)
      ?? throw SessionNotFound();
    if (session.Status != PosSessionStatus.Open)
      throw new ConflictException(ErrorCodes.Pos.SessionClosed, "This POS Session is already closed.");
    if (!await CanManageOthersAsync(userId, ct))
      throw new ForbiddenException(ErrorCodes.Pos.SessionAccessDenied,
        "Only a Manager, Owner, or SuperAdmin may manage POS drawer movements.");
    return session;
  }

  internal async Task<PosSessionEntity?> FindSessionForInvoiceCorrectionAsync(
    Guid sessionId,
    Guid branchId,
    CancellationToken ct)
  {
    if (RequireBranch() != branchId) return null;
    return await SessionReportQuery()
      .Include(session => session.ZReport).ThenInclude(report => report!.PaymentSummaries)
      .Include(session => session.ZReport).ThenInclude(report => report!.DrawerSummaries)
      .SingleOrDefaultAsync(session => session.Id == sessionId && session.BranchId == branchId, ct);
  }

  internal PosZReportEntity RegenerateClosedSessionZReport(
    PosSessionEntity session,
    PosZReportIdentity identity,
    DateTimeOffset generatedAtUtc)
  {
    var x = BuildXReport(session, identity.BaseCurrencyId, identity.BaseCurrencyCode);
    var closingCounts = session.ClosingCounts.ToDictionary(count => count.MoneyAccountId);
    foreach (var drawer in x.Drawers)
    {
      var close = closingCounts[drawer.MoneyAccountId];
      close.ExpectedAmount = drawer.ExpectedAmount;
      close.VarianceAmount = Money(close.CountedAmount - drawer.ExpectedAmount);
      close.ExpectedBaseAmount = Money(drawer.ExpectedAmount * close.ExchangeRate);
      close.CountedBaseAmount = Money(close.CountedAmount * close.ExchangeRate);
      close.VarianceBaseAmount = Money((close.CountedAmount - drawer.ExpectedAmount) * close.ExchangeRate);
    }

    session.UpdatedAtUtc = generatedAtUtc;
    return CreateZReport(session, x, identity, generatedAtUtc);
  }

  private async Task<PosSessionEntity> GetReportSessionAsync(Guid userId, Guid id, bool trackChanges, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var query = trackChanges ? SessionReportQuery() : SessionReportQuery().AsNoTracking();
    var session = await query.SingleOrDefaultAsync(item => item.Id == id && item.BranchId == branchId, ct)
      ?? throw SessionNotFound();
    await EnsureSessionAccessAsync(userId, session.CashierUserId, ct);
    if (session.Status != PosSessionStatus.Open)
      throw new ConflictException(ErrorCodes.Pos.SessionClosed, "This POS Session is closed.");
    return session;
  }

  private PosXReportResponse BuildXReport(PosSessionEntity session, Guid baseCurrencyId, string baseCurrencyCode)
  {
    var sales = session.PosContexts
      .Where(context => !context.SalesInvoice.IsDeleted)
      .ToList();
    var refunds = session.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted).ToList();
    var serviceSales = Money(sales.SelectMany(sale => sale.SalesInvoice.Lines)
      .Where(line => line.LineType == SalesLineType.Service).Sum(line => line.BaseLineAmount));
    var productSales = Money(sales.SelectMany(sale => sale.SalesInvoice.Lines)
      .Where(line => line.LineType == SalesLineType.Product).Sum(line => line.BaseLineAmount));
    var gross = Money(sales.Sum(sale => sale.SalesInvoice.BaseTotal));
    var serviceRefunds = Money(refunds.SelectMany(refund => refund.Lines)
      .Where(line => line.LineType == SalesLineType.Service).Sum(line => line.RefundAmountBase));
    var productRefunds = Money(refunds.SelectMany(refund => refund.Lines)
      .Where(line => line.LineType == SalesLineType.Product).Sum(line => line.RefundAmountBase));
    var refundTotal = Money(refunds.Sum(refund => refund.TotalRefundBase));

    var paymentKeys = sales.SelectMany(sale => sale.Tenders).Select(tender => tender.MoneyAccountId)
      .Concat(sales.Where(sale => sale.Change is not null).Select(sale => sale.Change!.MoneyAccountId))
      .Concat(refunds.SelectMany(refund => refund.Tenders).Select(tender => tender.MoneyAccountId))
      .Distinct().ToList();
    var payments = new List<PosPaymentSummaryResponse>();
    foreach (var accountId in paymentKeys)
    {
      var tenderRows = sales.SelectMany(sale => sale.Tenders).Where(tender => tender.MoneyAccountId == accountId).ToList();
      var changeRows = sales.Where(sale => sale.Change?.MoneyAccountId == accountId).Select(sale => sale.Change!).ToList();
      var refundRows = refunds.SelectMany(refund => refund.Tenders).Where(tender => tender.MoneyAccountId == accountId).ToList();
      var account = tenderRows.Select(tender => tender.MoneyAccount).FirstOrDefault()
        ?? changeRows.Select(change => change.MoneyAccount).FirstOrDefault()
        ?? refundRows.Select(tender => tender.MoneyAccount).First();
      var tendered = Money(tenderRows.Sum(tender => tender.TenderedAmount));
      var changed = Money(changeRows.Sum(change => change.Amount));
      var refunded = Money(refundRows.Sum(tender => tender.Amount));
      var tenderedBase = Money(tenderRows.Sum(tender => tender.BaseAmount));
      var changedBase = Money(changeRows.Sum(change => change.BaseAmount));
      var refundedBase = Money(refundRows.Sum(tender => tender.BaseAmount));
      payments.Add(new PosPaymentSummaryResponse(
        account.Id, account.Code, account.Name, account.Type, account.CurrencyId, account.Currency.Code,
        tendered, changed, refunded, Money(tendered - changed - refunded),
        tenderedBase, changedBase, refundedBase, Money(tenderedBase - changedBase - refundedBase)));
    }
    payments = payments.OrderBy(payment => payment.CurrencyCode).ThenBy(payment => payment.MoneyAccountCode).ToList();

    var drawers = new List<PosDrawerSummaryResponse>();
    foreach (var opening in session.OpeningCounts.OrderBy(count => count.Currency.Code))
    {
      var cashPayment = payments.SingleOrDefault(payment => payment.MoneyAccountId == opening.MoneyAccountId);
      var openingAmount = opening.Amount;
      var tenderedAmount = cashPayment?.TenderedAmount ?? 0m;
      var changeAmount = cashPayment?.ChangeAmount ?? 0m;
      var refundAmount = cashPayment?.RefundAmount ?? 0m;
      var openingBase = opening.BaseAmount;
      var tenderedBase = cashPayment?.TenderedBaseAmount ?? 0m;
      var changeBase = cashPayment?.ChangeBaseAmount ?? 0m;
      var refundBase = cashPayment?.RefundBaseAmount ?? 0m;
      var movements = session.DrawerMovements
        .Where(movement => movement.CashboxMoneyAccountId == opening.MoneyAccountId).ToList();
      var cashIn = Money(movements.Where(movement => movement.Type == PosDrawerMovementType.CashIn).Sum(movement => movement.Amount));
      var cashOut = Money(movements.Where(movement => movement.Type == PosDrawerMovementType.CashOut).Sum(movement => movement.Amount));
      var cashDrop = Money(movements.Where(movement => movement.Type == PosDrawerMovementType.CashDrop).Sum(movement => movement.Amount));
      var adjustment = Money(movements.Where(movement => movement.Type == PosDrawerMovementType.Adjustment)
        .Sum(movement => movement.AdjustmentDirection == PosDrawerAdjustmentDirection.In ? movement.Amount : -movement.Amount));
      var cashInBase = Money(movements.Where(movement => movement.Type == PosDrawerMovementType.CashIn).Sum(movement => movement.BaseAmount));
      var cashOutBase = Money(movements.Where(movement => movement.Type == PosDrawerMovementType.CashOut).Sum(movement => movement.BaseAmount));
      var cashDropBase = Money(movements.Where(movement => movement.Type == PosDrawerMovementType.CashDrop).Sum(movement => movement.BaseAmount));
      var adjustmentBase = Money(movements.Where(movement => movement.Type == PosDrawerMovementType.Adjustment)
        .Sum(movement => movement.AdjustmentDirection == PosDrawerAdjustmentDirection.In ? movement.BaseAmount : -movement.BaseAmount));
      drawers.Add(new PosDrawerSummaryResponse(
        opening.MoneyAccountId, opening.MoneyAccount.Code, opening.MoneyAccount.Name,
        opening.CurrencyId, opening.Currency.Code, opening.Currency.DecimalPlaces,
        openingAmount, tenderedAmount, changeAmount,
        refundAmount, Money(openingAmount + tenderedAmount - changeAmount - refundAmount + cashIn - cashOut - cashDrop + adjustment), null, null,
        openingBase, tenderedBase, changeBase, refundBase,
        Money(openingBase + tenderedBase - changeBase - refundBase + cashInBase - cashOutBase - cashDropBase + adjustmentBase), null, null,
        cashIn, cashOut, cashDrop, adjustment, cashInBase, cashOutBase, cashDropBase, adjustmentBase, null));
    }

    return new PosXReportResponse(
      ToSessionResponse(session), DateTimeOffset.UtcNow, sales.Count, serviceSales, productSales, gross,
      refunds.Count, serviceRefunds, productRefunds, refundTotal, Money(gross - refundTotal),
      baseCurrencyId, baseCurrencyCode, payments, drawers);
  }

  private static PosZReportEntity CreateZReport(
    PosSessionEntity session,
    PosXReportResponse x,
    PosZReportIdentity identity,
    DateTimeOffset generatedAtUtc)
  {
    var z = new PosZReportEntity
    {
      Id = identity.Id,
      ReportNumber = identity.ReportNumber,
      PosSession = session,
      PosSessionId = session.Id,
      BranchId = identity.BranchId,
      BranchCode = identity.BranchCode,
      BranchName = identity.BranchName,
      RegisterId = identity.RegisterId,
      RegisterCode = identity.RegisterCode,
      RegisterName = identity.RegisterName,
      CashierUserId = identity.CashierUserId,
      CashierUsername = identity.CashierUsername,
      ClosedByUserId = identity.ClosedByUserId,
      ClosedByUsername = identity.ClosedByUsername,
      BaseCurrencyId = identity.BaseCurrencyId,
      BaseCurrencyCode = identity.BaseCurrencyCode,
      OpenedAtUtc = identity.OpenedAtUtc,
      ClosedAtUtc = identity.ClosedAtUtc,
      GeneratedAtUtc = generatedAtUtc,
      SaleCount = x.SaleCount,
      ServiceSalesBase = x.ServiceSalesBase,
      ProductSalesBase = x.ProductSalesBase,
      GrossSalesBase = x.GrossSalesBase,
      RefundCount = x.RefundCount,
      ServiceRefundsBase = x.ServiceRefundsBase,
      ProductRefundsBase = x.ProductRefundsBase,
      RefundTotalBase = x.RefundTotalBase,
      NetSalesBase = x.NetSalesBase
    };

    foreach (var payment in x.Payments)
      z.PaymentSummaries.Add(new PosZPaymentSummaryEntity
      {
        MoneyAccountId = payment.MoneyAccountId,
        MoneyAccountCode = payment.MoneyAccountCode,
        MoneyAccountName = payment.MoneyAccountName,
        MoneyAccountType = payment.MoneyAccountType,
        CurrencyId = payment.CurrencyId,
        CurrencyCode = payment.CurrencyCode,
        TenderedAmount = payment.TenderedAmount,
        ChangeAmount = payment.ChangeAmount,
        RefundAmount = payment.RefundAmount,
        NetAmount = payment.NetAmount,
        TenderedBaseAmount = payment.TenderedBaseAmount,
        ChangeBaseAmount = payment.ChangeBaseAmount,
        RefundBaseAmount = payment.RefundBaseAmount,
        NetBaseAmount = payment.NetBaseAmount
      });

    foreach (var drawer in x.Drawers)
    {
      var close = session.ClosingCounts.Single(count => count.MoneyAccountId == drawer.MoneyAccountId);
      z.DrawerSummaries.Add(new PosZDrawerSummaryEntity
      {
        MoneyAccountId = drawer.MoneyAccountId,
        MoneyAccountCode = drawer.MoneyAccountCode,
        MoneyAccountName = drawer.MoneyAccountName,
        CurrencyId = drawer.CurrencyId,
        CurrencyCode = drawer.CurrencyCode,
        CurrencyDecimalPlaces = drawer.CurrencyDecimalPlaces,
        OpeningAmount = drawer.OpeningAmount,
        TenderedAmount = drawer.TenderedAmount,
        ChangeAmount = drawer.ChangeAmount,
        RefundAmount = drawer.RefundAmount,
        ExpectedAmount = drawer.ExpectedAmount,
        CountedAmount = close.CountedAmount,
        VarianceAmount = close.VarianceAmount,
        ExchangeRate = close.ExchangeRate,
        OpeningBaseAmount = drawer.OpeningBaseAmount,
        TenderedBaseAmount = drawer.TenderedBaseAmount,
        ChangeBaseAmount = drawer.ChangeBaseAmount,
        RefundBaseAmount = drawer.RefundBaseAmount,
        ExpectedBaseAmount = close.ExpectedBaseAmount,
        CountedBaseAmount = close.CountedBaseAmount,
        VarianceBaseAmount = close.VarianceBaseAmount,
        CashInAmount = drawer.CashInAmount,
        CashOutAmount = drawer.CashOutAmount,
        CashDropAmount = drawer.CashDropAmount,
        AdjustmentAmount = drawer.AdjustmentAmount,
        CashInBaseAmount = drawer.CashInBaseAmount,
        CashOutBaseAmount = drawer.CashOutBaseAmount,
        CashDropBaseAmount = drawer.CashDropBaseAmount,
        AdjustmentBaseAmount = drawer.AdjustmentBaseAmount
      });
    }

    session.ZReport = z;
    return z;
  }

  private IQueryable<PosSessionEntity> SessionQuery() => _db.PosSessions
    .Include(session => session.Branch)
    .Include(session => session.Register)
    .Include(session => session.CashierUser)
    .Include(session => session.ClosedByUser)
    .Include(session => session.OpeningCounts).ThenInclude(count => count.Currency)
    .Include(session => session.OpeningCounts).ThenInclude(count => count.MoneyAccount);

  private IQueryable<PosSessionEntity> SessionReportQuery() => SessionQuery()
    .Include(session => session.PosContexts).ThenInclude(context => context.SalesInvoice).ThenInclude(invoice => invoice.Lines)
    .Include(session => session.PosContexts).ThenInclude(context => context.Tenders).ThenInclude(tender => tender.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(session => session.PosContexts).ThenInclude(context => context.Change).ThenInclude(change => change!.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(session => session.Refunds).ThenInclude(refund => refund.Lines)
    .Include(session => session.Refunds).ThenInclude(refund => refund.Tenders).ThenInclude(tender => tender.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(session => session.DrawerMovements)
    .Include(session => session.ClosingCounts).ThenInclude(count => count.Currency)
    .Include(session => session.ClosingCounts).ThenInclude(count => count.MoneyAccount);

  private static PosSessionResponse ToSessionResponse(PosSessionEntity session) => new(
    session.Id, session.SessionNumber, session.BranchId, session.Branch.Code, session.Branch.Name,
    session.RegisterId, session.Register.Code, session.Register.Name,
    session.CashierUserId, session.CashierUser.Username, session.Status,
    session.OpenedAtUtc, session.ClosedAtUtc, session.ClosedByUserId, session.ClosedByUser?.Username,
    session.OpeningNotes, session.ClosingNotes,
    session.OpeningCounts.OrderBy(count => count.Currency.Code)
      .Select(count => new PosSessionCountResponse(
        count.MoneyAccountId, count.MoneyAccount.Code, count.MoneyAccount.Name,
        count.CurrencyId, count.Currency.Code, count.Currency.DecimalPlaces,
        count.Amount, count.ExchangeRate, count.BaseAmount)).ToList());

  private static PosZReportResponse ToZReportResponse(PosZReportEntity report) => new(
    report.Id, report.ReportNumber, report.PosSessionId, report.PosSession.SessionNumber,
    report.BranchId, report.BranchCode, report.BranchName,
    report.RegisterId, report.RegisterCode, report.RegisterName,
    report.CashierUserId, report.CashierUsername, report.ClosedByUserId, report.ClosedByUsername,
    report.OpenedAtUtc, report.ClosedAtUtc, report.GeneratedAtUtc,
    report.SaleCount, report.ServiceSalesBase, report.ProductSalesBase, report.GrossSalesBase,
    report.RefundCount, report.ServiceRefundsBase, report.ProductRefundsBase,
    report.RefundTotalBase, report.NetSalesBase,
    report.BaseCurrencyId, report.BaseCurrencyCode,
    report.PaymentSummaries.OrderBy(summary => summary.CurrencyCode).ThenBy(summary => summary.MoneyAccountCode)
      .Select(summary => new PosPaymentSummaryResponse(
        summary.MoneyAccountId, summary.MoneyAccountCode, summary.MoneyAccountName, summary.MoneyAccountType,
        summary.CurrencyId, summary.CurrencyCode, summary.TenderedAmount, summary.ChangeAmount,
        summary.RefundAmount, summary.NetAmount,
        summary.TenderedBaseAmount, summary.ChangeBaseAmount, summary.RefundBaseAmount,
        summary.NetBaseAmount)).ToList(),
    report.DrawerSummaries.OrderBy(summary => summary.CurrencyCode)
      .Select(summary => new PosDrawerSummaryResponse(
        summary.MoneyAccountId, summary.MoneyAccountCode, summary.MoneyAccountName,
        summary.CurrencyId, summary.CurrencyCode, summary.CurrencyDecimalPlaces,
        summary.OpeningAmount, summary.TenderedAmount,
        summary.ChangeAmount, summary.RefundAmount, summary.ExpectedAmount, summary.CountedAmount, summary.VarianceAmount,
        summary.OpeningBaseAmount, summary.TenderedBaseAmount, summary.ChangeBaseAmount, summary.RefundBaseAmount,
        summary.ExpectedBaseAmount, summary.CountedBaseAmount, summary.VarianceBaseAmount,
        summary.CashInAmount, summary.CashOutAmount, summary.CashDropAmount, summary.AdjustmentAmount,
        summary.CashInBaseAmount, summary.CashOutBaseAmount, summary.CashDropBaseAmount, summary.AdjustmentBaseAmount,
        summary.ExchangeRate)).ToList());

  private static void ValidateOpeningCounts(List<PosOpeningCountRequest> counts, IEnumerable<Guid> requiredMoneyAccounts)
  {
    var required = requiredMoneyAccounts.Order().ToList();
    var supplied = counts.Select(count => count.MoneyAccountId).Order().ToList();
    if (counts.Select(count => count.MoneyAccountId).Distinct().Count() != counts.Count || !required.SequenceEqual(supplied))
      throw new BadRequestException(ErrorCodes.Pos.OpeningCountInvalid,
        "Enter one physical opening count for every Cashbox configured on this Register.");
  }

  private static void ValidateClosingCounts(List<PosClosingCountRequest> counts, IEnumerable<Guid> requiredMoneyAccounts)
  {
    var required = requiredMoneyAccounts.Order().ToList();
    var supplied = counts.Select(count => count.MoneyAccountId).Order().ToList();
    if (counts.Select(count => count.MoneyAccountId).Distinct().Count() != counts.Count || !required.SequenceEqual(supplied))
      throw new BadRequestException(ErrorCodes.Pos.ClosingCountInvalid,
        "Enter one physical closing count for every Cashbox in this POS Session.");
  }

  private async Task<List<MoneyAccountEntity>> ValidateRegisterCashboxesAsync(
    List<Guid> moneyAccountIds,
    Guid? currentRegisterId,
    CancellationToken ct)
  {
    var branchId = RequireBranch();
    ValidateCashboxIdShape(moneyAccountIds);

    var cashboxes = await _db.MoneyAccounts.Include(account => account.Currency)
      .Where(account => moneyAccountIds.Contains(account.Id))
      .ToListAsync(ct);
    if (cashboxes.Count != moneyAccountIds.Count
      || cashboxes.Any(account => account.BranchId != branchId || !account.IsActive
        || account.Type != MoneyAccountType.Cashbox || !account.Currency.IsActive))
      throw new BadRequestException(ErrorCodes.Pos.RegisterCashboxInvalid,
        "Every configured account must be an active Cashbox with an active currency in this branch.");
    if (cashboxes.Select(account => account.CurrencyId).Distinct().Count() != cashboxes.Count)
      throw new BadRequestException(ErrorCodes.Pos.RegisterCashboxDuplicateCurrency,
        "A Register can have only one Cashbox for each currency.");

    var assigned = await _db.PosRegisterCashboxes.IgnoreQueryFilters().AsNoTracking()
      .Where(mapping => moneyAccountIds.Contains(mapping.MoneyAccountId)
        && (currentRegisterId == null || mapping.PosRegisterId != currentRegisterId))
      .Select(mapping => new { CashboxCode = mapping.MoneyAccount.Code, RegisterCode = mapping.PosRegister.Code })
      .FirstOrDefaultAsync(ct);
    if (assigned is not null)
      throw new ConflictException(ErrorCodes.Pos.CashboxAlreadyAssigned,
        $"Cashbox '{assigned.CashboxCode}' is already assigned to Register '{assigned.RegisterCode}'.");
    return cashboxes;
  }

  private static void ValidateCashboxIdShape(List<Guid> moneyAccountIds)
  {
    if (moneyAccountIds.Count == 0 || moneyAccountIds.Any(id => id == Guid.Empty)
      || moneyAccountIds.Distinct().Count() != moneyAccountIds.Count)
      throw new BadRequestException(ErrorCodes.Pos.RegisterCashboxInvalid,
        "Select each Cashbox once and configure at least one Cashbox for the Register.");
  }

  private async Task EnsureSessionAccessAsync(Guid userId, Guid cashierUserId, CancellationToken ct)
  {
    if (userId == cashierUserId) return;
    if (!await CanManageOthersAsync(userId, ct))
      throw new ForbiddenException(ErrorCodes.Pos.SessionAccessDenied,
        "You are not allowed to access another cashier's POS Session.");
  }

  private async Task<bool> CanManageOthersAsync(Guid userId, CancellationToken ct)
  {
    var role = await _db.Users.AsNoTracking().Where(user => user.Id == userId).Select(user => user.Role).SingleAsync(ct);
    return role is UserRole.SuperAdmin or UserRole.Owner or UserRole.Manager;
  }

  private async Task<Api.Modules.Business.BusinessEntity> GetBusinessAsync(CancellationToken ct) =>
    await _db.Businesses.AsNoTracking().Include(business => business.BaseCurrency)
      .SingleOrDefaultAsync(business => business.IsActive && business.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.BusinessNotConfigured,
        "Complete Business Setup before using POS Sessions.");

  private Guid RequireBranch() => _db.SelectedBranchId
    ?? throw new BadRequestException(ErrorCodes.Branch.SelectionRequired, "Select a branch before using POS.");

  private async Task<string> NextSessionNumberAsync(CancellationToken ct)
  {
    var last = await _db.PosSessions.IgnoreQueryFilters().Select(session => session.SessionNumber)
      .Where(number => number.StartsWith("PSS-"))
      .OrderByDescending(number => number).FirstOrDefaultAsync(ct);
    var next = last is not null && int.TryParse(last[4..], out var value) ? value + 1 : 1;
    return $"PSS-{next:000000}";
  }

  private async Task<string> NextZReportNumberAsync(CancellationToken ct)
  {
    var last = await _db.PosZReports.IgnoreQueryFilters().Select(report => report.ReportNumber)
      .Where(number => number.StartsWith("Z-"))
      .OrderByDescending(number => number).FirstOrDefaultAsync(ct);
    var next = last is not null && int.TryParse(last[2..], out var value) ? value + 1 : 1;
    return $"Z-{next:000000}";
  }

  private async Task SaveRegisterAsync(CancellationToken ct)
  {
    try { await _db.SaveChangesAsync(ct); }
    catch (Exception exception) when (PosConcurrency.IsUniqueConstraint(
      exception, PosRegisterCashboxEntityConfiguration.MoneyAccountUniqueIndexName))
    {
      throw new ConflictException(ErrorCodes.Pos.CashboxAlreadyAssigned,
        "A selected Cashbox was assigned to another Register first. Refresh and choose another Cashbox.");
    }
    catch (Exception exception) when (PosConcurrency.IsUniqueConstraint(
      exception, "UX_pos_register_cashboxes_register_currency"))
    {
      throw new ConflictException(ErrorCodes.Pos.RegisterCashboxDuplicateCurrency,
        "A Register can have only one Cashbox for each currency.");
    }
    catch (Exception exception) when (PosConcurrency.IsUniqueConstraint(exception, "IX_pos_registers_Code"))
    {
      throw new ConflictException(ErrorCodes.Pos.RegisterCodeTaken,
        "Another POS Register used this code first. Choose a different code.");
    }
  }

  private static string NormalizeCode(string value) => value.Trim().ToUpperInvariant();
  private bool UsesPostgres() => _db.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL";
  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
  private static decimal Money(decimal value) => Math.Round(value, 4, MidpointRounding.AwayFromZero);
  private static NotFoundException RegisterNotFound() =>
    new(ErrorCodes.Pos.RegisterNotFound, "POS Register was not found.");
  private static NotFoundException SessionNotFound() =>
    new(ErrorCodes.Pos.SessionNotFound, "POS Session was not found.");
}

internal sealed record PosZReportIdentity(
  Guid Id,
  string ReportNumber,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  Guid RegisterId,
  string RegisterCode,
  string RegisterName,
  Guid CashierUserId,
  string CashierUsername,
  Guid ClosedByUserId,
  string ClosedByUsername,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  DateTimeOffset OpenedAtUtc,
  DateTimeOffset ClosedAtUtc);
