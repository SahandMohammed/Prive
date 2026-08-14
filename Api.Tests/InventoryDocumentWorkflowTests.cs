using Api.Infrastructure.Http;
using Api.Modules.Branch;
using Api.Modules.Inventory;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class InventoryDocumentWorkflowTests
{
  [Fact]
  public async Task Opening_stock_draft_is_stock_neutral_until_posted_and_then_immutable()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new InventoryService(db);
    var request = new OpeningStockDraftRequest(data.BranchId, data.SourceWarehouseId, DateOnly.FromDateTime(DateTime.UtcNow),
      [new(data.ProductAId, 10, 4), new(data.ProductBId, 5, 8)], "Initial count");

    var draft = await service.CreateOpeningStockAsync(request, data.UserId, default);
    Assert.Equal("OS-000001", draft.DocumentNumber);
    Assert.Equal(InventoryDocumentStatus.Draft, draft.Status);
    Assert.Equal(80, draft.TotalValueBase);
    Assert.Empty(db.StockMovements);

    var edited = request with { Lines = [new(data.ProductAId, 12, 4), new(data.ProductBId, 5, 8)] };
    await service.UpdateOpeningStockAsync(draft.Id, edited, default);
    Assert.Empty(db.StockMovements);

    var posted = await service.PostOpeningStockAsync(draft.Id, data.UserId, default);
    Assert.Equal(InventoryDocumentStatus.Posted, posted.Status);
    Assert.NotNull(posted.PostedAtUtc);
    Assert.Equal(2, await db.StockMovements.CountAsync());
    Assert.All(await db.StockMovements.ToListAsync(), movement =>
    {
      Assert.Equal(draft.Id, movement.OpeningStockDocumentId);
      Assert.NotNull(movement.OpeningStockLineId);
    });
    Assert.Equal(12, await QuantityAsync(db, data.SourceWarehouseId, data.ProductAId));
    Assert.Equal(4, await AverageCostAsync(db, data.SourceWarehouseId, data.ProductAId));
    var ledger = await service.GetMovementsAsync(new StockMovementListQuery { DocumentNumber = draft.DocumentNumber }, default);
    Assert.Equal(2, ledger.TotalCount);
    Assert.All(ledger.Items, movement => { Assert.Equal(draft.DocumentNumber, movement.DocumentNumber); Assert.Equal(InventoryDocumentType.OpeningStock, movement.SourceDocumentType); Assert.Equal(draft.Id, movement.SourceDocumentId); Assert.NotNull(movement.SourceDocumentLineId); });

    await Assert.ThrowsAsync<ConflictException>(() => service.PostOpeningStockAsync(draft.Id, data.UserId, default));
    await Assert.ThrowsAsync<ConflictException>(() => service.UpdateOpeningStockAsync(draft.Id, edited, default));
    await Assert.ThrowsAsync<ConflictException>(() => service.DeleteOpeningStockAsync(draft.Id, default));

    var second = await service.CreateOpeningStockAsync(request with { Lines = [new(data.ProductAId, 8, 10)] }, data.UserId, default);
    Assert.Equal("OS-000002", second.DocumentNumber);
    await service.PostOpeningStockAsync(second.Id, data.UserId, default);
    Assert.Equal(6.4m, await AverageCostAsync(db, data.SourceWarehouseId, data.ProductAId));
  }

  [Fact]
  public async Task Creating_editing_and_deleting_a_draft_never_changes_stock()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new InventoryService(db);
    var request = new WarehouseTransferDraftRequest(data.BranchId, data.SourceWarehouseId, data.DestinationWarehouseId, DateOnly.FromDateTime(DateTime.UtcNow), null, [new(data.ProductAId, 1)]);
    var draft = await service.CreateTransferAsync(request, data.UserId, default);
    await service.UpdateTransferAsync(draft.Id, request with { Notes = "Reviewed", Lines = [new(data.ProductAId, 2)] }, default);
    await service.DeleteTransferAsync(draft.Id, default);
    Assert.Empty(db.StockMovements);
    Assert.Empty(db.WarehouseTransferDocuments);
  }

  [Fact]
  public async Task Physical_count_adjustment_calculates_differences_and_skips_zero_lines()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddOpeningBalanceAsync(db, data, data.ProductAId, 20, 10);
    await AddOpeningBalanceAsync(db, data, data.ProductBId, 30, 5);
    await AddOpeningBalanceAsync(db, data, data.ProductCId, 10, 2);
    var service = new InventoryService(db);
    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAdjustmentAsync(new(data.BranchId, data.SourceWarehouseId, DateOnly.FromDateTime(DateTime.UtcNow), "Invalid count", null, [new(data.ProductAId, -1)]), data.UserId, default));
    var draft = await service.CreateAdjustmentAsync(new(data.BranchId, data.SourceWarehouseId, DateOnly.FromDateTime(DateTime.UtcNow), "Physical count variance", "Counted by manager", [new(data.ProductAId, 18), new(data.ProductBId, 32), new(data.ProductCId, 10)]), data.UserId, default);
    var before = await db.StockMovements.CountAsync();

    var posted = await service.PostAdjustmentAsync(draft.Id, data.UserId, default);

    Assert.Equal([-2m, 2m, 0m], posted.Lines.OrderBy(x => x.SKU).Select(x => x.Difference).ToArray());
    Assert.Equal(before + 2, await db.StockMovements.CountAsync());
    Assert.Equal(18, await QuantityAsync(db, data.SourceWarehouseId, data.ProductAId));
    Assert.Equal(32, await QuantityAsync(db, data.SourceWarehouseId, data.ProductBId));
    Assert.Equal(10, await QuantityAsync(db, data.SourceWarehouseId, data.ProductCId));
    Assert.Equal(5, await AverageCostAsync(db, data.SourceWarehouseId, data.ProductBId));
    Assert.DoesNotContain(await db.StockMovements.Where(x => x.StockAdjustmentDocumentId == draft.Id).ToListAsync(), x => x.ProductId == data.ProductCId);
  }

  [Fact]
  public async Task Invalid_transfer_line_prevents_partial_post_and_valid_transfer_preserves_company_stock_and_value()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddOpeningBalanceAsync(db, data, data.ProductAId, 10, 7);
    await AddOpeningBalanceAsync(db, data, data.ProductBId, 2, 3);
    var service = new InventoryService(db);
    var invalid = await service.CreateTransferAsync(new(data.BranchId, data.SourceWarehouseId, data.DestinationWarehouseId, DateOnly.FromDateTime(DateTime.UtcNow), null, [new(data.ProductAId, 4), new(data.ProductBId, 3)]), data.UserId, default);
    var movementCount = await db.StockMovements.CountAsync();

    await Assert.ThrowsAsync<BadRequestException>(() => service.PostTransferAsync(invalid.Id, data.UserId, default));
    Assert.Equal(movementCount, await db.StockMovements.CountAsync());
    Assert.Equal(InventoryDocumentStatus.Draft, (await db.WarehouseTransferDocuments.FindAsync(invalid.Id))!.Status);

    var valid = await service.CreateTransferAsync(new(data.BranchId, data.SourceWarehouseId, data.DestinationWarehouseId, DateOnly.FromDateTime(DateTime.UtcNow), "Replenishment", [new(data.ProductAId, 4), new(data.ProductBId, 1)]), data.UserId, default);
    var companyQuantityBefore = await db.StockMovements.SumAsync(x => x.QuantityIn - x.QuantityOut);
    var companyValueBefore = await db.StockMovements.SumAsync(x => x.QuantityIn * x.UnitCostBase - x.QuantityOut * x.UnitCostBase);
    await service.PostTransferAsync(valid.Id, data.UserId, default);

    Assert.Equal(companyQuantityBefore, await db.StockMovements.SumAsync(x => x.QuantityIn - x.QuantityOut));
    Assert.Equal(companyValueBefore, await db.StockMovements.SumAsync(x => x.QuantityIn * x.UnitCostBase - x.QuantityOut * x.UnitCostBase));
    Assert.Equal(6, await QuantityAsync(db, data.SourceWarehouseId, data.ProductAId));
    Assert.Equal(4, await QuantityAsync(db, data.DestinationWarehouseId, data.ProductAId));
    Assert.Equal(4, await db.StockMovements.CountAsync(x => x.WarehouseTransferDocumentId == valid.Id));
    Assert.All(await db.StockMovements.Where(x => x.WarehouseTransferDocumentId == valid.Id).ToListAsync(), x => Assert.NotNull(x.WarehouseTransferLineId));
  }

  [Fact]
  public async Task Invalid_product_at_post_time_leaves_opening_document_and_ledger_unchanged()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new InventoryService(db);
    var draft = await service.CreateOpeningStockAsync(new(data.BranchId, data.SourceWarehouseId, DateOnly.FromDateTime(DateTime.UtcNow), [new(data.ProductAId, 1, 1), new(data.ProductBId, 1, 1)], null), data.UserId, default);
    (await db.Products.FindAsync(data.ProductBId))!.IsActive = false;
    await db.SaveChangesAsync();

    await Assert.ThrowsAsync<BadRequestException>(() => service.PostOpeningStockAsync(draft.Id, data.UserId, default));

    Assert.Empty(db.StockMovements);
    Assert.Equal(InventoryDocumentStatus.Draft, (await db.OpeningStockDocuments.FindAsync(draft.Id))!.Status);
  }

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
    return new AppDbContext(options);
  }

  private static async Task<TestData> SeedAsync(AppDbContext db)
  {
    var user = new UserEntity { Username = "manager", PasswordHash = "test", Role = UserRole.Manager };
    var branch = new BranchEntity { Code = "MAIN", Name = "Main", Address = "A", City = "C", Region = "R", Country = "IQ", IsMainBranch = true };
    var category = new ProductCategoryEntity { Name = "Retail" };
    var unit = new UnitOfMeasureEntity { Name = "Piece", Code = "PC" };
    var source = new WarehouseEntity { Code = "MAIN", Name = "Main Warehouse", Branch = branch };
    var destination = new WarehouseEntity { Code = "SECOND", Name = "Second Warehouse", Branch = branch };
    var a = new ProductEntity { Name = "A", SKU = "A", Category = category, UnitOfMeasure = unit, TrackInventory = true };
    var b = new ProductEntity { Name = "B", SKU = "B", Category = category, UnitOfMeasure = unit, TrackInventory = true };
    var c = new ProductEntity { Name = "C", SKU = "C", Category = category, UnitOfMeasure = unit, TrackInventory = true };
    db.AddRange(user, branch, category, unit, source, destination, a, b, c);
    await db.SaveChangesAsync();
    return new(user.Id, branch.Id, source.Id, destination.Id, a.Id, b.Id, c.Id);
  }

  private static async Task AddOpeningBalanceAsync(AppDbContext db, TestData data, Guid productId, decimal quantity, decimal cost)
  {
    db.StockMovements.Add(new StockMovementEntity { ProductId = productId, WarehouseId = data.SourceWarehouseId, MovementDate = DateOnly.FromDateTime(DateTime.UtcNow), Type = StockMovementType.OpeningStock, QuantityIn = quantity, UnitCostBase = cost, PerformedByUserId = data.UserId });
    await db.SaveChangesAsync();
  }

  private static Task<decimal> QuantityAsync(AppDbContext db, Guid warehouseId, Guid productId) => db.StockMovements.Where(x => x.WarehouseId == warehouseId && x.ProductId == productId).SumAsync(x => x.QuantityIn - x.QuantityOut);
  private static async Task<decimal> AverageCostAsync(AppDbContext db, Guid warehouseId, Guid productId) { var movements = db.StockMovements.Where(x => x.WarehouseId == warehouseId && x.ProductId == productId); var quantity = await movements.SumAsync(x => x.QuantityIn - x.QuantityOut); return await movements.SumAsync(x => x.QuantityIn * x.UnitCostBase - x.QuantityOut * x.UnitCostBase) / quantity; }
  private sealed record TestData(Guid UserId, Guid BranchId, Guid SourceWarehouseId, Guid DestinationWarehouseId, Guid ProductAId, Guid ProductBId, Guid ProductCId);
}
