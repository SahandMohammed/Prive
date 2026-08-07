using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Settings;
using Api.Shared.Domain;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Sales;

public interface ISalesPostingService
{
  Task<DocumentTransitionDto> PostAsync(Guid id, CancellationToken ct = default);
  Task<DocumentTransitionDto> VoidAsync(Guid id, CancellationToken ct = default);
}

public sealed class SalesPostingService(
  AppDbContext db,
  IPostingSettingsProvider postingSettings,
  IFinancialLedgerService financialLedger,
  IInventoryLedgerService inventoryLedger) : ISalesPostingService
{
  public Task<DocumentTransitionDto> PostAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var invoice = await db.SalesInvoices
        .AsNoTracking()
        .Include(x => x.Customer)
        .Include(x => x.Warehouse)
        .Include(x => x.Lines)
          .ThenInclude(x => x.Item)
        .Include(x => x.Lines)
          .ThenInclude(x => x.SalesAccount)
        .SingleOrDefaultAsync(x => x.Id == id, token)
        ?? throw new NotFoundException(ErrorCodes.Sales.InvoiceNotFound, "Sales invoice was not found.");

      if (invoice.Status != DocumentStatus.Draft)
      {
        throw new ConflictException(ErrorCodes.Sales.InvoiceNotDraft, "Only a draft sales invoice can be posted.");
      }

      var settings = await postingSettings.GetRequiredAsync(token);
      await ValidateAsync(invoice, settings, token);

      var now = DateTime.UtcNow;
      var changed = await db.SalesInvoices
        .Where(x => x.Id == id && x.Status == DocumentStatus.Draft)
        .ExecuteUpdateAsync(setters => setters
          .SetProperty(x => x.Status, DocumentStatus.Posted)
          .SetProperty(x => x.PostedAtUtc, now), token);
      if (changed != 1)
      {
        throw new ConflictException(ErrorCodes.Sales.InvoiceNotDraft, "The sales invoice is no longer in Draft status.");
      }

      var sign = invoice.IsReturn ? -1m : 1m;
      var source = AccountTransactionSourceType.SalesInvoice;
      financialLedger.AddMovements(new[]
      {
        new FinancialMovementRequest(
          settings.DefaultReceivableAccountId,
          invoice.CustomerId,
          invoice.CurrencyId,
          sign * invoice.Total,
          sign * invoice.Total,
          invoice.InvoiceDateUtc,
          source,
          invoice.Id,
          invoice.IsReturn ? "Sales return receivable" : "Sales invoice receivable")
      }.Concat(invoice.Lines.Where(line => line.LineTotal != 0).Select(line => new FinancialMovementRequest(
        line.SalesAccountId,
        null,
        invoice.CurrencyId,
        sign * line.LineTotal,
        sign * line.LineTotal,
        invoice.InvoiceDateUtc,
        source,
        invoice.Id,
        invoice.IsReturn ? "Sales return income" : "Sales invoice income"))));

      if (invoice.WarehouseId.HasValue)
      {
        var stockSign = invoice.IsReturn ? 1m : -1m;
        await inventoryLedger.AddMovementsAsync(invoice.Lines
          .Where(line => line.Item.TrackInventory)
          .Select(line => new InventoryMovementRequest(
            invoice.WarehouseId.Value,
            line.ItemId,
            stockSign * line.Quantity * line.ConversionFactor,
            invoice.InvoiceDateUtc,
            StockTransactionSourceType.SalesInvoice,
            invoice.Id,
            invoice.IsReturn ? "Sales return" : "Sales invoice")), token);
      }

      return new DocumentTransitionDto(id, DocumentStatus.Posted, now, null);
    }, ct);

  public Task<DocumentTransitionDto> VoidAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var invoice = await db.SalesInvoices
        .AsNoTracking()
        .SingleOrDefaultAsync(x => x.Id == id, token)
        ?? throw new NotFoundException(ErrorCodes.Sales.InvoiceNotFound, "Sales invoice was not found.");

      if (invoice.Status != DocumentStatus.Posted)
      {
        throw new ConflictException(ErrorCodes.Sales.InvoiceNotPosted, "Only a posted sales invoice can be voided.");
      }

      if (await db.PaymentAllocations.AnyAsync(x => x.SalesInvoiceId == id && x.IsActive, token))
      {
        throw new ConflictException(
          ErrorCodes.Sales.ActiveAllocations,
          "Allocated receipts must be reversed before voiding this sales invoice.");
      }
      if (!invoice.IsReturn && await db.SalesInvoices.AnyAsync(
            x => x.IsReturn && x.OriginalSalesInvoiceId == id && x.Status == DocumentStatus.Posted,
            token))
      {
        throw new ConflictException(
          ErrorCodes.Sales.PostedReturns,
          "Posted sales returns must be voided before voiding their original sales invoice.");
      }

      var now = DateTime.UtcNow;
      var changed = await db.SalesInvoices
        .Where(x => x.Id == id && x.Status == DocumentStatus.Posted)
        .ExecuteUpdateAsync(setters => setters
          .SetProperty(x => x.Status, DocumentStatus.Voided)
          .SetProperty(x => x.VoidedAtUtc, now), token);
      if (changed != 1)
      {
        throw new ConflictException(ErrorCodes.Sales.InvoiceNotPosted, "The sales invoice is no longer in Posted status.");
      }

      await financialLedger.ReverseSourceAsync(AccountTransactionSourceType.SalesInvoice, id, token);
      await inventoryLedger.ReverseSourceAsync(StockTransactionSourceType.SalesInvoice, id, token);
      return new DocumentTransitionDto(id, DocumentStatus.Voided, invoice.PostedAtUtc, now);
    }, ct);

  private async Task ValidateAsync(
    SalesInvoiceEntity invoice,
    PostingSettingsSnapshot settings,
    CancellationToken ct)
  {
    if (invoice.CurrencyId != settings.BaseCurrencyId)
    {
      throw new BadRequestException(ErrorCodes.Finance.BaseCurrencyRequired, "Sales invoices must use the configured base currency.");
    }
    if (!ContactPostingRules.IsActiveCustomer(invoice.Customer))
    {
      throw new BadRequestException(ErrorCodes.Sales.InvalidInvoice, "Sales invoice requires an active customer contact.");
    }
    if (invoice.Lines.Count == 0 || invoice.Lines.Any(line =>
        !line.Item.IsActive || !line.SalesAccount.IsActive ||
        (line.SalesAccount.CurrencyId.HasValue && line.SalesAccount.CurrencyId != settings.BaseCurrencyId)))
    {
      throw new BadRequestException(ErrorCodes.Sales.InvalidInvoice, "Sales invoice requires active items and posting accounts.");
    }

    var trackedProducts = invoice.Lines.Any(line => line.Item.TrackInventory);
    if (trackedProducts && (!invoice.WarehouseId.HasValue || invoice.Warehouse is null || !invoice.Warehouse.IsActive))
    {
      throw new BadRequestException(ErrorCodes.Sales.InvalidInvoice, "A warehouse is required when a sales invoice contains inventory-tracked items.");
    }
    if (invoice.WarehouseId.HasValue && (invoice.Warehouse is null || !invoice.Warehouse.IsActive))
    {
      throw new BadRequestException(ErrorCodes.Sales.InvalidInvoice, "The selected warehouse is inactive or missing.");
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
        throw new BadRequestException(ErrorCodes.Sales.InvalidInvoice, "A sales line contains an invalid unit conversion snapshot.");
      }
    }
  }

  private static void ValidateTotals(SalesInvoiceEntity invoice, int precision)
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
      throw new BadRequestException(ErrorCodes.Sales.InvalidInvoice, "Sales invoice totals do not reconcile with its lines.");
    }
  }

  private async Task ValidateReturnAsync(SalesInvoiceEntity invoice, CancellationToken ct)
  {
    var original = await db.SalesInvoices
      .AsNoTracking()
      .Include(x => x.Lines)
      .SingleOrDefaultAsync(x => x.Id == invoice.OriginalSalesInvoiceId, ct);
    if (original is null || original.Status != DocumentStatus.Posted || original.IsReturn ||
        original.CustomerId != invoice.CustomerId || original.CurrencyId != invoice.CurrencyId)
    {
      throw new BadRequestException(ErrorCodes.Sales.InvalidReturn, "Sales return must reference a posted original sale for the same customer and currency.");
    }

    var originalLines = original.Lines.ToDictionary(x => x.Id);
    if (invoice.Lines.Any(line => !line.OriginalSalesInvoiceLineId.HasValue ||
        !originalLines.TryGetValue(line.OriginalSalesInvoiceLineId.Value, out var source) ||
        line.ItemId != source.ItemId ||
        line.SalesAccountId != source.SalesAccountId ||
        line.UnitOfMeasureId != source.UnitOfMeasureId ||
        line.ConversionFactor != source.ConversionFactor ||
        line.UnitPrice != source.UnitPrice))
    {
      throw new BadRequestException(ErrorCodes.Sales.InvalidReturn, "Sales return lines must inherit item, account, unit, conversion, and price from the original line.");
    }

    var sourceLineIds = invoice.Lines.Select(x => x.OriginalSalesInvoiceLineId!.Value).Distinct().ToArray();
    var previouslyReturned = await db.SalesInvoiceLines
      .AsNoTracking()
      .Where(x => x.OriginalSalesInvoiceLineId.HasValue && sourceLineIds.Contains(x.OriginalSalesInvoiceLineId.Value) &&
                  x.SalesInvoice.IsReturn && x.SalesInvoice.Status == DocumentStatus.Posted)
      .GroupBy(x => x.OriginalSalesInvoiceLineId!.Value)
      .Select(group => new { Id = group.Key, Quantity = group.Sum(x => x.Quantity) })
      .ToDictionaryAsync(x => x.Id, x => x.Quantity, ct);

    foreach (var group in invoice.Lines.GroupBy(x => x.OriginalSalesInvoiceLineId!.Value))
    {
      var originalLine = originalLines[group.Key];
      if (previouslyReturned.GetValueOrDefault(group.Key) + group.Sum(x => x.Quantity) > originalLine.Quantity)
      {
        throw new ConflictException(ErrorCodes.Sales.ReturnQuantityExceeded, "Sales return quantity exceeds the remaining returnable quantity.");
      }
    }
  }
}
