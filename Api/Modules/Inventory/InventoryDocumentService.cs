using Api.Infrastructure.Http;
using Api.Modules.Settings;
using Api.Shared.Domain;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Inventory;

public interface IInventoryDocumentService
{
  Task<DocumentTransitionDto> PostAdjustmentAsync(Guid id, CancellationToken ct = default);
  Task<DocumentTransitionDto> VoidAdjustmentAsync(Guid id, CancellationToken ct = default);
  Task<DocumentTransitionDto> PostTransferAsync(Guid id, CancellationToken ct = default);
  Task<DocumentTransitionDto> VoidTransferAsync(Guid id, CancellationToken ct = default);
}

public sealed class InventoryDocumentService(
  AppDbContext db,
  IInventoryLedgerService inventoryLedger) : IInventoryDocumentService
{
  public Task<DocumentTransitionDto> PostAdjustmentAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var adjustment = await db.StockAdjustments
        .AsNoTracking()
        .Include(x => x.Warehouse)
        .Include(x => x.Lines)
          .ThenInclude(x => x.Item)
        .SingleOrDefaultAsync(x => x.Id == id, token)
        ?? throw new NotFoundException(ErrorCodes.Inventory.AdjustmentNotFound, "Stock adjustment was not found.");

      if (adjustment.Status != DocumentStatus.Draft)
      {
        throw new ConflictException(ErrorCodes.Inventory.DocumentNotDraft, "Only a draft stock adjustment can be posted.");
      }
      if (!adjustment.Warehouse.IsActive || adjustment.Lines.Count == 0 ||
          adjustment.Lines.Any(x => !x.Item.IsActive || !x.Item.TrackInventory))
      {
        throw new BadRequestException(ErrorCodes.Inventory.InvalidMovement, "Adjustment requires an active warehouse and active inventory-tracked items.");
      }

      var validUnits = await ItemUnitSnapshotValidator.AreValidAsync(db, adjustment.Lines.Select(x => new ItemUnitSnapshot(
        x.ItemId, x.Item.BaseUnitOfMeasureId, x.UnitOfMeasureId, x.ConversionFactor)), token);
      if (!validUnits)
      {
        throw new BadRequestException(ErrorCodes.Inventory.InvalidMovement, "An adjustment line contains an invalid unit conversion snapshot.");
      }

      var now = DateTime.UtcNow;
      await ClaimDraftAsync(db.StockAdjustments.Where(x => x.Id == id), now, token);
      await inventoryLedger.AddMovementsAsync(adjustment.Lines.Select(line => new InventoryMovementRequest(
        adjustment.WarehouseId,
        line.ItemId,
        line.Quantity * line.ConversionFactor,
        adjustment.AdjustmentDateUtc,
        StockTransactionSourceType.StockAdjustment,
        adjustment.Id,
        adjustment.Notes)), token);

      return new DocumentTransitionDto(id, DocumentStatus.Posted, now, null);
    }, ct);

  public Task<DocumentTransitionDto> VoidAdjustmentAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var exists = await db.StockAdjustments.AsNoTracking().AnyAsync(x => x.Id == id, token);
      if (!exists) throw new NotFoundException(ErrorCodes.Inventory.AdjustmentNotFound, "Stock adjustment was not found.");

      var now = DateTime.UtcNow;
      await ClaimPostedAsync(db.StockAdjustments.Where(x => x.Id == id), now, token);
      await inventoryLedger.ReverseSourceAsync(StockTransactionSourceType.StockAdjustment, id, token);
      return new DocumentTransitionDto(id, DocumentStatus.Voided, null, now);
    }, ct);

  public Task<DocumentTransitionDto> PostTransferAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var transfer = await db.WarehouseTransfers
        .AsNoTracking()
        .Include(x => x.SourceWarehouse)
        .Include(x => x.DestinationWarehouse)
        .Include(x => x.Lines)
          .ThenInclude(x => x.Item)
        .SingleOrDefaultAsync(x => x.Id == id, token)
        ?? throw new NotFoundException(ErrorCodes.Inventory.TransferNotFound, "Warehouse transfer was not found.");

      if (transfer.Status != DocumentStatus.Draft)
      {
        throw new ConflictException(ErrorCodes.Inventory.DocumentNotDraft, "Only a draft warehouse transfer can be posted.");
      }
      if (!transfer.SourceWarehouse.IsActive || !transfer.DestinationWarehouse.IsActive || transfer.Lines.Count == 0 ||
          transfer.Lines.Any(x => !x.Item.IsActive || !x.Item.TrackInventory))
      {
        throw new BadRequestException(ErrorCodes.Inventory.InvalidMovement, "Transfer requires active warehouses and active inventory-tracked items.");
      }

      var validUnits = await ItemUnitSnapshotValidator.AreValidAsync(db, transfer.Lines.Select(x => new ItemUnitSnapshot(
        x.ItemId, x.Item.BaseUnitOfMeasureId, x.UnitOfMeasureId, x.ConversionFactor)), token);
      if (!validUnits)
      {
        throw new BadRequestException(ErrorCodes.Inventory.InvalidMovement, "A transfer line contains an invalid unit conversion snapshot.");
      }

      var now = DateTime.UtcNow;
      await ClaimDraftAsync(db.WarehouseTransfers.Where(x => x.Id == id), now, token);
      var movements = transfer.Lines.SelectMany(line => new[]
      {
        new InventoryMovementRequest(transfer.SourceWarehouseId, line.ItemId, -(line.Quantity * line.ConversionFactor), transfer.TransferDateUtc, StockTransactionSourceType.WarehouseTransfer, id, transfer.Notes),
        new InventoryMovementRequest(transfer.DestinationWarehouseId, line.ItemId, line.Quantity * line.ConversionFactor, transfer.TransferDateUtc, StockTransactionSourceType.WarehouseTransfer, id, transfer.Notes)
      });
      await inventoryLedger.AddMovementsAsync(movements, token);

      return new DocumentTransitionDto(id, DocumentStatus.Posted, now, null);
    }, ct);

  public Task<DocumentTransitionDto> VoidTransferAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var exists = await db.WarehouseTransfers.AsNoTracking().AnyAsync(x => x.Id == id, token);
      if (!exists) throw new NotFoundException(ErrorCodes.Inventory.TransferNotFound, "Warehouse transfer was not found.");

      var now = DateTime.UtcNow;
      await ClaimPostedAsync(db.WarehouseTransfers.Where(x => x.Id == id), now, token);
      await inventoryLedger.ReverseSourceAsync(StockTransactionSourceType.WarehouseTransfer, id, token);
      return new DocumentTransitionDto(id, DocumentStatus.Voided, null, now);
    }, ct);

  private static async Task ClaimDraftAsync<T>(IQueryable<T> query, DateTime now, CancellationToken ct)
    where T : class, IPostableDocument
  {
    var changed = await query
      .Where(x => x.Status == DocumentStatus.Draft)
      .ExecuteUpdateAsync(setters => setters
        .SetProperty(x => x.Status, DocumentStatus.Posted)
        .SetProperty(x => EF.Property<DateTime?>(x, "PostedAtUtc"), now), ct);
    if (changed != 1)
    {
      throw new ConflictException(ErrorCodes.Inventory.DocumentNotDraft, "The document is no longer in Draft status.");
    }
  }

  private static async Task ClaimPostedAsync<T>(IQueryable<T> query, DateTime now, CancellationToken ct)
    where T : class, IPostableDocument
  {
    var changed = await query
      .Where(x => x.Status == DocumentStatus.Posted)
      .ExecuteUpdateAsync(setters => setters
        .SetProperty(x => x.Status, DocumentStatus.Voided)
        .SetProperty(x => EF.Property<DateTime?>(x, "VoidedAtUtc"), now), ct);
    if (changed != 1)
    {
      throw new ConflictException(ErrorCodes.Inventory.DocumentNotPosted, "The document is no longer in Posted status.");
    }
  }
}
