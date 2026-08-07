using Api.Infrastructure.Http;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Inventory;

public sealed record InventoryMovementRequest(
  Guid WarehouseId,
  Guid ItemId,
  decimal QuantityBase,
  DateTime TransactionDateUtc,
  StockTransactionSourceType SourceType,
  Guid SourceId,
  string? Notes = null,
  Guid? ReversesTransactionId = null);

public interface IInventoryLedgerService
{
  Task AddMovementsAsync(IEnumerable<InventoryMovementRequest> movements, CancellationToken ct = default);
  Task ReverseSourceAsync(StockTransactionSourceType sourceType, Guid sourceId, CancellationToken ct = default);
}

public sealed class InventoryLedgerService(AppDbContext db) : IInventoryLedgerService
{
  public async Task AddMovementsAsync(IEnumerable<InventoryMovementRequest> movements, CancellationToken ct = default)
  {
    var entries = movements.ToList();
    if (entries.Count == 0) return;
    if (entries.Any(x => x.QuantityBase == 0))
    {
      throw new BadRequestException(ErrorCodes.Inventory.InvalidMovement, "Stock movement quantity cannot be zero.");
    }

    foreach (var decrease in entries
      .GroupBy(x => new { x.WarehouseId, x.ItemId })
      .Select(group => new
      {
        group.Key.WarehouseId,
        group.Key.ItemId,
        NetQuantity = group.Sum(x => x.QuantityBase)
      })
      .Where(x => x.NetQuantity < 0))
    {
      var available = await db.StockTransactions
        .Where(x => x.WarehouseId == decrease.WarehouseId && x.ItemId == decrease.ItemId)
        .SumAsync(x => (decimal?)x.QuantityBase, ct) ?? 0m;

      if (available + decrease.NetQuantity < 0)
      {
        throw new ConflictException(
          ErrorCodes.Inventory.InsufficientStock,
          "Insufficient stock is available for this posting operation.");
      }
    }

    db.StockTransactions.AddRange(entries.Select(x => new StockTransactionEntity
    {
      WarehouseId = x.WarehouseId,
      ItemId = x.ItemId,
      QuantityBase = x.QuantityBase,
      TransactionDateUtc = x.TransactionDateUtc,
      SourceType = x.SourceType,
      SourceId = x.SourceId,
      Notes = x.Notes,
      ReversesTransactionId = x.ReversesTransactionId
    }));
  }

  public async Task ReverseSourceAsync(StockTransactionSourceType sourceType, Guid sourceId, CancellationToken ct = default)
  {
    var originals = await db.StockTransactions
      .AsNoTracking()
      .Where(x => x.SourceType == sourceType && x.SourceId == sourceId && x.ReversesTransactionId == null)
      .ToListAsync(ct);

    var now = DateTime.UtcNow;
    await AddMovementsAsync(originals.Select(original => new InventoryMovementRequest(
      original.WarehouseId,
      original.ItemId,
      -original.QuantityBase,
      now,
      StockTransactionSourceType.Reversal,
      sourceId,
      "Void reversal",
      original.Id)), ct);
  }
}
