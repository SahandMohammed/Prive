using System.Text.Json;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Contact;
using Api.Modules.Dashboard;
using Api.Modules.Expenses;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Purchase;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Sales;

public sealed class SalesInvoiceCorrectionService
{
  private static readonly JsonSerializerOptions SnapshotJsonOptions = new(JsonSerializerDefaults.Web);
  private readonly AppDbContext _db;
  private readonly SalesService _sales;
  private readonly PaymentService _payments;

  public SalesInvoiceCorrectionService(
    AppDbContext db,
    SalesService sales,
    PaymentService? payments = null)
  {
    _db = db;
    _sales = sales;
    _payments = payments ?? new PaymentService(db);
  }

  public async Task<SalesInvoiceResponse> UpdateAsync(
    Guid id,
    UpdatePostedSalesInvoiceRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var reason = OptionalReason(request.Reason);
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(ct)
      : null;

    try
    {
      var invoice = await CorrectionQuery().SingleOrDefaultAsync(item => item.Id == id, ct)
        ?? throw InvoiceNotFound();
      EnsurePosted(invoice);
      EnsureExpectedTimestamp(invoice, request.ExpectedUpdatedAtUtc);
      await ValidateDependenciesAsync(invoice, ct);
      if (invoice.PosContext is not null && request.InvoiceDate != invoice.InvoiceDate)
        throw new ConflictException(ErrorCodes.Sales.PosInvoiceDateImmutable,
          "A completed POS Sales Invoice cannot move to another invoice date.");
      var draft = ToDraftRequest(request);
      var validation = await _sales.ValidateInvoiceAsync(
        draft,
        requireCustomer: invoice.PosContext is null,
        ct);
      if (invoice.PosContext is not null && request.BranchId != invoice.BranchId)
        throw new ConflictException(ErrorCodes.Sales.PosBranchImmutable,
          "A POS-generated invoice cannot move to another branch.");
      if (invoice.PosContext is not null && request.CurrencyId != validation.BaseCurrencyId)
        throw new BadRequestException(ErrorCodes.Sales.CurrencyInvalid,
          "A POS-generated invoice must remain in the Business base currency.");
      if (invoice.PaymentAllocations.Count > 0
        && (request.CustomerId != invoice.CustomerId
          || request.BranchId != invoice.BranchId
          || request.CurrencyId != invoice.CurrencyId))
        throw new ConflictException(ErrorCodes.Sales.InvoiceHasDependentTransaction,
          "Customer, branch, and currency cannot change while active Payment allocations exist.");

      var owned = await LoadOwnedEffectsAsync(invoice, ct);
      var before = SerializeSnapshot(CreateSnapshot(invoice, owned.StockMovements, owned.LedgerEntries));
      RemoveOwnedEffects(invoice, owned);

      // This save only flushes removal of generated effects. The transaction is still open,
      // and no correction audit entry or corrected invoice state exists yet.
      await _db.SaveChangesAsync(ct);

      var originalPostedAtUtc = invoice.PostedAtUtc!.Value;
      SalesService.Apply(invoice, draft, validation.BaseCurrencyId, validation.ExchangeRate);
      _sales.ReplaceLines(invoice, draft.Lines, validation);
      SalesService.Recalculate(invoice);
      if (invoice.PosContext is not null && invoice.Customer.SystemRole == ContactSystemRole.WalkInCustomer)
      {
        var collectedBase = Money(invoice.PaymentAllocations
          .Where(allocation => !allocation.Payment.IsDeleted)
          .Sum(allocation => allocation.BaseAmount));
        if (invoice.BaseTotal > collectedBase)
          throw new ConflictException(ErrorCodes.Sales.InvoiceHasDependentTransaction,
            "A Walk-in POS invoice correction cannot create an outstanding balance.");
      }
      invoice.AccountsReceivableAccountId = null;

      await _sales.PreparePostingEffectsAsync(
        invoice,
        validation,
        userId,
        invoice.PosContext is null ? "Sales invoice" : "POS sale",
        ct,
        originalPostedAtUtc,
        preserveInvoiceTimestamps: true);

      var correctedAtUtc = DateTime.UtcNow;
      invoice.UpdatedAtUtc = correctedAtUtc;
      var after = SerializeSnapshot(CreateSnapshot(
        invoice,
        invoice.Movements.ToList(),
        []));
      AddAudit(invoice, userId, "edited", reason, before, after, correctedAtUtc);

      await _db.SaveChangesAsync(ct);
      if (transaction is not null) await transaction.CommitAsync(ct);
      return await _sales.GetInvoiceAsync(id, ct);
    }
    catch (DbUpdateConcurrencyException)
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw ConcurrencyConflict();
    }
    catch
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw;
    }
  }

  public async Task DeleteAsync(
    Guid id,
    DeletePostedSalesInvoiceRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var reason = RequiredReason(request.Reason);
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(ct)
      : null;

    try
    {
      var invoice = await CorrectionQuery().SingleOrDefaultAsync(item => item.Id == id, ct)
        ?? throw InvoiceNotFound();
      EnsurePosted(invoice);
      EnsureExpectedTimestamp(invoice, request.ExpectedUpdatedAtUtc);
      await ValidateDependenciesAsync(invoice, ct);
      if (invoice.PosContext is null && invoice.PaymentAllocations.Count > 0)
        throw new ConflictException(ErrorCodes.Sales.InvoiceHasPayment,
          "Delete active Payments before deleting this Sales Invoice.");
      var posPaymentId = invoice.PosContext is null
        ? null
        : await _db.Payments.AsNoTracking().IgnoreQueryFilters()
          .Where(payment => !payment.IsDeleted && payment.Origin == PaymentOrigin.Pos
            && payment.SourceSalesInvoiceId == invoice.Id)
          .Select(payment => (Guid?)payment.Id)
          .SingleOrDefaultAsync(ct);
      var posPayment = posPaymentId is Guid paymentId
        ? await _payments.FindTrackedAsync(paymentId, ct)
          ?? throw Dependent("The owned POS Payment could not be identified safely.")
        : null;

      if (invoice.PosContext is not null && invoice.PaymentAllocations.Any(allocation =>
        !allocation.Payment.IsDeleted && (posPayment is null || allocation.PaymentId != posPayment.Id)))
        throw Dependent("This POS invoice has an independent Payment allocation and cannot be deleted.");
      if (posPayment is not null)
        await ValidateOwnedPosPaymentDependenciesAsync(posPayment, ct);

      var owned = await LoadOwnedEffectsAsync(invoice, ct);
      var before = SerializeSnapshot(CreateSnapshot(invoice, owned.StockMovements, owned.LedgerEntries));
      RemoveOwnedEffects(invoice, owned);

      if (posPayment is not null)
      {
        if (posPayment.Origin != PaymentOrigin.Pos || posPayment.SourceSalesInvoiceId != invoice.Id
          || posPayment.Allocations.Any(allocation => allocation.SalesInvoiceId != invoice.Id))
          throw Dependent("The POS Payment has independent allocations and cannot be deleted with this invoice.");
        await _payments.DeleteOwnedPaymentAsync(posPayment, reason, userId, ct);
      }

      var deletedAtUtc = DateTime.UtcNow;
      invoice.IsDeleted = true;
      invoice.DeletedAtUtc = deletedAtUtc;
      invoice.DeletedByUserId = userId;
      invoice.DeleteReason = reason;
      invoice.UpdatedAtUtc = deletedAtUtc;
      var after = SerializeSnapshot(CreateSnapshot(invoice, [], []));
      AddAudit(invoice, userId, "deleted", reason, before, after, deletedAtUtc);

      await _db.SaveChangesAsync(ct);
      if (transaction is not null) await transaction.CommitAsync(ct);
    }
    catch (DbUpdateConcurrencyException)
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw ConcurrencyConflict();
    }
    catch
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw;
    }
  }

  public async Task<List<SalesInvoiceHistoryResponse>> GetHistoryAsync(Guid id, CancellationToken ct)
  {
    var invoiceQuery = _db.SalesInvoices.IgnoreQueryFilters().AsNoTracking()
      .Where(invoice => invoice.Id == id);
    if (_db.SelectedBranchId is Guid branchId)
      invoiceQuery = invoiceQuery.Where(invoice => invoice.BranchId == branchId);
    if (!await invoiceQuery.AnyAsync(ct)) throw InvoiceNotFound();

    var activities = await _db.ActivityLogs.AsNoTracking()
      .Where(activity => (activity.EntityType == "Sales Invoice" || activity.EntityType == "POS Settlement")
        && activity.EntityId == id)
      .OrderBy(activity => activity.TimestampUtc)
      .ThenBy(activity => activity.Id)
      .Include(activity => activity.User)
      .ToListAsync(ct);
    return activities.Select(activity => new SalesInvoiceHistoryResponse(
        activity.Id,
        activity.EntityType == "POS Settlement" ? "POS Settlement" : "Invoice",
        activity.Action,
        activity.Reason,
        activity.UserId,
        activity.User.Username,
        activity.TimestampUtc,
        ParseJson(activity.BeforeState),
        ParseJson(activity.AfterState)))
      .ToList();
  }

  public async Task<PagedResult<DeletedSalesInvoiceResponse>> GetDeletedAsync(
    DeletedSalesInvoiceListQuery request,
    CancellationToken ct)
  {
    var query = _db.SalesInvoices.IgnoreQueryFilters().AsNoTracking()
      .Where(invoice => invoice.IsDeleted);
    if (_db.SelectedBranchId is Guid branchId)
      query = query.Where(invoice => invoice.BranchId == branchId);
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(invoice => invoice.DocumentNumber.ToLower().Contains(search)
        || (invoice.Customer != null && invoice.Customer.Name.ToLower().Contains(search)));
    }
    if (request.FromDate is not null) query = query.Where(invoice => invoice.InvoiceDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(invoice => invoice.InvoiceDate <= request.ToDate);

    return await query.OrderByDescending(invoice => invoice.DeletedAtUtc)
      .ThenByDescending(invoice => invoice.DocumentNumber)
      .Select(invoice => new DeletedSalesInvoiceResponse(
        invoice.Id,
        invoice.DocumentNumber,
        invoice.InvoiceDate,
        invoice.BranchId,
        invoice.Branch.Name,
        invoice.CustomerId,
        invoice.Customer.Name,
        invoice.Total,
        invoice.BaseTotal,
        invoice.PostedAtUtc,
        invoice.DeletedAtUtc!.Value,
        invoice.DeletedByUserId!.Value,
        invoice.DeletedByUser!.Username,
        invoice.DeleteReason!,
        invoice.PosContext != null))
      .ToPagedResultAsync(request, ct);
  }

  private IQueryable<SalesInvoiceEntity> CorrectionQuery() => _db.SalesInvoices
    .Include(invoice => invoice.Customer)
    .Include(invoice => invoice.Branch)
    .Include(invoice => invoice.Warehouse)
    .Include(invoice => invoice.Currency)
    .Include(invoice => invoice.BaseCurrency)
    .Include(invoice => invoice.CreatedByUser)
    .Include(invoice => invoice.Lines)
    .Include(invoice => invoice.PaymentAllocations).ThenInclude(allocation => allocation.Payment)
    .Include(invoice => invoice.PosRefunds)
    .Include(invoice => invoice.JournalEntry).ThenInclude(journal => journal!.Lines)
    .Include(invoice => invoice.JournalEntry).ThenInclude(journal => journal!.ReversalJournals)
    .Include(invoice => invoice.PosContext);

  private async Task ValidateDependenciesAsync(SalesInvoiceEntity invoice, CancellationToken ct)
  {
    var refund = invoice.PosRefunds.OrderBy(item => item.PostedAtUtc).FirstOrDefault();
    if (refund is not null)
      throw new ConflictException(ErrorCodes.Sales.InvoiceHasRefundOrVoid,
        $"This invoice cannot be changed because {(refund.IsVoid ? "Void" : "Refund")} {refund.DocumentNumber} is linked to it.");

    var journal = invoice.JournalEntry
      ?? throw Dependent("The invoice-owned journal could not be identified safely.");
    if (journal.Status == JournalEntryStatus.Reversed || journal.ReversalJournals.Count > 0)
    {
      var reversal = journal.ReversalJournals.OrderBy(item => item.PostedAtUtc).FirstOrDefault();
      throw Dependent(reversal is null
        ? $"Journal {journal.Reference ?? journal.Id.ToString()} has already been reversed."
        : $"Journal {reversal.Reference ?? reversal.Id.ToString()} reverses this invoice journal.");
    }

    var journalId = journal.Id;
    var hasOtherSource = await _db.PurchaseInvoices.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.MoneyTransfers.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.SupplierPayments.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.Payments.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.ExpenseDocuments.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.PosRefunds.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.SalesInvoices.AnyAsync(item => item.Id != invoice.Id && item.JournalEntryId == journalId, ct);
    if (hasOtherSource)
      throw Dependent($"Journal {journal.Reference ?? journal.Id.ToString()} is linked to another transaction.");
  }

  private async Task ValidateOwnedPosPaymentDependenciesAsync(PaymentEntity payment, CancellationToken ct)
  {
    var journal = payment.JournalEntry
      ?? throw Dependent("The POS Payment-owned journal could not be identified safely.");
    if (journal.Status == JournalEntryStatus.Reversed
      || await _db.JournalEntries.AnyAsync(entry => entry.ReversalOfJournalId == journal.Id, ct))
      throw Dependent($"Payment journal {journal.Reference ?? journal.Id.ToString()} has a reversal dependency.");

    var journalId = journal.Id;
    var hasOtherSource = await _db.PurchaseInvoices.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.SalesInvoices.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.MoneyTransfers.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.SupplierPayments.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.ExpenseDocuments.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.PosRefunds.AnyAsync(item => item.JournalEntryId == journalId, ct)
      || await _db.Payments.AnyAsync(item => item.Id != payment.Id && item.JournalEntryId == journalId, ct);
    if (hasOtherSource)
      throw Dependent($"Payment journal {journal.Reference ?? journal.Id.ToString()} is linked to another transaction.");
  }

  private async Task<OwnedEffects> LoadOwnedEffectsAsync(SalesInvoiceEntity invoice, CancellationToken ct)
  {
    var lineIds = invoice.Lines.Select(line => line.Id).ToList();
    var movements = await _db.StockMovements
      .Where(movement => movement.SalesInvoiceId == invoice.Id
        || (movement.SalesInvoiceLineId != null && lineIds.Contains(movement.SalesInvoiceLineId.Value)))
      .ToListAsync(ct);
    if (movements.Any(movement => movement.Type != StockMovementType.Sale
      || movement.SalesInvoiceId != invoice.Id
      || movement.SalesInvoiceLineId is not Guid lineId
      || !lineIds.Contains(lineId)))
      throw Dependent("A stock movement linked to this invoice cannot be classified as invoice-owned.");

    var journal = invoice.JournalEntry
      ?? throw Dependent("The invoice-owned journal could not be identified safely.");
    var ledgers = await _db.MoneyLedgerEntries
      .Where(entry => entry.JournalEntryId == journal.Id)
      .ToListAsync(ct);
    if (ledgers.Count > 0)
      throw Dependent("A Money Account entry linked to the receivable journal cannot be classified as invoice-owned.");

    return new OwnedEffects(journal, movements, ledgers);
  }

  private void RemoveOwnedEffects(SalesInvoiceEntity invoice, OwnedEffects owned)
  {
    _db.StockMovements.RemoveRange(owned.StockMovements);
    invoice.Movements.Clear();
    invoice.JournalEntry = null;
    invoice.JournalEntryId = null;
    _db.JournalEntries.Remove(owned.Journal);
  }

  private static SalesInvoiceDraftRequest ToDraftRequest(UpdatePostedSalesInvoiceRequest request) => new(
    request.CustomerId,
    request.InvoiceDate,
    request.BranchId,
    request.WarehouseId,
    request.CurrencyId,
    request.ExchangeRate,
    request.Notes,
    request.Lines);

  private void AddAudit(
    SalesInvoiceEntity invoice,
    Guid userId,
    string action,
    string? reason,
    string before,
    string after,
    DateTime timestampUtc)
  {
    var log = new ActivityLogEntity
    {
      BranchId = invoice.BranchId,
      UserId = userId,
      Action = action,
      EntityType = "Sales Invoice",
      EntityId = invoice.Id,
      DocumentNumber = invoice.DocumentNumber,
      Description = action == "deleted" ? "Deleted sales invoice" : "Edited sales invoice",
      Reason = reason,
      BeforeState = before,
      AfterState = after,
      TimestampUtc = timestampUtc
    };
    // AppDbContext's append-only guard intentionally permits Added activity rows.
    _db.ActivityLogs.Add(log);
  }

  private static SalesInvoiceAuditSnapshot CreateSnapshot(
    SalesInvoiceEntity invoice,
    IReadOnlyCollection<StockMovementEntity> movements,
    IReadOnlyCollection<MoneyLedgerEntryEntity> ledgers)
  {
    var journal = invoice.JournalEntry is null ? null : new SalesInvoiceAuditJournal(
      invoice.JournalEntry.Id,
      invoice.JournalEntry.EntryDate,
      invoice.JournalEntry.Reference,
      invoice.JournalEntry.Description,
      invoice.JournalEntry.Status,
      invoice.JournalEntry.Type,
      invoice.JournalEntry.PostedAtUtc,
      invoice.JournalEntry.Lines.OrderBy(line => line.Id).Select(line => new SalesInvoiceAuditJournalLine(
        line.Id,
        line.AccountId,
        line.Description,
        line.CurrencyId,
        line.ExchangeRate,
        line.OriginalDebitAmount,
        line.OriginalCreditAmount,
        line.DebitBaseAmount,
        line.CreditBaseAmount)).ToList());
    SalesInvoiceAuditPos? pos = null;
    if (invoice.PosContext is not null)
    {
      var sale = invoice.PosContext;
      pos = new SalesInvoiceAuditPos(
        sale.SalesInvoiceId,
        sale.OperatorUserId,
        sale.CompletedAtUtc,
        sale.ClientRequestId,
        sale.RequestFingerprint);
    }

    return new SalesInvoiceAuditSnapshot(
      new SalesInvoiceAuditHeader(
        invoice.Id,
        invoice.DocumentNumber,
        invoice.CustomerId,
        invoice.InvoiceDate,
        invoice.BranchId,
        invoice.WarehouseId,
        invoice.CurrencyId,
        invoice.BaseCurrencyId,
        invoice.ExchangeRate,
        invoice.Subtotal,
        invoice.Total,
        invoice.BaseTotal,
        invoice.Status,
        invoice.Notes,
        invoice.CreatedByUserId,
        invoice.CreatedAtUtc,
        invoice.UpdatedAtUtc,
        invoice.PostedAtUtc,
        invoice.JournalEntryId,
        invoice.AccountsReceivableAccountId,
        invoice.IsDeleted,
        invoice.DeletedAtUtc,
        invoice.DeletedByUserId,
        invoice.DeleteReason),
      invoice.Lines.OrderBy(line => line.LineType).ThenBy(line => line.Id).Select(line => new SalesInvoiceAuditLine(
        line.Id,
        line.LineType,
        line.ServiceId,
        line.ProductId,
        line.UnitOfMeasureId,
        line.Description,
        line.Quantity,
        line.ConversionOperation,
        line.ConversionFactor,
        line.BaseQuantity,
        line.UnitPrice,
        line.BaseUnitPrice,
        line.LineAmount,
        line.BaseLineAmount,
        line.ProfessionalId,
        line.RevenueAccountId,
        line.InventoryAccountId,
        line.CostOfGoodsSoldAccountId,
        line.OriginalUnitCostBase)).ToList(),
      journal,
      movements.OrderBy(movement => movement.Id).Select(movement => new SalesInvoiceAuditStockMovement(
        movement.Id,
        movement.ProductId,
        movement.WarehouseId,
        movement.Type,
        movement.MovementDate,
        movement.QuantityIn,
        movement.QuantityOut,
        movement.UnitCostBase,
        movement.SalesInvoiceId,
        movement.SalesInvoiceLineId)).ToList(),
      pos);
  }

  private static string SerializeSnapshot(SalesInvoiceAuditSnapshot snapshot) =>
    JsonSerializer.Serialize(snapshot, SnapshotJsonOptions);

  private static JsonElement? ParseJson(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : JsonSerializer.Deserialize<JsonElement>(value);

  private static string RequiredReason(string reason)
  {
    var value = reason.Trim();
    if (value.Length == 0)
      throw new BadRequestException(ErrorCodes.Common.ValidationFailed, "A correction reason is required.");
    return value;
  }

  private static string? OptionalReason(string? reason)
  {
    var value = reason?.Trim();
    return string.IsNullOrWhiteSpace(value) ? null : value;
  }

  private static decimal Money(decimal value) =>
    decimal.Round(value, 4, MidpointRounding.AwayFromZero);

  private static void EnsurePosted(SalesInvoiceEntity invoice)
  {
    if (invoice.Status != SalesInvoiceStatus.Posted)
      throw new ConflictException(ErrorCodes.Sales.DocumentNotDraft,
        "Only active Sales Invoices can be edited or deleted.");
  }

  private static void EnsureExpectedTimestamp(SalesInvoiceEntity invoice, DateTime expectedUpdatedAtUtc)
  {
    var expected = expectedUpdatedAtUtc.Kind == DateTimeKind.Utc
      ? expectedUpdatedAtUtc
      : expectedUpdatedAtUtc.ToUniversalTime();
    if (expected == default || invoice.UpdatedAtUtc != expected)
      throw ConcurrencyConflict();
  }

  private static ConflictException Dependent(string message) =>
    new(ErrorCodes.Sales.InvoiceHasDependentTransaction, message);

  private static ConflictException ConcurrencyConflict() =>
    new(ErrorCodes.Sales.ConcurrencyConflict,
      "This invoice changed after it was loaded. Refresh it and try again.");

  private static NotFoundException InvoiceNotFound() =>
    new(ErrorCodes.Sales.InvoiceNotFound, "Sales Invoice not found.");

  private sealed record OwnedEffects(
    JournalEntryEntity Journal,
    List<StockMovementEntity> StockMovements,
    List<MoneyLedgerEntryEntity> LedgerEntries);

  private sealed record SalesInvoiceAuditSnapshot(
    SalesInvoiceAuditHeader Invoice,
    List<SalesInvoiceAuditLine> Lines,
    SalesInvoiceAuditJournal? Journal,
    List<SalesInvoiceAuditStockMovement> StockMovements,
    SalesInvoiceAuditPos? Pos);

  private sealed record SalesInvoiceAuditHeader(
    Guid Id,
    string DocumentNumber,
    Guid CustomerId,
    DateOnly InvoiceDate,
    Guid BranchId,
    Guid? WarehouseId,
    Guid CurrencyId,
    Guid BaseCurrencyId,
    decimal ExchangeRate,
    decimal Subtotal,
    decimal Total,
    decimal BaseTotal,
    SalesInvoiceStatus Status,
    string? Notes,
    Guid CreatedByUserId,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    DateTime? PostedAtUtc,
    Guid? JournalEntryId,
    Guid? AccountsReceivableAccountId,
    bool IsDeleted,
    DateTime? DeletedAtUtc,
    Guid? DeletedByUserId,
    string? DeleteReason);

  private sealed record SalesInvoiceAuditLine(
    Guid Id,
    SalesLineType LineType,
    Guid? ServiceId,
    Guid? ProductId,
    Guid? UnitOfMeasureId,
    string? Description,
    decimal Quantity,
    UnitConversionOperation? ConversionOperation,
    decimal ConversionFactor,
    decimal BaseQuantity,
    decimal UnitPrice,
    decimal BaseUnitPrice,
    decimal LineAmount,
    decimal BaseLineAmount,
    Guid? ProfessionalId,
    Guid? RevenueAccountId,
    Guid? InventoryAccountId,
    Guid? CostOfGoodsSoldAccountId,
    decimal? OriginalUnitCostBase);

  private sealed record SalesInvoiceAuditJournal(
    Guid Id,
    DateOnly EntryDate,
    string? Reference,
    string Description,
    JournalEntryStatus Status,
    JournalEntryType Type,
    DateTime? PostedAtUtc,
    List<SalesInvoiceAuditJournalLine> Lines);

  private sealed record SalesInvoiceAuditJournalLine(
    Guid Id,
    Guid AccountId,
    string? Description,
    Guid CurrencyId,
    decimal ExchangeRate,
    decimal OriginalDebitAmount,
    decimal OriginalCreditAmount,
    decimal DebitBaseAmount,
    decimal CreditBaseAmount);

  private sealed record SalesInvoiceAuditStockMovement(
    Guid Id,
    Guid ProductId,
    Guid WarehouseId,
    StockMovementType Type,
    DateOnly MovementDate,
    decimal QuantityIn,
    decimal QuantityOut,
    decimal UnitCostBase,
    Guid? SalesInvoiceId,
    Guid? SalesInvoiceLineId);

  private sealed record SalesInvoiceAuditPos(
    Guid SalesInvoiceId,
    Guid OperatorUserId,
    DateTime CompletedAtUtc,
    Guid? ClientRequestId,
    string? RequestFingerprint);
}
