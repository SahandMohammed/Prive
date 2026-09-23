using System.Data;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Finance;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Api.Shared.Time;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Pos;

public sealed class PosDrawerMovementService
{
  private readonly AppDbContext _db;
  private readonly FinanceService _finance;
  private readonly PosSessionService _sessions;

  public PosDrawerMovementService(AppDbContext db, FinanceService finance, PosSessionService sessions)
  {
    _db = db;
    _finance = finance;
    _sessions = sessions;
  }

  public async Task<PagedResult<PosDrawerMovementResponse>> GetAsync(
    Guid userId, Guid sessionId, PosDrawerMovementListQuery request, CancellationToken ct)
  {
    await _sessions.GetSessionAsync(userId, sessionId, ct);
    var query = MovementQuery().Where(movement => movement.PosSessionId == sessionId);
    if (request.CurrencyId is not null) query = query.Where(movement => movement.CurrencyId == request.CurrencyId);
    if (request.Type is not null) query = query.Where(movement => movement.Type == request.Type);
    return await query.OrderByDescending(movement => movement.CreatedAtUtc).ThenByDescending(movement => movement.DocumentNumber)
      .Select(movement => ToResponse(movement)).ToPagedResultAsync(request, ct);
  }

  public async Task<PosDrawerMovementResponse> CreateAsync(
    Guid userId, Guid sessionId, CreatePosDrawerMovementRequest request, CancellationToken ct)
  {
    try
    {
      return await CreateCoreAsync(userId, sessionId, request, ct);
    }
    catch (Exception exception) when (PosConcurrency.IsConflict(exception))
    {
      throw new ConflictException(ErrorCodes.Pos.DrawerMovementConflict,
        "Another drawer movement was posted at the same time. Refresh and try again.");
    }
  }

  private async Task<PosDrawerMovementResponse> CreateCoreAsync(
    Guid userId, Guid sessionId, CreatePosDrawerMovementRequest request, CancellationToken ct)
  {
    if (!Enum.IsDefined(request.Type) || request.Amount <= 0 || string.IsNullOrWhiteSpace(request.Reason))
      throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid,
        "Select a movement type, positive amount, and reason.");
    var branchId = _db.SelectedBranchId
      ?? throw new BadRequestException(ErrorCodes.Branch.SelectionRequired, "Select a branch before using POS.");
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    var session = await _sessions.RequireOpenSessionForManagementAsync(userId, sessionId, branchId, ct);
    await _finance.EnsureAccessAsync(request.CashboxMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);

    var cashbox = await _db.MoneyAccounts.Include(account => account.AccountingAccount).Include(account => account.Currency)
      .SingleOrDefaultAsync(account => account.Id == request.CashboxMoneyAccountId, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid, "Select an existing Cashbox Money Account.");
    FinanceService.EnsureActive(cashbox);
    if (cashbox.BranchId != branchId || cashbox.Type != MoneyAccountType.Cashbox
      || !session.OpeningCounts.Any(count => count.CurrencyId == cashbox.CurrencyId))
      throw new BadRequestException(ErrorCodes.Pos.SessionCurrencyNotAllowed,
        "The selected Cashbox currency is not part of this POS Session snapshot.");

    var business = await _db.Businesses.AsNoTracking().Include(item => item.BaseCurrency)
      .SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.BusinessNotConfigured, "Complete Business Setup before using POS.");
    var now = DateTime.UtcNow;
    var rate = await _finance.ResolveCurrentRateAsync(cashbox.CurrencyId, business.BaseCurrencyId, now, ct);
    var amount = Money(request.Amount);
    var baseAmount = Money(amount * rate);
    var documentNumber = await NextDocumentNumberAsync(ct);

    var destination = await ValidateDestinationAsync(request, cashbox, branchId, userId, ct);
    var offset = await ValidateOffsetAsync(request, ct);
    ValidateShape(request, destination, offset);

    var cashboxIncrease = request.Type == PosDrawerMovementType.CashIn
      || request.Type == PosDrawerMovementType.Adjustment && request.AdjustmentDirection == PosDrawerAdjustmentDirection.In;
    var cashboxAmount = request.Type == PosDrawerMovementType.CashDrop || !cashboxIncrease ? -amount : amount;
    var cashboxBase = request.Type == PosDrawerMovementType.CashDrop || !cashboxIncrease ? -baseAmount : baseAmount;
    var journalLines = BuildJournalLines(request, cashbox, destination, offset, business.BaseCurrencyId, rate, amount, baseAmount, documentNumber);
    var journal = new JournalEntryEntity
    {
      EntryDate = BusinessTime.DateAt(business, now),
      Reference = documentNumber,
      Description = $"POS drawer {request.Type} {documentNumber}",
      BranchId = branchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = now,
      Lines = journalLines
    };
    var movement = new PosDrawerMovementEntity
    {
      DocumentNumber = documentNumber,
      PosSessionId = session.Id,
      BranchId = branchId,
      CashboxMoneyAccountId = cashbox.Id,
      DestinationMoneyAccountId = destination?.Id,
      OffsetAccountId = offset?.Id,
      Type = request.Type,
      AdjustmentDirection = request.AdjustmentDirection,
      CurrencyId = cashbox.CurrencyId,
      Amount = amount,
      ExchangeRate = rate,
      BaseAmount = baseAmount,
      Reason = request.Reason.Trim(),
      Notes = Trim(request.Notes),
      CreatedByUserId = userId,
      CreatedAtUtc = now,
      JournalEntry = journal
    };
    var cashboxLedger = FinanceService.LedgerEntry(cashbox, journal.EntryDate, MoneyLedgerSourceType.PosDrawerMovement,
      movement.Id, documentNumber, cashboxAmount, cashboxBase, business.BaseCurrencyId, rate, journal.Id, userId, request.Notes, now);
    movement.CashboxLedgerEntry = cashboxLedger;
    _db.JournalEntries.Add(journal);
    _db.MoneyLedgerEntries.Add(cashboxLedger);
    if (destination is not null)
    {
      var destinationLedger = FinanceService.LedgerEntry(destination, journal.EntryDate, MoneyLedgerSourceType.PosDrawerMovement,
        movement.Id, documentNumber, amount, baseAmount, business.BaseCurrencyId, rate, journal.Id, userId, request.Notes, now);
      movement.DestinationLedgerEntry = destinationLedger;
      _db.MoneyLedgerEntries.Add(destinationLedger);
    }
    _db.PosDrawerMovements.Add(movement);
    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);
    var savedMovement = await MovementQuery().SingleAsync(item => item.Id == movement.Id, ct);
    return ToResponse(savedMovement);
  }

  private async Task<MoneyAccountEntity?> ValidateDestinationAsync(CreatePosDrawerMovementRequest request,
    MoneyAccountEntity cashbox, Guid branchId, Guid userId, CancellationToken ct)
  {
    if (request.DestinationMoneyAccountId is null) return null;
    await _finance.EnsureAccessAsync(request.DestinationMoneyAccountId.Value, userId, MoneyAccountAccessLevel.Operate, ct);
    var destination = await _db.MoneyAccounts.Include(account => account.AccountingAccount).Include(account => account.Currency)
      .SingleOrDefaultAsync(account => account.Id == request.DestinationMoneyAccountId, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid, "Select an existing destination Money Account.");
    FinanceService.EnsureActive(destination);
    if (destination.Id == cashbox.Id || destination.BranchId != branchId || destination.CurrencyId != cashbox.CurrencyId)
      throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid,
        "Cash drops require a different, operable Money Account in the same branch and currency.");
    return destination;
  }

  private async Task<AccountEntity?> ValidateOffsetAsync(CreatePosDrawerMovementRequest request, CancellationToken ct)
  {
    if (request.OffsetAccountId is null) return null;
    var account = await _db.Accounts.SingleOrDefaultAsync(item => item.Id == request.OffsetAccountId, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid, "Select an existing offset account.");
    if (!account.IsActive || account.IsGroup)
      throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid, "The offset account must be an active posting account.");
    return account;
  }

  private static void ValidateShape(CreatePosDrawerMovementRequest request, MoneyAccountEntity? destination, AccountEntity? offset)
  {
    if (request.Type == PosDrawerMovementType.CashDrop)
    {
      if (destination is null || offset is not null || request.AdjustmentDirection is not null)
        throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid,
          "Cash drops require a destination Money Account and no offset account or direction.");
      return;
    }
    if (destination is not null || offset is null)
      throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid,
        "Cash In, Cash Out, and Adjustment movements require an offset account and no destination Money Account.");
    if (request.Type == PosDrawerMovementType.Adjustment && request.AdjustmentDirection is null)
      throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid, "Select an Adjustment direction.");
    if (request.Type != PosDrawerMovementType.Adjustment && request.AdjustmentDirection is not null)
      throw new BadRequestException(ErrorCodes.Pos.DrawerMovementInvalid, "Only Adjustments can have a direction.");
  }

  private static List<JournalLineEntity> BuildJournalLines(CreatePosDrawerMovementRequest request,
    MoneyAccountEntity cashbox, MoneyAccountEntity? destination, AccountEntity? offset, Guid baseCurrencyId,
    decimal rate, decimal amount, decimal baseAmount, string documentNumber)
  {
    var increase = request.Type == PosDrawerMovementType.CashIn
      || request.Type == PosDrawerMovementType.Adjustment && request.AdjustmentDirection == PosDrawerAdjustmentDirection.In;
    var lines = new List<JournalLineEntity>();
    if (request.Type == PosDrawerMovementType.CashDrop)
    {
      lines.Add(Line(destination!.AccountingAccountId, destination.CurrencyId, rate, amount, 0, baseAmount, 0, $"Cash drop received {documentNumber}"));
      lines.Add(Line(cashbox.AccountingAccountId, cashbox.CurrencyId, rate, 0, amount, 0, baseAmount, $"Cash drop from {cashbox.Code}"));
      return lines;
    }
    if (increase)
    {
      lines.Add(Line(cashbox.AccountingAccountId, cashbox.CurrencyId, rate, amount, 0, baseAmount, 0, $"Cash received in {cashbox.Code}"));
      lines.Add(Line(offset!.Id, baseCurrencyId, 1, 0, baseAmount, 0, baseAmount, $"Drawer offset {documentNumber}"));
    }
    else
    {
      lines.Add(Line(offset!.Id, baseCurrencyId, 1, baseAmount, 0, baseAmount, 0, $"Drawer offset {documentNumber}"));
      lines.Add(Line(cashbox.AccountingAccountId, cashbox.CurrencyId, rate, 0, amount, 0, baseAmount, $"Cash removed from {cashbox.Code}"));
    }
    return lines;
  }

  private IQueryable<PosDrawerMovementEntity> MovementQuery() => _db.PosDrawerMovements.AsNoTracking()
    .Include(movement => movement.PosSession)
    .Include(movement => movement.CashboxMoneyAccount)
    .Include(movement => movement.DestinationMoneyAccount)
    .Include(movement => movement.OffsetAccount)
    .Include(movement => movement.Currency)
    .Include(movement => movement.CreatedByUser);

  private static PosDrawerMovementResponse ToResponse(PosDrawerMovementEntity movement) => new(
    movement.Id, movement.DocumentNumber, movement.PosSessionId, movement.PosSession.SessionNumber,
    movement.Type, movement.AdjustmentDirection, movement.CashboxMoneyAccountId, movement.CashboxMoneyAccount.Code,
    movement.DestinationMoneyAccountId, movement.DestinationMoneyAccount?.Code, movement.OffsetAccountId,
    movement.OffsetAccount?.Code, movement.CurrencyId, movement.Currency.Code, movement.Amount, movement.ExchangeRate,
    movement.BaseAmount, movement.Reason, movement.Notes, movement.CreatedByUserId, movement.CreatedByUser.Username,
    movement.CreatedAtUtc, movement.JournalEntryId, movement.CashboxLedgerEntryId, movement.DestinationLedgerEntryId);

  private async Task<string> NextDocumentNumberAsync(CancellationToken ct)
  {
    var last = await _db.PosDrawerMovements.IgnoreQueryFilters().Select(item => item.DocumentNumber)
      .Where(number => number.StartsWith("DWM-")).OrderByDescending(number => number).FirstOrDefaultAsync(ct);
    var next = last is not null && int.TryParse(last[4..], out var value) ? value + 1 : 1;
    return $"DWM-{next:000000}";
  }

  private static JournalLineEntity Line(Guid accountId, Guid currencyId, decimal rate, decimal debit, decimal credit,
    decimal debitBase, decimal creditBase, string description) => new()
    {
      AccountId = accountId, CurrencyId = currencyId, ExchangeRate = rate,
      OriginalDebitAmount = debit, OriginalCreditAmount = credit,
      DebitBaseAmount = debitBase, CreditBaseAmount = creditBase, Description = description
    };

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
