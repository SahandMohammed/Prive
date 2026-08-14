using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Inventory;

public static class InventorySeeder
{
  public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
  {
    var units = new[] { ("Piece", "PC"), ("Bottle", "BTL"), ("Box", "BOX"), ("Pack", "PK"), ("Liter", "L"), ("Milliliter", "ML"), ("Kilogram", "KG"), ("Gram", "G") };
    foreach (var (name, code) in units)
      if (!await db.UnitsOfMeasure.AnyAsync(unit => unit.Code == code, ct)) db.UnitsOfMeasure.Add(new UnitOfMeasureEntity { Name = name, Code = code });
    await db.SaveChangesAsync(ct);
  }
}
