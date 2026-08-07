using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Settings;

public sealed record ItemUnitSnapshot(
  Guid ItemId,
  Guid BaseUnitOfMeasureId,
  Guid UnitOfMeasureId,
  decimal ConversionFactor);

public static class ItemUnitSnapshotValidator
{
  public static async Task<bool> AreValidAsync(
    AppDbContext db,
    IEnumerable<ItemUnitSnapshot> snapshots,
    CancellationToken ct)
  {
    var values = snapshots.ToList();
    if (values.Any(x => x.ConversionFactor <= 0)) return false;

    var additional = values
      .Where(x => x.UnitOfMeasureId != x.BaseUnitOfMeasureId)
      .ToList();
    if (additional.Count == 0)
    {
      return values.All(x => x.ConversionFactor == 1m);
    }

    var itemIds = additional.Select(x => x.ItemId).Distinct().ToArray();
    var mappings = await db.ItemUnitsOfMeasure
      .AsNoTracking()
      .Where(x => itemIds.Contains(x.ItemId))
      .Select(x => new { x.ItemId, x.UnitOfMeasureId, x.ConversionFactor })
      .ToListAsync(ct);

    return values.All(snapshot =>
      snapshot.UnitOfMeasureId == snapshot.BaseUnitOfMeasureId
        ? snapshot.ConversionFactor == 1m
        : mappings.Any(mapping =>
          mapping.ItemId == snapshot.ItemId &&
          mapping.UnitOfMeasureId == snapshot.UnitOfMeasureId &&
          mapping.ConversionFactor == snapshot.ConversionFactor));
  }
}
