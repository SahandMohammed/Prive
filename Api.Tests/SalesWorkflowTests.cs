using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Inventory;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed class SalesWorkflowTests
{
  [Fact]
  public async Task Service_catalog_requires_revenue_account_and_preserves_base_price()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);

    var created = await service.CreateServiceAsync(
      new ServiceRequest("Massage", data.ServiceCategoryId, 50_000, 60, data.ServiceRevenueAccountId, true, "One hour"),
      default);

    Assert.Equal(50_000, created.SellingPriceBase);
    Assert.Equal(data.ServiceRevenueAccountId, created.RevenueAccountId);
    Assert.Equal("IQD", (await db.Businesses.Include(item => item.BaseCurrency).SingleAsync()).BaseCurrency.Code);

    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateServiceAsync(
      new ServiceRequest("Invalid", data.ServiceCategoryId, 1, 15, data.InventoryAccountId, true, null),
      default));
  }

  [Fact]
  public async Task Draft_create_edit_and_delete_have_no_inventory_or_accounting_effect()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 10, 10);
    var service = CreateService(db);
    var request = Request(data, null, data.BaseCurrencyId, null,
      [ServiceLine(data, 1, 25_000), ProductLine(data, 2, 15_000)]);
    var movementCount = await db.StockMovements.CountAsync();

    var draft = await service.CreateInvoiceAsync(request, data.UserId, default);
    Assert.Equal("SI-000001", draft.DocumentNumber);
    Assert.Equal(SalesInvoiceStatus.Draft, draft.Status);
    Assert.Null(draft.CustomerId);
    Assert.Equal(movementCount, await db.StockMovements.CountAsync());
    Assert.Empty(db.JournalEntries);

    await service.UpdateInvoiceAsync(draft.Id, request with
    {
      Lines = [ServiceLine(data, 2, 25_000), ProductLine(data, 1, 15_000)]
    }, default);
    Assert.Equal(movementCount, await db.StockMovements.CountAsync());
    Assert.Empty(db.JournalEntries);

    await service.DeleteInvoiceAsync(draft.Id, default);
    Assert.Empty(db.SalesInvoices);
    Assert.Equal(movementCount, await db.StockMovements.CountAsync());
    Assert.Empty(db.JournalEntries);
  }

  [Fact]
  public async Task Posting_service_only_sale_creates_receivable_and_revenue_without_inventory_or_cogs()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var draft = await service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, 999, [ServiceLine(data, 1, 25_000)]),
      data.UserId,
      default);

    var posted = await service.PostInvoiceAsync(draft.Id, data.UserId, default);

    Assert.Equal(SalesInvoiceStatus.Posted, posted.Status);
    Assert.Equal(1, posted.ExchangeRate);
    Assert.Empty(posted.StockMovementIds);
    Assert.Empty(db.StockMovements);
    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync();
    Assert.Equal(data.ReceivableAccountId, journal.Lines.Single(line => line.DebitBaseAmount > 0).AccountId);
    Assert.Equal(data.ServiceRevenueAccountId, journal.Lines.Single(line => line.CreditBaseAmount > 0).AccountId);
    Assert.Equal(25_000, journal.Lines.Sum(line => line.DebitBaseAmount));
    Assert.Equal(25_000, journal.Lines.Sum(line => line.CreditBaseAmount));
    Assert.DoesNotContain(journal.Lines, line => line.AccountId == data.CostOfGoodsSoldAccountId);
  }

  [Fact]
  public async Task Product_sale_uses_current_weighted_average_cost_and_reduces_stock()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 10, 8);
    await AddStockAsync(db, data, 10, 12);
    var service = CreateService(db);
    var draft = await service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ProductLine(data, 2, 15_000)]),
      data.UserId,
      default);

    var posted = await service.PostInvoiceAsync(draft.Id, data.UserId, default);

    Assert.Single(posted.StockMovementIds);
    Assert.Equal(18, await QuantityAsync(db, data.WarehouseId, data.ProductId));
    var movement = await db.StockMovements.SingleAsync(item => item.SalesInvoiceId == draft.Id);
    Assert.Equal(2, movement.QuantityOut);
    Assert.Equal(10, movement.UnitCostBase);
    Assert.NotNull(movement.SalesInvoiceLineId);

    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync();
    Assert.Equal(15_000 * 2, journal.Lines.Single(line => line.AccountId == data.ReceivableAccountId).DebitBaseAmount);
    Assert.Equal(15_000 * 2, journal.Lines.Single(line => line.AccountId == data.ProductRevenueAccountId).CreditBaseAmount);
    Assert.Equal(20, journal.Lines.Single(line => line.AccountId == data.CostOfGoodsSoldAccountId).DebitBaseAmount);
    Assert.Equal(20, journal.Lines.Single(line => line.AccountId == data.InventoryAccountId).CreditBaseAmount);
    Assert.Equal(journal.Lines.Sum(line => line.DebitBaseAmount), journal.Lines.Sum(line => line.CreditBaseAmount));
  }

  [Fact]
  public async Task Insufficient_stock_rejects_every_effect_of_mixed_posting()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 1, 10);
    var service = CreateService(db);
    var draft = await service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null,
        [ServiceLine(data, 1, 25_000), ProductLine(data, 2, 15_000)]),
      data.UserId,
      default);
    var movementCount = await db.StockMovements.CountAsync();

    var exception = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.PostInvoiceAsync(draft.Id, data.UserId, default));

    Assert.Equal(ErrorCodes.Sales.InsufficientStock, exception.Code);
    Assert.Empty(db.JournalEntries);
    Assert.Equal(movementCount, await db.StockMovements.CountAsync());
    Assert.Equal(1, await QuantityAsync(db, data.WarehouseId, data.ProductId));
    Assert.Equal(SalesInvoiceStatus.Draft, (await db.SalesInvoices.FindAsync(draft.Id))!.Status);
  }

  [Fact]
  public async Task Foreign_mixed_sale_preserves_original_and_base_values_with_traceability()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 10, 10);
    var service = CreateService(db);
    var lines = new List<SalesInvoiceLineRequest>
    {
      ServiceLine(data, 1, 60),
      ProductLine(data, 2, 20)
    };

    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.ForeignCurrencyId, null, lines), data.UserId, default));
    var draft = await service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.ForeignCurrencyId, 1_310, lines), data.UserId, default);
    var posted = await service.PostInvoiceAsync(draft.Id, data.UserId, default);

    Assert.Equal(100, posted.Total);
    Assert.Equal(131_000, posted.BaseTotal);
    Assert.Equal(1_310, posted.ExchangeRate);
    Assert.Single(posted.StockMovementIds);
    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync();
    Assert.Equal(draft.Id, journal.SourceSalesInvoice!.Id);
    Assert.Equal(100, journal.Lines.Single(line => line.AccountId == data.ReceivableAccountId).OriginalDebitAmount);
    Assert.Equal(131_000, journal.Lines.Single(line => line.AccountId == data.ReceivableAccountId).DebitBaseAmount);
    Assert.Equal(78_600, journal.Lines.Single(line => line.AccountId == data.ServiceRevenueAccountId).CreditBaseAmount);
    Assert.Equal(52_400, journal.Lines.Single(line => line.AccountId == data.ProductRevenueAccountId).CreditBaseAmount);

    var movement = await db.StockMovements.SingleAsync(item => item.SalesInvoiceId == draft.Id);
    Assert.Equal(posted.Lines.Single(line => line.LineType == SalesLineType.Product).Id, movement.SalesInvoiceLineId);
    Assert.Equal(10, movement.UnitCostBase);

    var ledger = await new InventoryService(db).GetMovementsAsync(
      new StockMovementListQuery { DocumentNumber = posted.DocumentNumber },
      default);
    Assert.Single(ledger.Items);
    Assert.Equal(InventoryDocumentType.SalesInvoice, ledger.Items[0].SourceDocumentType);
    Assert.Equal(posted.Id, ledger.Items[0].SourceDocumentId);
    Assert.Equal(posted.Lines.Single(line => line.LineType == SalesLineType.Product).Id, ledger.Items[0].SourceDocumentLineId);

    var accounting = await new AccountingService(db).GetJournalAsync(posted.JournalEntryId!.Value, default);
    Assert.Equal(posted.Id, accounting.SourceSalesInvoiceId);

    (await db.Businesses.SingleAsync()).BaseCurrencyId = data.ForeignCurrencyId;
    await db.SaveChangesAsync();
    var historical = await service.GetInvoiceAsync(draft.Id, default);
    Assert.Equal(data.BaseCurrencyId, historical.BaseCurrencyId);
    Assert.Equal(1_310, historical.ExchangeRate);
    Assert.Equal(131_000, historical.BaseTotal);
  }

  [Fact]
  public async Task Posting_revalidates_customer_service_product_and_product_purpose()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 10, 10);
    var service = CreateService(db);

    var anonymous = await service.CreateInvoiceAsync(
      Request(data, null, data.BaseCurrencyId, null, [ServiceLine(data, 1, 1)]), data.UserId, default);
    Assert.Equal(ErrorCodes.Sales.CustomerRequired,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.PostInvoiceAsync(anonymous.Id, data.UserId, default))).Code);

    var serviceDraft = await service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ServiceLine(data, 1, 1)]), data.UserId, default);
    (await db.Services.FindAsync(data.ServiceId))!.IsActive = false;
    await db.SaveChangesAsync();
    Assert.Equal(ErrorCodes.Sales.ServiceInvalid,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.PostInvoiceAsync(serviceDraft.Id, data.UserId, default))).Code);

    (await db.Services.FindAsync(data.ServiceId))!.IsActive = true;
    var productDraft = await service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ProductLine(data, 1, 1)]), data.UserId, default);
    (await db.Products.FindAsync(data.ProductId))!.Purpose = ProductPurpose.Consumable;
    await db.SaveChangesAsync();
    Assert.Equal(ErrorCodes.Sales.ProductInvalid,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.PostInvoiceAsync(productDraft.Id, data.UserId, default))).Code);

    Assert.Empty(db.JournalEntries);
    Assert.Equal(3, await db.SalesInvoices.CountAsync(invoice => invoice.Status == SalesInvoiceStatus.Draft));
  }

  [Fact]
  public async Task Posted_sale_is_immutable_and_its_journal_is_source_owned()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var request = Request(data, data.CustomerId, data.BaseCurrencyId, null, [ServiceLine(data, 1, 25_000)]);
    var draft = await service.CreateInvoiceAsync(request, data.UserId, default);
    var posted = await service.PostInvoiceAsync(draft.Id, data.UserId, default);

    await Assert.ThrowsAsync<ConflictException>(() => service.PostInvoiceAsync(draft.Id, data.UserId, default));
    await Assert.ThrowsAsync<ConflictException>(() => service.UpdateInvoiceAsync(draft.Id, request, default));
    await Assert.ThrowsAsync<ConflictException>(() => service.DeleteInvoiceAsync(draft.Id, default));

    var accounting = new AccountingService(db);
    var exception = await Assert.ThrowsAsync<BadRequestException>(() =>
      accounting.ReverseJournalAsync(posted.JournalEntryId!.Value, default));
    Assert.Equal(ErrorCodes.Sales.JournalDirectReversalNotAllowed, exception.Code);
    Assert.False(await db.JournalEntries.AnyAsync(entry => entry.ReversalOfJournalId == posted.JournalEntryId));
  }

  [Fact]
  public async Task Invoice_list_uses_shared_pagination_and_filters()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    for (var index = 0; index < 3; index++)
      await service.CreateInvoiceAsync(
        Request(data, null, data.BaseCurrencyId, null, [ServiceLine(data, 1, index + 1)]),
        data.UserId,
        default);

    var page = await service.GetInvoicesAsync(new SalesInvoiceListQuery
    {
      Page = 2,
      PageSize = 2,
      Search = "SI-"
    }, default);

    Assert.Single(page.Items);
    Assert.Equal(3, page.TotalCount);
    Assert.Equal(2, page.Page);
    Assert.Equal(2, page.TotalPages);
  }

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new AppDbContext(options);
  }

  private static SalesService CreateService(AppDbContext db) => new(
    db,
    Options.Create(new SalesOptions
    {
      AccountsReceivableAccountCode = "13214",
      ProductRevenueAccountCode = "4211",
      CostOfGoodsSoldAccountCode = "3641",
      InventoryAccountCode = "1317"
    }));

  private static SalesInvoiceDraftRequest Request(
    TestData data,
    Guid? customerId,
    Guid currencyId,
    decimal? exchangeRate,
    List<SalesInvoiceLineRequest> lines) => new(
      customerId,
      DateOnly.FromDateTime(DateTime.UtcNow),
      data.BranchId,
      lines.Any(line => line.LineType == SalesLineType.Product) ? data.WarehouseId : null,
      currencyId,
      exchangeRate,
      "Test sale",
      lines);

  private static SalesInvoiceLineRequest ServiceLine(TestData data, decimal quantity, decimal price) =>
    new(SalesLineType.Service, data.ServiceId, null, null, null, quantity, price);

  private static SalesInvoiceLineRequest ProductLine(TestData data, decimal quantity, decimal price) =>
    new(SalesLineType.Product, null, data.ProductId, data.UnitId, null, quantity, price);

  private static async Task AddStockAsync(AppDbContext db, TestData data, decimal quantity, decimal cost)
  {
    db.StockMovements.Add(new StockMovementEntity
    {
      ProductId = data.ProductId,
      WarehouseId = data.WarehouseId,
      Type = StockMovementType.OpeningStock,
      MovementDate = DateOnly.FromDateTime(DateTime.UtcNow),
      QuantityIn = quantity,
      UnitCostBase = cost,
      PerformedByUserId = data.UserId
    });
    await db.SaveChangesAsync();
  }

  private static Task<decimal> QuantityAsync(AppDbContext db, Guid warehouseId, Guid productId) =>
    db.StockMovements.Where(movement => movement.WarehouseId == warehouseId && movement.ProductId == productId)
      .SumAsync(movement => movement.QuantityIn - movement.QuantityOut);

  private static async Task<TestData> SeedAsync(AppDbContext db)
  {
    var user = new UserEntity { Username = "manager", PasswordHash = "test", Role = UserRole.Manager };
    var iqd = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD", DecimalPlaces = 0 };
    var usd = new CurrencyEntity { Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2 };
    var business = new BusinessEntity
    {
      Name = "Prive",
      PrimaryPhoneNumber = "1",
      Address = "A",
      City = "C",
      Region = "R",
      Country = "IQ",
      BaseCurrency = iqd,
      IsSetupCompleted = true
    };
    var branch = new BranchEntity
    {
      Code = "MAIN", Name = "Main", Address = "A", City = "C", Region = "R", Country = "IQ", IsMainBranch = true
    };
    var customer = new ContactEntity { Name = "Customer", IsCustomer = true, IsActive = true };
    var productCategory = new ProductCategoryEntity { Name = "Retail" };
    var unit = new UnitOfMeasureEntity { Name = "Piece", Code = "PC" };
    var warehouse = new WarehouseEntity { Code = "MAIN", Name = "Main Warehouse", Branch = branch };
    var product = new ProductEntity
    {
      Name = "Shampoo",
      SKU = "SHAMPOO",
      Category = productCategory,
      UnitOfMeasure = unit,
      Purpose = ProductPurpose.Resale,
      SellingPriceBase = 15_000,
      TrackInventory = true
    };
    var receivable = new AccountEntity { Code = "13214", Name = "Accounts Receivable", Classification = AccountClassification.Asset };
    var inventory = new AccountEntity { Code = "1317", Name = "Inventory", Classification = AccountClassification.Asset };
    var productRevenue = new AccountEntity { Code = "4211", Name = "Product Revenue", Classification = AccountClassification.Revenue };
    var serviceRevenue = new AccountEntity { Code = "43121", Name = "Service Revenue", Classification = AccountClassification.Revenue };
    var cogs = new AccountEntity { Code = "3641", Name = "COGS", Classification = AccountClassification.Expense };
    var serviceCategory = new ServiceCategoryEntity { Name = "Hair" };
    var salonService = new ServiceEntity
    {
      Name = "Classic Haircut",
      Category = serviceCategory,
      SellingPriceBase = 25_000,
      DurationMinutes = 30,
      RevenueAccount = serviceRevenue
    };
    db.AddRange(user, iqd, usd, business, branch, customer, productCategory, unit, warehouse, product,
      receivable, inventory, productRevenue, serviceRevenue, cogs, serviceCategory, salonService);
    await db.SaveChangesAsync();
    return new TestData(
      user.Id,
      customer.Id,
      branch.Id,
      warehouse.Id,
      iqd.Id,
      usd.Id,
      unit.Id,
      product.Id,
      serviceCategory.Id,
      salonService.Id,
      receivable.Id,
      inventory.Id,
      productRevenue.Id,
      serviceRevenue.Id,
      cogs.Id);
  }

  private sealed record TestData(
    Guid UserId,
    Guid CustomerId,
    Guid BranchId,
    Guid WarehouseId,
    Guid BaseCurrencyId,
    Guid ForeignCurrencyId,
    Guid UnitId,
    Guid ProductId,
    Guid ServiceCategoryId,
    Guid ServiceId,
    Guid ReceivableAccountId,
    Guid InventoryAccountId,
    Guid ProductRevenueAccountId,
    Guid ServiceRevenueAccountId,
    Guid CostOfGoodsSoldAccountId);
}
