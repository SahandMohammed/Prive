using System.Data;
using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

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
      .Select(register => new PosRegisterResponse(register.Id, register.Code, register.Name, register.BranchId, register.IsActive))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PosRegisterResponse> GetRegisterAsync(Guid id, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var register = await _db.PosRegisters.AsNoTracking()
      .SingleOrDefaultAsync(item => item.Id == id && item.BranchId == branchId, ct)
      ?? throw RegisterNotFound();
    return new PosRegisterResponse(register.Id, register.Code, register.Name, register.BranchId, register.IsActive);
  }

  public async Task<PosRegisterResponse> CreateRegisterAsync(CreatePosRegisterRequest request, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var code = NormalizeCode(request.Code);
    if (await _db.PosRegisters.IgnoreQueryFilters().AnyAsync(register => register.Code == code, ct))
      throw new ConflictException(ErrorCodes.Pos.RegisterCodeTaken, $"POS Register code '{code}' is already in use.");

    var register = new PosRegisterEntity
    {
      Code = code,
      Name = request.Name.Trim(),
      BranchId = branchId,
      IsActive = true
    };
    _db.PosRegisters.Add(register);
    await SaveConflictAsync(ErrorCodes.Pos.RegisterCodeTaken,
      "Another POS Register used this code first. Choose a different code.", ct);
    return new PosRegisterResponse(register.Id, register.Code, register.Name, register.BranchId, register.IsActive);
  }

  public async Task<PosRegisterResponse> UpdateRegisterAsync(Guid id, UpdatePosRegisterRequest request, CancellationToken ct)
  {
    var branchId = RequireBranch();
    var register = await _db.PosRegisters.SingleOrDefaultAsync(item => item.Id == id && item.BranchId == branchId, ct)
      ?? throw RegisterNotFound();
    var code = NormalizeCode(request.Code);
    if (code != register.Code && await _db.PosRegisters.IgnoreQueryFilters().AnyAsync(item => item.Code == code && item.Id != id, ct))
      throw new ConflictException(ErrorCodes.Pos.RegisterCodeTaken, $"POS Register code '{code}' is already in use.");
    if (!request.IsActive && await _db.PosSessions.AnyAsync(session => session.RegisterId == id && session.Status == PosSessionStatus.Open, ct))
      throw new ConflictException(ErrorCodes.Pos.SessionAlreadyOpen,
        "Close the active POS Session before deactivating this Register.");

    register.Code = code;
    register.Name = request.Name.Trim();
    register.IsActive = request.IsActive;
    await SaveConflictAsync(ErrorCodes.Pos.RegisterCodeTaken,
      "Another POS Register used this code first. Choose a different code.", ct);
    return new PosRegisterResponse(register.Id, register.Code, register.Name, register.BranchId, register.IsActive);
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
    var register = await _db.PosRegisters.SingleOrDefaultAsync(item => item.Id == request.RegisterId && item.BranchId == branchId, ct)
      ?? throw RegisterNotFound();
    if (!register.IsActive)
      throw new BadRequestException(ErrorCodes.Pos.RegisterInactive, "Select an active POS Register.");
    if (await _db.PosSessions.AnyAsync(item => item.RegisterId == register.Id && item.Status == PosSessionStatus.Open, ct))
      throw new ConflictException(ErrorCodes.Pos.SessionAlreadyOpen, "This POS Register already has an open session.");
    if (await _db.PosSessions.AnyAsync(item => item.BranchId == branchId && item.CashierUserId == userId && item.Status == PosSessionStatus.Open, ct))
      throw new ConflictException(ErrorCodes.Pos.SessionAlreadyOpen, "You already have an open POS Session in this branch.");

    var openedAt = DateTimeOffset.UtcNow;
    var business = await GetBusinessAsync(ct);
    var operableCurrencies = await GetOperableCashboxCurrenciesAsync(userId, ct);
    var ratesByCurrency = new Dictionary<Guid, decimal>();
    foreach (var currencyId in operableCurrencies)
    {
      var rate = await ExchangeRateResolver.FindAsync(
        _db, currencyId, business.BaseCurrencyId, openedAt.UtcDateTime, ct);
      if (rate is not null) ratesByCurrency[currencyId] = rate.Value;
    }
    ValidateOpeningCounts(request.OpeningCounts, ratesByCurrency.Keys);

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
      var rate = ratesByCurrency[requestCount.CurrencyId];
      session.OpeningCounts.Add(new PosSessionOpeningCountEntity
      {
        CurrencyId = requestCount.CurrencyId,
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
    var query = _db.PosSessions.AsNoTracking().Where(session => session.BranchId == branchId);
    if (!management) query = query.Where(session => session.CashierUserId == userId);
    if (request.Status is not null) query = query.Where(session => session.Status == request.Status);
    if (request.RegisterId is not null) query = query.Where(session => session.RegisterId == request.RegisterId);
    if (request.CashierUserId is not null && management) query = query.Where(session => session.CashierUserId == request.CashierUserId);
    if (request.FromDate is not null)
    {
      var from = request.FromDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
      query = query.Where(session => session.OpenedAtUtc >= from);
    }
    if (request.ToDate is not null)
    {
      var to = request.ToDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
      query = query.Where(session => session.OpenedAtUtc < to);
    }

    var business = await GetBusinessAsync(ct);
    return await query.OrderByDescending(session => session.OpenedAtUtc)
      .ThenByDescending(session => session.SessionNumber)
      .Select(session => new PosSessionListResponse(
        session.Id, session.SessionNumber, session.RegisterId, session.Register.Code, session.Register.Name,
        session.CashierUserId, session.CashierUser.Username, session.Status, session.OpenedAtUtc, session.ClosedAtUtc,
        session.Sales.Count,
        session.Sales.Sum(sale => (decimal?)sale.SalesInvoice.BaseTotal) ?? 0m,
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

    if (_db.Database.IsRelational())
      await _db.Database.ExecuteSqlInterpolatedAsync(
        $"SELECT \"Id\" FROM pos_sessions WHERE \"Id\" = {sessionId} AND \"BranchId\" = {branchId} FOR UPDATE", ct);

    var session = await GetReportSessionAsync(userId, sessionId, trackChanges: true, ct);
    if (session.BranchId != branchId)
      throw SessionNotFound();
    if (await _db.PosZReports.IgnoreQueryFilters().AnyAsync(report => report.PosSessionId == session.Id, ct))
      throw new ConflictException(ErrorCodes.Pos.SessionCloseConflict, "This POS Session already has a Z Report.");

    var business = await GetBusinessAsync(ct);
    var x = BuildXReport(session, business.BaseCurrencyId, business.BaseCurrency.Code);
    ValidateClosingCounts(request.ClosingCounts, x.Drawers.Select(drawer => drawer.CurrencyId));
    var closedAt = DateTimeOffset.UtcNow;
    var closingByCurrency = request.ClosingCounts.ToDictionary(count => count.CurrencyId);

    foreach (var drawer in x.Drawers)
    {
      var requestCount = closingByCurrency[drawer.CurrencyId];
      var rate = await _finance.ResolveCurrentRateAsync(drawer.CurrencyId, business.BaseCurrencyId, closedAt.UtcDateTime, ct);
      var counted = Money(requestCount.CountedAmount);
      var countedBase = Money(counted * rate);
      _db.PosSessionClosingCounts.Add(new PosSessionClosingCountEntity
      {
        PosSession = session,
        CurrencyId = drawer.CurrencyId,
        ExpectedAmount = drawer.ExpectedAmount,
        CountedAmount = counted,
        VarianceAmount = Money(counted - drawer.ExpectedAmount),
        ExchangeRate = rate,
        ExpectedBaseAmount = drawer.ExpectedBaseAmount,
        CountedBaseAmount = countedBase,
        VarianceBaseAmount = Money(countedBase - drawer.ExpectedBaseAmount)
      });
    }

    var closer = await _db.Users.AsNoTracking().SingleAsync(user => user.Id == userId, ct);
    session.Status = PosSessionStatus.Closed;
    session.ClosedAtUtc = closedAt;
    session.ClosedByUserId = userId;
    session.ClosingNotes = Trim(request.Notes);
    session.UpdatedAtUtc = closedAt;

    var z = new PosZReportEntity
    {
      ReportNumber = await NextZReportNumberAsync(ct),
      PosSessionId = session.Id,
      BranchId = session.BranchId,
      BranchCode = session.Branch.Code,
      BranchName = session.Branch.Name,
      RegisterId = session.RegisterId,
      RegisterCode = session.Register.Code,
      RegisterName = session.Register.Name,
      CashierUserId = session.CashierUserId,
      CashierUsername = session.CashierUser.Username,
      ClosedByUserId = userId,
      ClosedByUsername = closer.Username,
      BaseCurrencyId = business.BaseCurrencyId,
      BaseCurrencyCode = business.BaseCurrency.Code,
      OpenedAtUtc = session.OpenedAtUtc,
      ClosedAtUtc = closedAt,
      GeneratedAtUtc = closedAt,
      SaleCount = x.SaleCount,
      ServiceSalesBase = x.ServiceSalesBase,
      ProductSalesBase = x.ProductSalesBase,
      GrossSalesBase = x.GrossSalesBase
    };

    foreach (var payment in x.Payments)
    {
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
        NetAmount = payment.NetAmount,
        TenderedBaseAmount = payment.TenderedBaseAmount,
        ChangeBaseAmount = payment.ChangeBaseAmount,
        NetBaseAmount = payment.NetBaseAmount
      });
    }

    foreach (var drawer in x.Drawers)
    {
      var close = session.ClosingCounts.Single(count => count.CurrencyId == drawer.CurrencyId);
      z.DrawerSummaries.Add(new PosZDrawerSummaryEntity
      {
        CurrencyId = drawer.CurrencyId,
        CurrencyCode = drawer.CurrencyCode,
        OpeningAmount = drawer.OpeningAmount,
        TenderedAmount = drawer.TenderedAmount,
        ChangeAmount = drawer.ChangeAmount,
        ExpectedAmount = drawer.ExpectedAmount,
        CountedAmount = close.CountedAmount,
        VarianceAmount = close.VarianceAmount,
        ExchangeRate = close.ExchangeRate,
        OpeningBaseAmount = drawer.OpeningBaseAmount,
        TenderedBaseAmount = drawer.TenderedBaseAmount,
        ChangeBaseAmount = drawer.ChangeBaseAmount,
        ExpectedBaseAmount = drawer.ExpectedBaseAmount,
        CountedBaseAmount = close.CountedBaseAmount,
        VarianceBaseAmount = close.VarianceBaseAmount
      });
    }

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
    var query = _db.PosZReports.AsNoTracking().Where(report => report.BranchId == branchId);
    if (!management) query = query.Where(report => report.CashierUserId == userId);
    if (request.RegisterId is not null) query = query.Where(report => report.RegisterId == request.RegisterId);
    if (request.CashierUserId is not null && management) query = query.Where(report => report.CashierUserId == request.CashierUserId);
    if (request.FromDate is not null)
    {
      var from = request.FromDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
      query = query.Where(report => report.ClosedAtUtc >= from);
    }
    if (request.ToDate is not null)
    {
      var to = request.ToDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
      query = query.Where(report => report.ClosedAtUtc < to);
    }

    return await query.OrderByDescending(report => report.ClosedAtUtc)
      .ThenByDescending(report => report.ReportNumber)
      .Select(report => new PosZReportListResponse(
        report.Id, report.ReportNumber, report.PosSessionId, report.PosSession.SessionNumber,
        report.RegisterId, report.RegisterCode, report.RegisterName,
        report.CashierUserId, report.CashierUsername, report.OpenedAtUtc, report.ClosedAtUtc,
        report.SaleCount, report.GrossSalesBase,
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

  internal async Task<PosSessionEntity> RequireOpenSessionForCheckoutAsync(
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
    if (_db.Database.IsRelational())
      await _db.Database.ExecuteSqlInterpolatedAsync(
        $"SELECT \"Id\" FROM pos_sessions WHERE \"Id\" = {sessionId} AND \"BranchId\" = {branchId} FOR UPDATE", ct);
    var session = await _db.PosSessions.SingleOrDefaultAsync(item => item.Id == sessionId && item.BranchId == branchId, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.SessionRequired, "Open a POS Session before completing a checkout.");
    if (session.Status != PosSessionStatus.Open)
      throw new ConflictException(ErrorCodes.Pos.SessionClosed, "This POS Session is already closed. Open a new session.");
    if (session.CashierUserId != userId)
      throw new ForbiddenException(ErrorCodes.Pos.SessionAccessDenied,
        "A cashier can only complete sales in their own open POS Session.");
    return session;
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
    var sales = session.Sales.Where(sale => sale.Status == PosSaleStatus.Completed).ToList();
    var serviceSales = Money(sales.SelectMany(sale => sale.SalesInvoice.Lines)
      .Where(line => line.LineType == SalesLineType.Service).Sum(line => line.BaseLineAmount));
    var productSales = Money(sales.SelectMany(sale => sale.SalesInvoice.Lines)
      .Where(line => line.LineType == SalesLineType.Product).Sum(line => line.BaseLineAmount));
    var gross = Money(sales.Sum(sale => sale.SalesInvoice.BaseTotal));

    var paymentKeys = sales.SelectMany(sale => sale.Tenders).Select(tender => tender.MoneyAccountId)
      .Concat(sales.Where(sale => sale.Change is not null).Select(sale => sale.Change!.MoneyAccountId))
      .Distinct().ToList();
    var payments = new List<PosPaymentSummaryResponse>();
    foreach (var accountId in paymentKeys)
    {
      var tenderRows = sales.SelectMany(sale => sale.Tenders).Where(tender => tender.MoneyAccountId == accountId).ToList();
      var changeRows = sales.Where(sale => sale.Change?.MoneyAccountId == accountId).Select(sale => sale.Change!).ToList();
      var account = tenderRows.Select(tender => tender.MoneyAccount).FirstOrDefault()
        ?? changeRows.Select(change => change.MoneyAccount).First();
      var tendered = Money(tenderRows.Sum(tender => tender.TenderedAmount));
      var changed = Money(changeRows.Sum(change => change.Amount));
      var tenderedBase = Money(tenderRows.Sum(tender => tender.BaseAmount));
      var changedBase = Money(changeRows.Sum(change => change.BaseAmount));
      payments.Add(new PosPaymentSummaryResponse(
        account.Id, account.Code, account.Name, account.Type, account.CurrencyId, account.Currency.Code,
        tendered, changed, Money(tendered - changed), tenderedBase, changedBase, Money(tenderedBase - changedBase)));
    }
    payments = payments.OrderBy(payment => payment.CurrencyCode).ThenBy(payment => payment.MoneyAccountCode).ToList();

    var drawerCurrencies = session.OpeningCounts.Select(count => new { count.CurrencyId, count.Currency.Code })
      .Concat(payments.Where(payment => payment.MoneyAccountType == MoneyAccountType.Cashbox)
        .Select(payment => new { payment.CurrencyId, Code = payment.CurrencyCode }))
      .GroupBy(item => item.CurrencyId).Select(group => group.First()).OrderBy(item => item.Code).ToList();
    var drawers = new List<PosDrawerSummaryResponse>();
    foreach (var currency in drawerCurrencies)
    {
      var opening = session.OpeningCounts.FirstOrDefault(count => count.CurrencyId == currency.CurrencyId);
      var cashPayments = payments.Where(payment => payment.MoneyAccountType == MoneyAccountType.Cashbox
        && payment.CurrencyId == currency.CurrencyId).ToList();
      var openingAmount = opening?.Amount ?? 0m;
      var tenderedAmount = Money(cashPayments.Sum(payment => payment.TenderedAmount));
      var changeAmount = Money(cashPayments.Sum(payment => payment.ChangeAmount));
      var openingBase = opening?.BaseAmount ?? 0m;
      var tenderedBase = Money(cashPayments.Sum(payment => payment.TenderedBaseAmount));
      var changeBase = Money(cashPayments.Sum(payment => payment.ChangeBaseAmount));
      drawers.Add(new PosDrawerSummaryResponse(
        currency.CurrencyId, currency.Code, openingAmount, tenderedAmount, changeAmount,
        Money(openingAmount + tenderedAmount - changeAmount), null, null,
        openingBase, tenderedBase, changeBase, Money(openingBase + tenderedBase - changeBase), null, null));
    }

    return new PosXReportResponse(
      ToSessionResponse(session), DateTimeOffset.UtcNow, sales.Count, serviceSales, productSales, gross,
      baseCurrencyId, baseCurrencyCode, payments, drawers);
  }

  private IQueryable<PosSessionEntity> SessionQuery() => _db.PosSessions
    .Include(session => session.Branch)
    .Include(session => session.Register)
    .Include(session => session.CashierUser)
    .Include(session => session.ClosedByUser)
    .Include(session => session.OpeningCounts).ThenInclude(count => count.Currency);

  private IQueryable<PosSessionEntity> SessionReportQuery() => SessionQuery()
    .Include(session => session.Sales).ThenInclude(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines)
    .Include(session => session.Sales).ThenInclude(sale => sale.Tenders).ThenInclude(tender => tender.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(session => session.Sales).ThenInclude(sale => sale.Change).ThenInclude(change => change!.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(session => session.ClosingCounts).ThenInclude(count => count.Currency);

  private static PosSessionResponse ToSessionResponse(PosSessionEntity session) => new(
    session.Id, session.SessionNumber, session.BranchId, session.Branch.Code, session.Branch.Name,
    session.RegisterId, session.Register.Code, session.Register.Name,
    session.CashierUserId, session.CashierUser.Username, session.Status,
    session.OpenedAtUtc, session.ClosedAtUtc, session.ClosedByUserId, session.ClosedByUser?.Username,
    session.OpeningNotes, session.ClosingNotes,
    session.OpeningCounts.OrderBy(count => count.Currency.Code)
      .Select(count => new PosSessionCountResponse(count.CurrencyId, count.Currency.Code, count.Amount, count.ExchangeRate, count.BaseAmount)).ToList());

  private static PosZReportResponse ToZReportResponse(PosZReportEntity report) => new(
    report.Id, report.ReportNumber, report.PosSessionId, report.PosSession.SessionNumber,
    report.BranchId, report.BranchCode, report.BranchName,
    report.RegisterId, report.RegisterCode, report.RegisterName,
    report.CashierUserId, report.CashierUsername, report.ClosedByUserId, report.ClosedByUsername,
    report.OpenedAtUtc, report.ClosedAtUtc, report.GeneratedAtUtc,
    report.SaleCount, report.ServiceSalesBase, report.ProductSalesBase, report.GrossSalesBase,
    report.BaseCurrencyId, report.BaseCurrencyCode,
    report.PaymentSummaries.OrderBy(summary => summary.CurrencyCode).ThenBy(summary => summary.MoneyAccountCode)
      .Select(summary => new PosPaymentSummaryResponse(
        summary.MoneyAccountId, summary.MoneyAccountCode, summary.MoneyAccountName, summary.MoneyAccountType,
        summary.CurrencyId, summary.CurrencyCode, summary.TenderedAmount, summary.ChangeAmount, summary.NetAmount,
        summary.TenderedBaseAmount, summary.ChangeBaseAmount, summary.NetBaseAmount)).ToList(),
    report.DrawerSummaries.OrderBy(summary => summary.CurrencyCode)
      .Select(summary => new PosDrawerSummaryResponse(
        summary.CurrencyId, summary.CurrencyCode, summary.OpeningAmount, summary.TenderedAmount,
        summary.ChangeAmount, summary.ExpectedAmount, summary.CountedAmount, summary.VarianceAmount,
        summary.OpeningBaseAmount, summary.TenderedBaseAmount, summary.ChangeBaseAmount,
        summary.ExpectedBaseAmount, summary.CountedBaseAmount, summary.VarianceBaseAmount)).ToList());

  private async Task<List<Guid>> GetOperableCashboxCurrenciesAsync(Guid userId, CancellationToken ct)
  {
    var branchId = RequireBranch();
    return await _db.MoneyAccounts.AsNoTracking()
      .Where(account => account.BranchId == branchId && account.IsActive && account.Type == MoneyAccountType.Cashbox
        && account.Currency.IsActive && account.AccessAssignments.Any(access => access.UserId == userId
          && access.AccessLevel == MoneyAccountAccessLevel.Operate))
      .Select(account => account.CurrencyId).Distinct().ToListAsync(ct);
  }

  private static void ValidateOpeningCounts(List<PosOpeningCountRequest> counts, IEnumerable<Guid> requiredCurrencies)
  {
    var required = requiredCurrencies.Order().ToList();
    var supplied = counts.Select(count => count.CurrencyId).Order().ToList();
    if (counts.Select(count => count.CurrencyId).Distinct().Count() != counts.Count || !required.SequenceEqual(supplied))
      throw new BadRequestException(ErrorCodes.Pos.OpeningCountInvalid,
        "Enter one opening count for every operable Cashbox currency in this branch.");
  }

  private static void ValidateClosingCounts(List<PosClosingCountRequest> counts, IEnumerable<Guid> requiredCurrencies)
  {
    var required = requiredCurrencies.Order().ToList();
    var supplied = counts.Select(count => count.CurrencyId).Order().ToList();
    if (counts.Select(count => count.CurrencyId).Distinct().Count() != counts.Count || !required.SequenceEqual(supplied))
      throw new BadRequestException(ErrorCodes.Pos.ClosingCountInvalid,
        "Enter one physical closing count for every drawer currency in this POS Session.");
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

  private async Task SaveConflictAsync(string code, string message, CancellationToken ct)
  {
    try { await _db.SaveChangesAsync(ct); }
    catch (Exception exception) when (PosConcurrency.IsConflict(exception))
    {
      throw new ConflictException(code, message);
    }
  }

  private static string NormalizeCode(string value) => value.Trim().ToUpperInvariant();
  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
  private static decimal Money(decimal value) => Math.Round(value, 4, MidpointRounding.AwayFromZero);
  private static NotFoundException RegisterNotFound() =>
    new(ErrorCodes.Pos.RegisterNotFound, "POS Register was not found.");
  private static NotFoundException SessionNotFound() =>
    new(ErrorCodes.Pos.SessionNotFound, "POS Session was not found.");
}
