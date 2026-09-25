using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Api.Shared.Time;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Pos;

public sealed class PosRefundService
{
  private readonly AppDbContext _db;
  private readonly FinanceService _finance;
  private readonly PosSessionService _sessions;

  public PosRefundService(AppDbContext db, FinanceService finance, PosSessionService sessions)
  {
    _db = db;
    _finance = finance;
    _sessions = sessions;
  }

  public async Task<PosRefundabilityResponse> GetRefundabilityAsync(Guid saleId, CancellationToken ct)
  {
    var sale = await RefundableSaleQuery(trackChanges: false)
      .SingleOrDefaultAsync(item => item.Id == saleId, ct) ?? throw SaleNotFound();
    return BuildRefundability(sale);
  }

  public async Task<PagedResult<PosRefundSummaryResponse>> GetSaleRefundsAsync(
    Guid saleId, PosRefundListQuery request, CancellationToken ct)
  {
    if (!await _db.PosSales.AsNoTracking().AnyAsync(sale => sale.Id == saleId, ct)) throw SaleNotFound();
    return await _db.PosRefunds.AsNoTracking()
      .Where(refund => refund.PosSaleId == saleId && refund.Status == PosRefundStatus.Posted)
      .OrderBy(refund => refund.PostedAtUtc)
      .Select(refund => new PosRefundSummaryResponse(
        refund.Id, refund.DocumentNumber, refund.IsVoid, refund.Reason,
        refund.TotalRefundBase, refund.ReceivableReversalBase, refund.CashRefundBase,
        refund.PostedAtUtc, refund.ApprovedByUser.Username))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PosRefundResponse> GetRefundAsync(Guid id, CancellationToken ct)
  {
    var refund = await RefundQuery().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Pos.RefundNotFound, "POS Refund was not found.");
    return ToResponse(refund);
  }

  public Task<PosRefundResponse> PostRefundAsync(
    Guid saleId,
    CreatePosRefundRequest request,
    Guid userId,
    CancellationToken ct) => PostWithConflictHandlingAsync(
      saleId, request.PosSessionId, request.Reason, request.Notes,
      request.Lines, request.RefundTenders, isVoid: false, null, request.ClientRequestId, userId, ct);

  public Task<PosRefundResponse> VoidRemainingAsync(
    Guid saleId,
    VoidPosSaleRequest request,
    Guid userId,
    CancellationToken ct) => PostWithConflictHandlingAsync(
      saleId, request.PosSessionId, request.Reason, request.Notes,
      null, request.RefundTenders, isVoid: true, request.RestockSalesInvoiceLineIds.ToHashSet(), request.ClientRequestId, userId, ct);

  private async Task<PosRefundResponse> PostWithConflictHandlingAsync(
    Guid saleId,
    Guid sessionId,
    PosRefundReason reason,
    string? notes,
    List<PosRefundLineRequest>? requestedLines,
    List<PosRefundTenderRequest> tenderRequests,
    bool isVoid,
    HashSet<Guid>? restockLineIds,
    Guid clientRequestId,
    Guid userId,
    CancellationToken ct)
  {
    // Internal callers predate the HTTP idempotency contract. The controller enforces it for public requests.
    if (clientRequestId == Guid.Empty) clientRequestId = Guid.NewGuid();
    var fingerprint = Fingerprint(saleId, sessionId, reason, notes, requestedLines, tenderRequests, isVoid, restockLineIds);
    PosRefundResponse? existing;
    try
    {
      existing = await FindIdempotentRefundAsync(clientRequestId, fingerprint, ct);
    }
    catch (Exception exception) when (PosConcurrency.IsConflict(exception))
    {
      throw new ConflictException(ErrorCodes.Pos.RefundConcurrencyConflict,
        "Another refund changed the remaining refundable quantity. Refresh the sale and try again.");
    }
    if (existing is not null) return existing;
    try
    {
      return await PostCoreAsync(
        saleId, sessionId, reason, notes, requestedLines, tenderRequests,
        isVoid, restockLineIds, clientRequestId, fingerprint, userId, ct);
    }
    catch (Exception exception) when (PosConcurrency.IsConflict(exception))
    {
      existing = await FindIdempotentRefundAsync(clientRequestId, fingerprint, ct);
      if (existing is not null) return existing;
      throw new ConflictException(ErrorCodes.Pos.RefundConcurrencyConflict,
        "Another refund changed the remaining refundable quantity. Refresh the sale and try again.");
    }
  }

  private async Task<PosRefundResponse> PostCoreAsync(
    Guid saleId,
    Guid sessionId,
    PosRefundReason reason,
    string? notes,
    List<PosRefundLineRequest>? requestedLines,
    List<PosRefundTenderRequest> tenderRequests,
    bool isVoid,
    HashSet<Guid>? restockLineIds,
    Guid clientRequestId,
    string fingerprint,
    Guid userId,
    CancellationToken ct)
  {
    ValidateReason(reason, notes);
    await RequireManagementAsync(userId, ct);
    var branchId = _db.SelectedBranchId
      ?? throw new BadRequestException(ErrorCodes.Branch.SelectionRequired, "Select a branch before using POS.");
    if (sessionId == Guid.Empty)
      throw new BadRequestException(ErrorCodes.Pos.RefundSessionRequired, "Open a POS Session before posting a refund.");

    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    var session = await _sessions.RequireOpenSessionForManagementAsync(userId, sessionId, branchId, ct);
    var existing = await FindIdempotentRefundAsync(clientRequestId, fingerprint, ct);
    if (existing is not null) return existing;
    if (_db.Database.IsRelational())
      await _db.Database.ExecuteSqlInterpolatedAsync(
        $"SELECT \"Id\" FROM pos_sales WHERE \"Id\" = {saleId} FOR UPDATE", ct);

    var sale = await RefundableSaleQuery(trackChanges: true)
      .SingleOrDefaultAsync(item => item.Id == saleId, ct) ?? throw SaleNotFound();
    if (sale.Status != PosSaleStatus.Completed || sale.SalesInvoice.Status != SalesInvoiceStatus.Posted)
      throw new BadRequestException(ErrorCodes.Pos.RefundNothingAvailable,
        "Only a completed POS Sale with a posted Sales Invoice can be refunded.");
    if (sale.SalesInvoice.BranchId != branchId)
      throw new ForbiddenException(ErrorCodes.Branch.ScopeMismatch,
        "The POS Sale belongs to a different branch workspace.");

    var refundability = BuildRefundability(sale);
    if (refundability.RemainingRefundableBaseAmount <= 0)
      throw new ConflictException(ErrorCodes.Pos.RefundNothingAvailable, "This POS Sale is already fully refunded.");

    var remainingProductIds = refundability.Lines
      .Where(line => line.LineType == SalesLineType.Product && line.RefundableQuantity > 0)
      .Select(line => line.SalesInvoiceLineId).ToHashSet();
    if (isVoid && restockLineIds!.Except(remainingProductIds).Any())
      throw new BadRequestException(ErrorCodes.Pos.RefundLinesInvalid,
        "Void restock selections must reference remaining Product lines from the original POS Sale.");
    var requestLines = isVoid
      ? refundability.Lines.Where(line => line.RefundableQuantity > 0)
        .Select(line => new PosRefundLineRequest(
          line.SalesInvoiceLineId, line.RefundableQuantity,
          line.LineType == SalesLineType.Product && restockLineIds!.Contains(line.SalesInvoiceLineId))).ToList()
      : requestedLines ?? [];
    ValidateLines(requestLines);

    var originalById = sale.SalesInvoice.Lines.ToDictionary(line => line.Id);
    var refundableById = refundability.Lines.ToDictionary(line => line.SalesInvoiceLineId);
    var postings = new List<RefundLinePosting>();
    foreach (var requestLine in requestLines)
    {
      if (!originalById.TryGetValue(requestLine.SalesInvoiceLineId, out var original)
        || !refundableById.TryGetValue(requestLine.SalesInvoiceLineId, out var available))
        throw new BadRequestException(ErrorCodes.Pos.RefundLinesInvalid,
          "Every refund line must reference a line from the original POS Sale.");
      if (requestLine.Quantity <= 0 || requestLine.Quantity > available.RefundableQuantity)
        throw new ConflictException(ErrorCodes.Pos.RefundQuantityExceeded,
          $"Refund quantity for '{available.Description}' exceeds the remaining refundable quantity.");
      if (original.LineType == SalesLineType.Service && requestLine.RestockProduct)
        throw new BadRequestException(ErrorCodes.Pos.RefundLinesInvalid, "Services cannot be restocked.");
      if (original.LineType == SalesLineType.Product && !requestLine.RestockProduct && string.IsNullOrWhiteSpace(notes))
        throw new BadRequestException(ErrorCodes.Pos.RefundNotesRequired,
          "Explain why a refunded Product is not being returned to sellable inventory.");
      if (original.RevenueAccountId is null)
        throw SnapshotMissing(original, "revenue account");

      var alreadyRefundedAmount = Money(original.PosRefundLines
        .Where(line => line.PosRefund.Status == PosRefundStatus.Posted)
        .Sum(line => line.RefundAmountBase));
      var finalQuantity = requestLine.Quantity == available.RefundableQuantity;
      var refundAmount = finalQuantity
        ? Money(original.BaseLineAmount - alreadyRefundedAmount)
        : Money(original.BaseLineAmount * requestLine.Quantity / original.Quantity);
      var baseQuantity = finalQuantity
        ? Quantity(original.BaseQuantity - original.PosRefundLines
          .Where(line => line.PosRefund.Status == PosRefundStatus.Posted)
          .Sum(line => line.BaseQuantity))
        : Quantity(original.BaseQuantity * requestLine.Quantity / original.Quantity);
      var unitCost = original.OriginalUnitCostBase
        ?? original.Movements.Where(movement => movement.Type == StockMovementType.Sale)
          .Select(movement => (decimal?)movement.UnitCostBase).SingleOrDefault();
      if (original.LineType == SalesLineType.Product && requestLine.RestockProduct
        && (unitCost is null || original.InventoryAccountId is null || original.CostOfGoodsSoldAccountId is null))
        throw SnapshotMissing(original, "historical inventory cost and accounts");

      postings.Add(new RefundLinePosting(
        original, requestLine.Quantity, baseQuantity, refundAmount,
        requestLine.RestockProduct, unitCost));
    }

    var totalRefundBase = Money(postings.Sum(posting => posting.RefundAmountBase));
    if (totalRefundBase <= 0)
      throw new BadRequestException(ErrorCodes.Pos.RefundNothingAvailable, "Select at least one refundable quantity.");
    var receivableReversalBase = Money(Math.Min(totalRefundBase, refundability.CurrentOutstandingBaseAmount));
    var cashRefundBase = Money(totalRefundBase - receivableReversalBase);
    if (receivableReversalBase > 0 && sale.SalesInvoice.AccountsReceivableAccountId is null)
      throw new BadRequestException(ErrorCodes.Pos.RefundAccountMappingInvalid,
        "The original receivable account snapshot is unavailable for this Sale.");

    var tenderPostings = await ValidateTendersAsync(
      tenderRequests, cashRefundBase, branchId, sale.SalesInvoice.BaseCurrencyId, session, userId, ct);
    var now = DateTime.UtcNow;
    var business = await _db.Businesses.AsNoTracking().SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.BusinessNotConfigured, "Complete Business Setup before using POS.");
    var date = BusinessTime.DateAt(business, now);
    var documentNumber = await NextDocumentNumberAsync(ct);

    var journalLines = postings.GroupBy(posting => posting.Original.RevenueAccountId!.Value)
      .Select(group => BaseJournalLine(
        group.Key, sale.SalesInvoice.BaseCurrencyId,
        Money(group.Sum(posting => posting.RefundAmountBase)), 0,
        $"Revenue reversal on {documentNumber}"))
      .ToList();
    if (receivableReversalBase > 0)
      journalLines.Add(BaseJournalLine(
        sale.SalesInvoice.AccountsReceivableAccountId!.Value,
        sale.SalesInvoice.BaseCurrencyId, 0, receivableReversalBase,
        $"Receivable reduction on {documentNumber}"));
    foreach (var tender in tenderPostings)
    {
      journalLines.Add(new JournalLineEntity
      {
        AccountId = tender.Account.AccountingAccountId,
        Description = $"Refund paid from {tender.Account.Code}",
        CurrencyId = tender.Account.CurrencyId,
        ExchangeRate = tender.ExchangeRate,
        OriginalCreditAmount = tender.Request.Amount,
        CreditBaseAmount = tender.BaseAmount
      });
    }

    foreach (var group in postings.Where(posting => posting.RestockProduct)
      .GroupBy(posting => new
      {
        Inventory = posting.Original.InventoryAccountId!.Value,
        Cogs = posting.Original.CostOfGoodsSoldAccountId!.Value
      }))
    {
      var cost = Money(group.Sum(posting => posting.BaseQuantity * posting.OriginalUnitCostBase!.Value));
      if (cost <= 0) continue;
      journalLines.Add(BaseJournalLine(
        group.Key.Inventory, sale.SalesInvoice.BaseCurrencyId, cost, 0,
        $"Inventory returned on {documentNumber}"));
      journalLines.Add(BaseJournalLine(
        group.Key.Cogs, sale.SalesInvoice.BaseCurrencyId, 0, cost,
        $"Cost of goods sold reversal on {documentNumber}"));
    }

    if (Money(journalLines.Sum(line => line.DebitBaseAmount))
      != Money(journalLines.Sum(line => line.CreditBaseAmount)))
      throw new BadRequestException(ErrorCodes.Accounting.JournalUnbalanced,
        "The POS Refund journal is not balanced in the base currency.");

    var journal = new JournalEntryEntity
    {
      EntryDate = date,
      Reference = documentNumber,
      Description = $"POS {(isVoid ? "void" : "refund")} {documentNumber} for {sale.DocumentNumber}",
      BranchId = branchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Reversal,
      PostedAtUtc = now,
      Lines = journalLines
    };
    var refund = new PosRefundEntity
    {
      DocumentNumber = documentNumber,
      PosSaleId = sale.Id,
      SalesInvoiceId = sale.SalesInvoiceId,
      BranchId = branchId,
      PosSessionId = sessionId,
      CustomerId = sale.SalesInvoice.CustomerId,
      Reason = reason,
      Notes = Trim(notes),
      IsVoid = isVoid,
      Status = PosRefundStatus.Posted,
      TotalRefundBase = totalRefundBase,
      ReceivableReversalBase = receivableReversalBase,
      CashRefundBase = cashRefundBase,
      CreatedByUserId = userId,
      ApprovedByUserId = userId,
      CreatedAtUtc = now,
      PostedAtUtc = now,
      JournalEntry = journal,
      ClientRequestId = clientRequestId,
      RequestFingerprint = fingerprint
    };

    foreach (var posting in postings)
    {
      var line = new PosRefundLineEntity
      {
        OriginalSalesInvoiceLineId = posting.Original.Id,
        LineType = posting.Original.LineType,
        ServiceId = posting.Original.ServiceId,
        ProductId = posting.Original.ProductId,
        UnitOfMeasureId = posting.Original.UnitOfMeasureId,
        ProfessionalId = posting.Original.ProfessionalId,
        Description = posting.Original.Description
          ?? posting.Original.Service?.Name
          ?? posting.Original.Product?.Name
          ?? "Sale line",
        UnitCode = posting.Original.UnitOfMeasure?.Code,
        ProfessionalName = posting.Original.Professional?.Name,
        Quantity = posting.Quantity,
        BaseQuantity = posting.BaseQuantity,
        RefundAmountBase = posting.RefundAmountBase,
        RestockProduct = posting.RestockProduct,
        OriginalUnitCostBase = posting.OriginalUnitCostBase,
        RevenueAccountId = posting.Original.RevenueAccountId!.Value,
        InventoryAccountId = posting.Original.InventoryAccountId,
        CostOfGoodsSoldAccountId = posting.Original.CostOfGoodsSoldAccountId
      };
      refund.Lines.Add(line);
      if (posting.RestockProduct)
      {
        var movement = new StockMovementEntity
        {
          ProductId = posting.Original.ProductId!.Value,
          WarehouseId = sale.SalesInvoice.WarehouseId
            ?? throw new BadRequestException(ErrorCodes.Pos.RefundLinesInvalid,
              "The original Product Sale has no return warehouse."),
          Type = StockMovementType.SaleReturn,
          MovementDate = date,
          QuantityIn = posting.BaseQuantity,
          QuantityOut = 0,
          UnitCostBase = posting.OriginalUnitCostBase!.Value,
          Reference = documentNumber,
          Note = Trim(notes),
          PosRefundLine = line,
          PerformedByUserId = userId,
          CreatedAtUtc = now
        };
        line.StockMovements.Add(movement);
        _db.StockMovements.Add(movement);
      }
    }

    foreach (var tender in tenderPostings)
    {
      var ledger = FinanceService.LedgerEntry(
        tender.Account, date, MoneyLedgerSourceType.PosRefund, refund.Id, documentNumber,
        -tender.Request.Amount, -tender.BaseAmount, sale.SalesInvoice.BaseCurrencyId,
        tender.ExchangeRate, journal.Id, userId, notes, now);
      refund.Tenders.Add(new PosRefundTenderEntity
      {
        Sequence = tender.Sequence,
        MoneyAccountId = tender.Account.Id,
        Amount = tender.Request.Amount,
        ExchangeRate = tender.ExchangeRate,
        BaseAmount = tender.BaseAmount,
        MoneyLedgerEntry = ledger
      });
      _db.MoneyLedgerEntries.Add(ledger);
    }

    _db.JournalEntries.Add(journal);
    _db.PosRefunds.Add(refund);
    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);
    return await GetRefundAsync(refund.Id, ct);
  }

  private async Task<List<RefundTenderPosting>> ValidateTendersAsync(
    List<PosRefundTenderRequest> requests,
    decimal requiredBase,
    Guid branchId,
    Guid baseCurrencyId,
    PosSessionEntity session,
    Guid userId,
    CancellationToken ct)
  {
    if (requests.Select(request => request.MoneyAccountId).Distinct().Count() != requests.Count
      || requests.Any(request => request.MoneyAccountId == Guid.Empty || request.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Pos.RefundMoneyAccountInvalid,
        "Each refund Money Account may appear once with an amount greater than zero.");
    if (requiredBase == 0 && requests.Count > 0)
      throw new BadRequestException(ErrorCodes.Pos.RefundTenderMismatch,
        "This refund only reduces Accounts Receivable and must not return physical money.");
    if (requiredBase > 0 && requests.Count == 0)
      throw new BadRequestException(ErrorCodes.Pos.RefundTenderMismatch,
        $"Select Money Accounts for the {requiredBase} base-currency physical refund.");

    foreach (var request in requests)
      await _finance.EnsureAccessAsync(request.MoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    var ids = requests.Select(request => request.MoneyAccountId).ToList();
    if (_db.Database.IsRelational())
    {
      // Serialize payouts against each physical account so two refunds cannot both
      // pass a stale balance check and drive the Money Ledger below zero.
      foreach (var accountId in ids.Order())
        await _db.Database.ExecuteSqlInterpolatedAsync(
          $"SELECT \"Id\" FROM money_accounts WHERE \"Id\" = {accountId} FOR UPDATE", ct);
    }
    var accounts = await _db.MoneyAccounts.Include(account => account.AccountingAccount)
      .Include(account => account.Currency).Where(account => ids.Contains(account.Id))
      .ToDictionaryAsync(account => account.Id, ct);
    if (accounts.Count != ids.Count)
      throw new BadRequestException(ErrorCodes.Pos.RefundMoneyAccountInvalid,
        "Every physical refund must use an existing Money Account.");

    var now = DateTime.UtcNow;
    var postings = new List<RefundTenderPosting>();
    for (var index = 0; index < requests.Count; index++)
    {
      var request = requests[index];
      var account = accounts[request.MoneyAccountId];
      FinanceService.EnsureActive(account);
      if (account.BranchId != branchId || !account.Currency.IsActive)
        throw new BadRequestException(ErrorCodes.Pos.RefundMoneyAccountInvalid,
          $"Money Account '{account.Code}' is not available in this POS branch.");
      if (account.Type == MoneyAccountType.Cashbox
        && !session.OpeningCounts.Any(count => count.CurrencyId == account.CurrencyId))
        throw new BadRequestException(ErrorCodes.Pos.SessionCurrencyNotAllowed,
          $"Cashbox currency '{account.Currency.Code}' was not part of this POS Session opening snapshot.");
      var rate = await _finance.ResolveCurrentRateAsync(account.CurrencyId, baseCurrencyId, now, ct);
      var baseAmount = Money(request.Amount * rate);
      var balance = await _finance.BalanceAsync(account.Id, ct);
      if (balance < request.Amount)
        throw new BadRequestException(ErrorCodes.Pos.RefundInsufficientBalance,
          $"Money Account '{account.Code}' does not have enough physical balance for this refund.");
      postings.Add(new RefundTenderPosting(index + 1, request, account, rate, baseAmount));
    }
    if (Money(postings.Sum(posting => posting.BaseAmount)) != requiredBase)
      throw new BadRequestException(ErrorCodes.Pos.RefundTenderMismatch,
        $"Refund Money Account equivalents must equal exactly {requiredBase} in the base currency.");
    return postings;
  }

  private IQueryable<PosSaleEntity> RefundableSaleQuery(bool trackChanges)
  {
    var query = _db.PosSales
      .Include(sale => sale.CashierUser)
      .Include(sale => sale.Tenders)
      .Include(sale => sale.Change)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Customer)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Branch)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Warehouse)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.BaseCurrency)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.ReceiptAllocations)
        .ThenInclude(allocation => allocation.CustomerReceipt)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines)
        .ThenInclude(line => line.Service)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines)
        .ThenInclude(line => line.Product)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines)
        .ThenInclude(line => line.UnitOfMeasure)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines)
        .ThenInclude(line => line.Professional)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines)
        .ThenInclude(line => line.Movements)
      .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines)
        .ThenInclude(line => line.PosRefundLines).ThenInclude(line => line.PosRefund)
      .Include(sale => sale.Refunds).ThenInclude(refund => refund.ApprovedByUser)
      .Include(sale => sale.Refunds).ThenInclude(refund => refund.Lines);
    return trackChanges ? query : query.AsNoTracking();
  }

  private IQueryable<PosRefundEntity> RefundQuery() => _db.PosRefunds.AsNoTracking()
    .Include(refund => refund.PosSale)
    .Include(refund => refund.SalesInvoice)
    .Include(refund => refund.Branch)
    .Include(refund => refund.PosSession)
    .Include(refund => refund.Customer)
    .Include(refund => refund.CreatedByUser)
    .Include(refund => refund.ApprovedByUser)
    .Include(refund => refund.SalesInvoice).ThenInclude(invoice => invoice.BaseCurrency)
    .Include(refund => refund.Lines).ThenInclude(line => line.StockMovements)
    .Include(refund => refund.Tenders).ThenInclude(tender => tender.MoneyAccount).ThenInclude(account => account.Currency);

  private static PosRefundabilityResponse BuildRefundability(PosSaleEntity sale)
  {
    var postedRefunds = sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted).ToList();
    var refundedBase = Money(postedRefunds.Sum(refund => refund.TotalRefundBase));
    var remainingBase = Math.Max(Money(sale.SalesInvoice.BaseTotal - refundedBase), 0);
    var refundState = RefundState(refundedBase, sale.SalesInvoice.BaseTotal);
    var settledBase = Money(sale.Tenders.Sum(tender => tender.BaseAmount) - (sale.Change?.BaseAmount ?? 0));
    var receiptsBase = Money(sale.SalesInvoice.ReceiptAllocations
      .Where(allocation => allocation.CustomerReceipt.Status == FinanceDocumentStatus.Posted)
      .Sum(allocation => allocation.BaseAmount));
    var priorReceivableReversal = Money(postedRefunds.Sum(refund => refund.ReceivableReversalBase));
    var outstandingBase = Math.Max(
      Money(sale.SalesInvoice.BaseTotal - settledBase - receiptsBase - priorReceivableReversal), 0);

    var lines = sale.SalesInvoice.Lines.OrderBy(line => line.LineType).ThenBy(line => line.Id).Select(line =>
    {
      var refundedQuantity = Quantity(line.PosRefundLines
        .Where(refundLine => refundLine.PosRefund.Status == PosRefundStatus.Posted)
        .Sum(refundLine => refundLine.Quantity));
      var refundedAmount = Money(line.PosRefundLines
        .Where(refundLine => refundLine.PosRefund.Status == PosRefundStatus.Posted)
        .Sum(refundLine => refundLine.RefundAmountBase));
      return new PosRefundabilityLineResponse(
        line.Id, line.LineType,
        line.Description ?? line.Service?.Name ?? line.Product?.Name ?? "Sale line",
        line.Product?.SKU, line.UnitOfMeasure?.Code, line.Professional?.Name,
        line.Quantity, refundedQuantity, Math.Max(Quantity(line.Quantity - refundedQuantity), 0),
        line.BaseLineAmount, refundedAmount, Math.Max(Money(line.BaseLineAmount - refundedAmount), 0),
        line.LineType == SalesLineType.Product && sale.SalesInvoice.WarehouseId is not null);
    }).ToList();

    return new PosRefundabilityResponse(
      sale.Id, sale.DocumentNumber, sale.SalesInvoiceId, sale.SalesInvoice.DocumentNumber,
      sale.SalesInvoice.BranchId, sale.SalesInvoice.CustomerId, sale.SalesInvoice.Customer?.Name,
      sale.SalesInvoice.WarehouseId, sale.CompletedAtUtc, sale.CashierUser.Username,
      sale.SalesInvoice.BaseTotal, refundedBase, remainingBase, outstandingBase, refundState,
      sale.SalesInvoice.BaseCurrencyId, sale.SalesInvoice.BaseCurrency.Code, lines,
      postedRefunds.OrderBy(refund => refund.PostedAtUtc).Select(ToSummary).ToList());
  }

  private static PosRefundResponse ToResponse(PosRefundEntity refund) => new(
    refund.Id, refund.DocumentNumber, refund.PosSaleId, refund.PosSale.DocumentNumber,
    refund.SalesInvoiceId, refund.SalesInvoice.DocumentNumber,
    refund.BranchId, refund.Branch.Code, refund.Branch.Name,
    refund.PosSessionId, refund.PosSession.SessionNumber,
    refund.CustomerId, refund.Customer?.Name, refund.Reason, refund.Notes, refund.IsVoid, refund.Status,
    refund.TotalRefundBase, refund.ReceivableReversalBase, refund.CashRefundBase,
    refund.SalesInvoice.BaseCurrencyId, refund.SalesInvoice.BaseCurrency.Code,
    refund.CreatedByUserId, refund.CreatedByUser.Username,
    refund.ApprovedByUserId, refund.ApprovedByUser.Username,
    refund.CreatedAtUtc, refund.PostedAtUtc, refund.JournalEntryId,
    refund.Lines.OrderBy(line => line.Id).Select(line => new PosRefundLineResponse(
      line.Id, line.OriginalSalesInvoiceLineId, line.LineType, line.Description,
      line.UnitCode, line.ProfessionalName, line.Quantity, line.BaseQuantity,
      line.RefundAmountBase, line.RestockProduct, line.OriginalUnitCostBase,
      line.StockMovements.OrderBy(movement => movement.Id).Select(movement => movement.Id).ToList())).ToList(),
    refund.Tenders.OrderBy(tender => tender.Sequence).Select(tender => new PosRefundTenderResponse(
      tender.Id, tender.Sequence, tender.MoneyAccountId, tender.MoneyAccount.Code, tender.MoneyAccount.Name,
      tender.MoneyAccount.CurrencyId, tender.MoneyAccount.Currency.Code,
      tender.Amount, tender.ExchangeRate, tender.BaseAmount, tender.MoneyLedgerEntryId)).ToList());

  private static PosRefundSummaryResponse ToSummary(PosRefundEntity refund) => new(
    refund.Id, refund.DocumentNumber, refund.IsVoid, refund.Reason,
    refund.TotalRefundBase, refund.ReceivableReversalBase, refund.CashRefundBase,
    refund.PostedAtUtc, refund.ApprovedByUser.Username);

  private async Task RequireManagementAsync(Guid userId, CancellationToken ct)
  {
    var role = await _db.Users.AsNoTracking().Where(user => user.Id == userId)
      .Select(user => (UserRole?)user.Role).SingleOrDefaultAsync(ct);
    if (role is not UserRole.SuperAdmin and not UserRole.Owner and not UserRole.Manager)
      throw new ForbiddenException(ErrorCodes.Common.Forbidden,
        "Only a Manager, Owner, or SuperAdmin may post a POS Refund or Void.");
  }

  private async Task<string> NextDocumentNumberAsync(CancellationToken ct)
  {
    var last = await _db.PosRefunds.IgnoreQueryFilters().Select(refund => refund.DocumentNumber)
      .Where(number => number.StartsWith("REF-"))
      .OrderByDescending(number => number).FirstOrDefaultAsync(ct);
    var next = last is not null && int.TryParse(last[4..], out var value) ? value + 1 : 1;
    return $"REF-{next:000000}";
  }

  private static JournalLineEntity BaseJournalLine(
    Guid accountId, Guid baseCurrencyId, decimal debit, decimal credit, string description) => new()
    {
      AccountId = accountId,
      Description = description,
      CurrencyId = baseCurrencyId,
      ExchangeRate = 1,
      OriginalDebitAmount = debit,
      OriginalCreditAmount = credit,
      DebitBaseAmount = debit,
      CreditBaseAmount = credit
    };

  private static void ValidateReason(PosRefundReason reason, string? notes)
  {
    if (!Enum.IsDefined(reason))
      throw new BadRequestException(ErrorCodes.Pos.RefundReasonInvalid, "Select a valid refund reason.");
    if (reason == PosRefundReason.Other && string.IsNullOrWhiteSpace(notes))
      throw new BadRequestException(ErrorCodes.Pos.RefundNotesRequired,
        "Enter notes when the refund reason is Other.");
  }

  private static void ValidateLines(List<PosRefundLineRequest> lines)
  {
    if (lines.Count == 0)
      throw new BadRequestException(ErrorCodes.Pos.RefundLinesInvalid, "Select at least one Sale line to refund.");
    if (lines.Select(line => line.SalesInvoiceLineId).Distinct().Count() != lines.Count)
      throw new BadRequestException(ErrorCodes.Pos.RefundLinesInvalid,
        "A Sale line may appear only once in a refund.");
  }

  private static PosRefundState RefundState(decimal refunded, decimal total) => refunded <= 0
    ? PosRefundState.NotRefunded
    : refunded >= total
      ? PosRefundState.FullyRefunded
      : PosRefundState.PartiallyRefunded;

  private static BadRequestException SnapshotMissing(SalesInvoiceLineEntity line, string snapshot) => new(
    ErrorCodes.Pos.RefundAccountMappingInvalid,
    $"The original {snapshot} snapshot is unavailable for Sale line '{line.Description ?? line.Id.ToString()}'.");
  private static NotFoundException SaleNotFound() =>
    new(ErrorCodes.Pos.SaleNotFound, "POS Sale was not found.");
  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
  private static decimal Quantity(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);

  private async Task<PosRefundResponse?> FindIdempotentRefundAsync(Guid clientRequestId, string fingerprint, CancellationToken ct)
  {
    var existing = await _db.PosRefunds.AsNoTracking().SingleOrDefaultAsync(refund => refund.ClientRequestId == clientRequestId, ct);
    if (existing is null) return null;
    if (!string.Equals(existing.RequestFingerprint, fingerprint, StringComparison.Ordinal))
      throw new ConflictException(ErrorCodes.Pos.IdempotencyKeyReused,
        "This client request ID was already used with different refund or void data.");
    return await GetRefundAsync(existing.Id, ct);
  }

  private static string Fingerprint(Guid saleId, Guid sessionId, PosRefundReason reason, string? notes,
    List<PosRefundLineRequest>? lines, List<PosRefundTenderRequest> tenders, bool isVoid, HashSet<Guid>? restockLines) =>
    Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new
    {
      saleId,
      sessionId,
      reason,
      notes = Trim(notes),
      Lines = lines?.OrderBy(line => line.SalesInvoiceLineId)
        .Select(line => new { line.SalesInvoiceLineId, line.Quantity, line.RestockProduct }),
      Tenders = tenders.OrderBy(tender => tender.MoneyAccountId).ThenBy(tender => tender.Amount)
        .Select(tender => new { tender.MoneyAccountId, tender.Amount }),
      isVoid,
      RestockLineIds = restockLines?.Order().ToList()
    }))));

  private sealed record RefundLinePosting(
    SalesInvoiceLineEntity Original,
    decimal Quantity,
    decimal BaseQuantity,
    decimal RefundAmountBase,
    bool RestockProduct,
    decimal? OriginalUnitCostBase);

  private sealed record RefundTenderPosting(
    int Sequence,
    PosRefundTenderRequest Request,
    MoneyAccountEntity Account,
    decimal ExchangeRate,
    decimal BaseAmount);
}
