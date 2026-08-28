using Api.Infrastructure.Http;
using Api.Modules.Inventory;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class ItemMasterTests
{
  [Fact]
  public async Task Categories_and_subcategories_are_created_filtered_and_relationship_validated()
  {
    await using var db = CreateDb();
    var service = new InventoryService(db);
    var beverages = await service.CreateCategoryAsync(new("Beverages"), default);
    var beauty = await service.CreateCategoryAsync(new("Beauty Products"), default);
    var softDrinks = await service.CreateSubcategoryAsync(
      new("Soft Drinks", beverages.Id), default);

    var filtered = await service.GetSubcategoriesAsync(
      new SubcategoryListQuery { CategoryId = beverages.Id }, default);

    Assert.Single(filtered.Items);
    Assert.Equal(softDrinks.Id, filtered.Items[0].Id);
    Assert.Equal("Beverages", filtered.Items[0].CategoryName);

    var piece = await service.CreateUnitAsync(new("Piece", "PCS"), default);
    var invalid = ProductRequest(beauty.Id, softDrinks.Id, piece.Id);
    var error = await Assert.ThrowsAsync<BadRequestException>(
      () => service.CreateProductAsync(invalid, default));

    Assert.Equal(ErrorCodes.Inventory.SubcategoryInvalid, error.Code);

    var product = await service.CreateProductAsync(
      ProductRequest(beverages.Id, softDrinks.Id, piece.Id), default);
    var products = await service.GetProductsAsync(new ProductListQuery
    {
      CategoryId = beverages.Id,
      SubcategoryId = softDrinks.Id
    }, default);
    Assert.Single(products.Items);
    Assert.Equal(product.Id, products.Items[0].Id);
    Assert.Equal("Soft Drinks", products.Items[0].SubcategoryName);

    var inUse = await Assert.ThrowsAsync<BadRequestException>(
      () => service.DeleteCategoryAsync(beverages.Id, default));
    Assert.Equal(ErrorCodes.Inventory.CategoryInUse, inUse.Code);
  }

  [Fact]
  public async Task Product_supports_multiply_and_divide_item_specific_conversions()
  {
    await using var db = CreateDb();
    var service = new InventoryService(db);
    var category = await service.CreateCategoryAsync(new("Beverages"), default);
    var piece = await service.CreateUnitAsync(new("Piece", "PCS"), default);
    var carton = await service.CreateUnitAsync(new("Carton", "CTN"), default);
    var gram = await service.CreateUnitAsync(new("Gram", "G"), default);
    var inactive = await service.CreateUnitAsync(new("Pallet", "PAL", false), default);

    var product = await service.CreateProductAsync(
      ProductRequest(
        category.Id,
        null,
        piece.Id,
        [
          new ProductUnitConversionRequest(carton.Id, UnitConversionOperation.Multiply, 24),
          new ProductUnitConversionRequest(gram.Id, UnitConversionOperation.Divide, 1000)
        ]),
      default);

    Assert.Equal(100, product.PurchasePriceBase);
    Assert.Equal("Piece", product.UnitName);
    Assert.Collection(
      product.UnitConversions.OrderBy(x => x.UnitCode),
      conversion =>
      {
        Assert.Equal("CTN", conversion.UnitCode);
        Assert.Equal(UnitConversionOperation.Multiply, conversion.Operation);
        Assert.Equal(24, conversion.Factor);
      },
      conversion =>
      {
        Assert.Equal("G", conversion.UnitCode);
        Assert.Equal(UnitConversionOperation.Divide, conversion.Operation);
        Assert.Equal(1000, conversion.Factor);
      });

    var duplicate = ProductRequest(
      category.Id,
      null,
      piece.Id,
      [
        new ProductUnitConversionRequest(carton.Id, UnitConversionOperation.Multiply, 24),
        new ProductUnitConversionRequest(carton.Id, UnitConversionOperation.Multiply, 12)
      ]) with { SKU = "DUPLICATE" };
    var duplicateError = await Assert.ThrowsAsync<ConflictException>(
      () => service.CreateProductAsync(duplicate, default));
    Assert.Equal(ErrorCodes.Inventory.UnitConversionDuplicate, duplicateError.Code);

    var baseUnit = ProductRequest(
      category.Id,
      null,
      piece.Id,
      [new ProductUnitConversionRequest(piece.Id, UnitConversionOperation.Multiply, 1)]) with { SKU = "BASE" };
    var baseError = await Assert.ThrowsAsync<BadRequestException>(
      () => service.CreateProductAsync(baseUnit, default));
    Assert.Equal(ErrorCodes.Inventory.UnitConversionInvalid, baseError.Code);

    var inactiveUnit = ProductRequest(
      category.Id,
      null,
      piece.Id,
      [new ProductUnitConversionRequest(inactive.Id, UnitConversionOperation.Multiply, 1024)]) with { SKU = "INACTIVE" };
    var inactiveError = await Assert.ThrowsAsync<BadRequestException>(
      () => service.CreateProductAsync(inactiveUnit, default));
    Assert.Equal(ErrorCodes.Inventory.UnitInvalid, inactiveError.Code);
  }

  [Fact]
  public async Task Base_unit_can_change_before_history_but_not_after_history_exists()
  {
    await using var db = CreateDb();
    var service = new InventoryService(db);
    var category = await service.CreateCategoryAsync(new("Beverages"), default);
    var piece = await service.CreateUnitAsync(new("Piece", "PCS"), default);
    var carton = await service.CreateUnitAsync(new("Carton", "CTN"), default);
    var created = await service.CreateProductAsync(
      ProductRequest(category.Id, null, piece.Id), default);

    var changed = await service.UpdateProductAsync(
      created.Id,
      UpdateRequest(category.Id, carton.Id),
      default);
    Assert.Equal(carton.Id, changed.UnitOfMeasureId);

    db.StockMovements.Add(new StockMovementEntity
    {
      ProductId = created.Id,
      WarehouseId = Guid.NewGuid(),
      PerformedByUserId = Guid.NewGuid(),
      MovementDate = DateOnly.FromDateTime(DateTime.UtcNow),
      Type = StockMovementType.OpeningStock,
      QuantityIn = 1,
      UnitCostBase = 100
    });
    await db.SaveChangesAsync();

    var error = await Assert.ThrowsAsync<BadRequestException>(
      () => service.UpdateProductAsync(
        created.Id,
        UpdateRequest(category.Id, piece.Id),
        default));

    Assert.Equal(ErrorCodes.Inventory.BaseUnitChangeNotAllowed, error.Code);
    Assert.Equal(carton.Id, (await db.Products.FindAsync(created.Id))!.UnitOfMeasureId);
  }

  [Fact]
  public async Task Updating_product_replaces_existing_unit_conversions()
  {
    await using var db = CreateDb();
    var service = new InventoryService(db);
    var category = await service.CreateCategoryAsync(new("Beverages"), default);
    var piece = await service.CreateUnitAsync(new("Piece", "PCS"), default);
    var carton = await service.CreateUnitAsync(new("Carton", "CTN"), default);
    var created = await service.CreateProductAsync(
      ProductRequest(
        category.Id,
        null,
        piece.Id,
        [new ProductUnitConversionRequest(carton.Id, UnitConversionOperation.Multiply, 24)]),
      default);

    var updated = await service.UpdateProductAsync(
      created.Id,
      UpdateRequest(category.Id, piece.Id) with
      {
        UnitConversions =
        [
          new ProductUnitConversionRequest(
            carton.Id,
            UnitConversionOperation.Multiply,
            12)
        ]
      },
      default);

    var conversion = Assert.Single(updated.UnitConversions);
    Assert.Equal(Assert.Single(created.UnitConversions).Id, conversion.Id);
    Assert.Equal(carton.Id, conversion.UnitOfMeasureId);
    Assert.Equal(12, conversion.Factor);
    Assert.Single(await db.ProductUnitConversions.Where(x => x.ProductId == created.Id).ToListAsync());
  }

  private static CreateProductRequest ProductRequest(
    Guid categoryId,
    Guid? subcategoryId,
    Guid unitId,
    IReadOnlyList<ProductUnitConversionRequest>? conversions = null) => new(
      "Coca Cola 250ml",
      "COKE-250",
      null,
      categoryId,
      subcategoryId,
      unitId,
      ProductPurpose.Resale,
      100,
      150,
      true,
      true,
      null,
      null,
      conversions);

  private static UpdateProductRequest UpdateRequest(Guid categoryId, Guid unitId) => new(
    "Coca Cola 250ml",
    "COKE-250",
    null,
    categoryId,
    null,
    unitId,
    ProductPurpose.Resale,
    100,
    150,
    true,
    true,
    null,
    null);

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new AppDbContext(options);
  }
}
