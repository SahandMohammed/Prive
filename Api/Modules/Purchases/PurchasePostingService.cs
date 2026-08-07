using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Settings;
using Api.Shared.Domain;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Purchases;

public interface IPurchasePostingService
{
  Task<DocumentTransitionDto> PostAsync(Guid id, CancellationToken ct = default);
  Task<DocumentTransitionDto> VoidAsync(Guid id, CancellationToken ct = default);
}

public sealed class PurchasePostingService(
  AppDbContext db,
  IPostingSettingsProvider postingSettings,
  IFinancialLedgerService financialLedger,
  IInventoryLedgerService inventoryLedger) : IPurchasePostingService
{
  public Task<DocumentTransitionDto> PostAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var invoice = await db.PurchaseInvoices
        .AsNoTracking()
        .Include(x => x.Vendor)
        .Include(x => x.Warehouse)
        .Include(x => x.Lines)
          .ThenInclude(x => x.Item)
        .Include(x => x.Lines)
          .ThenInclude(x => x.PurchaseAccount)
        .SingleOrDefaultAsync(x => x.Id == id, token)
        ?? throw new NotFoundException(ErrorCodes.Purchases.InvoiceNotFound, "Purchase invoice was not found.");

      if (invoice.Status != DocumentStatus.Draft)
      {
        throw new ConflictException(ErrorCodes.Purchases.InvoiceNotDraft, "Only a draft purchase invoice can be posted.");
      }

      var settings = await postingSettings.GetRequiredAsync(token);
      await ValidateAsync(invoice, settings, token);

      var now = DateTime.UtcNow;
      var changed = await db.PurchaseInvoices
        .Where(x => x.Id == id && x.Status == DocumentStatus.Draft)
        .ExecuteUpdateAsync(setters => setters
          .SetProperty(x => x.Status, DocumentStatus.Posted)
          .SetProperty(x => x.PostedAtUtc, now), token);
      if (changed != 1)
      {
        throw new ConflictException(ErrorCodes.Purchases.InvoiceNotDraft, "The purchase invoice is no longer in Draft status.");
      }

      var sign = invoice.IsReturn ? -1m : 1m;
      financialLedger.AddMovements(new[]
      {
        new FinancialMovementRequest(
          settings.DefaultPayableAccountId,
          invoice.VendorId,
          invoice.CurrencyId,
          sign * invoice.Total,
          sign * invoice.Total,
          invoice.InvoiceDateUtc,
          AccountTransactionSourceType.PurchaseInvoice,
          invoice.Id,
          invoice.IsReturn ? "Purchase return payable" : "Purchase invoice payable")
      }.Concat(invoice.Lines.Where(line => line.LineTotal != 0).Select(line => new FinancialMovementRequest(
        line.PurchaseAccountId,
        null,
        invoice.CurrencyId,
        sign * line.LineTotal,
        sign * line.LineTotal,
        invoice.InvoiceDateUtc,
        AccountTransactionSourceType.PurchaseInvoice,
        invoice.Id,
        invoice.IsReturn ? "Purchase return expense" : "Purchase invoice expense"))));

      if (invoice.WarehouseId.HasValue)
      {
        var stockSign = invoice.IsReturn ? -1m : 1m;
        await inventoryLedger.AddMovementsAsync(invoice.Lines
          .Where(line => line.Item.TrackInventory)
          .Select(line => new InventoryMovementRequest(
            invoice.WarehouseId.Value,
            line.ItemId,
            stockSign * line.Quantity * line.ConversionFactor,
            invoice.InvoiceDateUtc,
            StockTransactionSourceType.PurchaseInvoice,
            invoice.Id,
            invoice.IsReturn ? "Purchase return" : "Purchase invoice")), token);
      }

      return new DocumentTransitionDto(id, DocumentStatus.Posted, now, null);
    }, ct);

  public Task<DocumentTransitionDto> VoidAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var invoice = await db.PurchaseInvoices
        .AsNoTracking()
        .SingleOrDefaultAsync(x => x.Id == id, token)
        ?? throw new NotFoundException(ErrorCodes.Purchases.InvoiceNotFound, "Purchase invoice was not found.");

      if (invoice.Status != DocumentStatus.Posted)
      {
        throw new ConflictException(ErrorCodes.Purchases.InvoiceNotPosted, "Only a posted purchase invoice can be voided.");
      }
      if (await db.PaymentAllocations.AnyAsync(x => x.PurchaseInvoiceId == id && x.IsActive, token))
      {
        throw new ConflictException(
          ErrorCodes.Purchases.ActiveAllocations,
          "Allocated payments must be reversed before voiding this purchase invoice.");
      }
      if (!invoice.IsReturn && await db.PurchaseInvoices.AnyAsync(
            x => x.IsReturn && x.OriginalPurchaseInvoiceId == id && x.Status == DocumentStatus.Posted,
            token))
      {
        throw new ConflictException(
          ErrorCodes.Purchases.PostedReturns,
          "Posted purchase returns must be voided before voiding their original purchase invoice.");
      }

      var now = DateTime.UtcNow;
      var changed = await db.PurchaseInvoices
        .Where(x => x.Id == id && x.Status == DocumentStatus.Posted)
        .ExecuteUpdateAsync(setters => setters
          .SetProperty(x => x.Status, DocumentStatus.Voided)
          .SetProperty(x => x.VoidedAtUtc, now), token);
      if (changed != 1)
      {
        throw new ConflictException(ErrorCodes.Purchases.InvoiceNotPosted, "The purchase invoice is no longer in Posted status.");
      }

      await financialLedger.ReverseSourceAsync(AccountTransactionSourceType.PurchaseInvoice, id, token);
      await inventoryLedger.ReverseSourceAsync(StockTransactionSourceType.PurchaseInvoice, id, token);
      return new DocumentTransitionDto(id, DocumentStatus.Voided, invoice.PostedAtUtc, now);
    }, ct);

  private async Task ValidateAsync(PurchaseInvoiceEntity invoice, PostingSettingsSnapshot settings, CancellationToken ct)
  {
    if (invoice.CurrencyId != settings.BaseCurrencyId)
    {
      throw new BadRequestException(ErrorCodes.Finance.BaseCurrencyRequired, "Purchase invoices must use the configured base currency.");
    }
    if (!ContactPostingRules.IsActiveVendor(invoice.Vendor))
    {
      throw new BadRequestException(ErrorCodes.Purchases.InvalidInvoice, "Purchase invoice requires an active vendor contact.");
    }
    if (invoice.Lines.Count == 0 || invoice.Lines.Any(line =>
        !line.Item.IsActive || !line.PurchaseAccount.IsActive ||
        (line.PurchaseAccount.CurrencyId.HasValue && line.PurchaseAccount.CurrencyId != settings.BaseCurrencyId)))
    {
      throw new BadRequestException(ErrorCodes.Purchases.InvalidInvoice, "Purchase invoice requires active items and posting accounts.");
    }

    var trackedProducts = invoice.Lines.Any(line => line.Item.TrackInventory);
    if (trackedProducts && (!invoice.WarehouseId.HasValue || invoice.Warehouse is null || !invoice.Warehouse.IsActive))
    {
      throw new BadRequestException(ErrorCodes.Purchases.InvalidInvoice, "A warehouse is required when a purchase invoice contains inventory-tracked items.");
    }
    if (invoice.WarehouseId.HasValue && (invoice.Warehouse is null || !invoice.Warehouse.IsActive))
    {
      throw new BadRequestException(ErrorCodes.Purchases.InvalidInvoice, "The selected warehouse is inactive or missing.");
    }

    ValidateTotals(invoice, settings.MonetaryDecimalPlaces);
    if (invoice.IsReturn)
    {
      await ValidateReturnAsync(invoice, ct);
    }
    else
    {
      var validUnits = await ItemUnitSnapshotValidator.AreValidAsync(db, invoice.Lines.Select(line => new ItemUnitSnapshot(
        line.ItemId, line.Item.BaseUnitOfMeasureId, line.UnitOfMeasureId, line.ConversionFactor)), ct);
      if (!validUnits)
      {
        throw new BadRequestException(ErrorCodes.Purchases.InvalidInvoice, "A purchase line contains an invalid unit conversion snapshot.");
      }
    }
  }

  private static void ValidateTotals(PurchaseInvoiceEntity invoice, int precision)
  {
    var reconciles = InvoiceTotals.Reconcile(
      invoice.Lines.Select(line => new InvoiceLineTotalInput(
        line.Quantity, line.UnitPrice, line.DiscountAmount, line.LineTotal)),
      invoice.Subtotal,
      invoice.DiscountTotal,
      invoice.Total,
      precision);
    if (!reconciles)
    {
      throw new BadRequestException(ErrorCodes.Purchases.InvalidInvoice, "Purchase invoice totals do not reconcile with its lines.");
    }
  }

  private async Task ValidateReturnAsync(PurchaseInvoiceEntity invoice, CancellationToken ct)
  {
    var original = await db.PurchaseInvoices
      .AsNoTracking()
      .Include(x => x.Lines)
      .SingleOrDefaultAsync(x => x.Id == invoice.OriginalPurchaseInvoiceId, ct);
    if (original is null || original.Status != DocumentStatus.Posted || original.IsReturn ||
        original.VendorId != invoice.VendorId || original.CurrencyId != invoice.CurrencyId)
    {
      throw new BadRequestException(ErrorCodes.Purchases.InvalidReturn, "Purchase return must reference a posted original purchase for the same vendor and currency.");
    }

    var originalLines = original.Lines.ToDictionary(x => x.Id);
    if (invoice.Lines.Any(line => !line.OriginalPurchaseInvoiceLineId.HasValue ||
        !originalLines.TryGetValue(line.OriginalPurchaseInvoiceLineId.Value, out var source) ||
        line.ItemId != source.ItemId ||
        line.PurchaseAccountId != source.PurchaseAccountId ||
        line.UnitOfMeasureId != source.UnitOfMeasureId ||
        line.ConversionFactor != source.ConversionFactor ||
        line.UnitPrice != source.UnitPrice))
    {
      throw new BadRequestException(ErrorCodes.Purchases.InvalidReturn, "Purchase return lines must inherit item, account, unit, conversion, and price from the original line.");
    }

    var sourceLineIds = invoice.Lines.Select(x => x.OriginalPurchaseInvoiceLineId!.Value).Distinct().ToArray();
    var previouslyReturned = await db.PurchaseInvoiceLines
      .AsNoTracking()
      .Where(x => x.OriginalPurchaseInvoiceLineId.HasValue && sourceLineIds.Contains(x.OriginalPurchaseInvoiceLineId.Value) &&
                  x.PurchaseInvoice.IsReturn && x.PurchaseInvoice.Status == DocumentStatus.Posted)
      .GroupBy(x => x.OriginalPurchaseInvoiceLineId!.Value)
      .Select(group => new { Id = group.Key, Quantity = group.Sum(x => x.Quantity) })
      .ToDictionaryAsync(x => x.Id, x => x.Quantity, ct);

    foreach (var group in invoice.Lines.GroupBy(x => x.OriginalPurchaseInvoiceLineId!.Value))
    {
      var originalLine = originalLines[group.Key];
      if (previouslyReturned.GetValueOrDefault(group.Key) + group.Sum(x => x.Quantity) > originalLine.Quantity)
      {
        throw new ConflictException(ErrorCodes.Purchases.ReturnQuantityExceeded, "Purchase return quantity exceeds the remaining returnable quantity.");
      }
    }
  }
}
