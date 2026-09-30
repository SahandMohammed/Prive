using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed class SalesWorkflowTests
{
  [Fact]
  public void Posted_invoice_endpoints_use_existing_manager_and_superadmin_roles()
  {
    Assert.Equal("SuperAdmin,Manager",
      typeof(SalesController).GetCustomAttributes(typeof(AuthorizeAttribute), true)
        .Cast<AuthorizeAttribute>().Single().Roles);
    var deleteRoles = typeof(SalesController).GetMethod(nameof(SalesController.DeletePostedInvoice))!
      .GetCustomAttributes(typeof(AuthorizeAttribute), true)
      .Cast<AuthorizeAttribute>().Single().Roles;
    Assert.Equal("SuperAdmin", deleteRoles);
  }

  [Fact]
  public void Active_invoice_endpoints_use_existing_manager_and_superadmin_roles()
  {
    var deleteRoles = typeof(SalesController).GetMethod(nameof(SalesController.DeleteActiveInvoice))!
      .GetCustomAttributes(typeof(AuthorizeAttribute), true)
      .Cast<AuthorizeAttribute>().Single().Roles;

    Assert.Equal("SuperAdmin", deleteRoles);
    Assert.NotNull(typeof(SalesController).GetMethod(nameof(SalesController.CreateActiveInvoice)));
    Assert.NotNull(typeof(SalesController).GetMethod(nameof(SalesController.UpdateActiveInvoice)));
  }

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
    var request = Request(data, data.CustomerId, data.BaseCurrencyId, null,
      [ServiceLine(data, 1, 25_000), ProductLine(data, 2, 15_000)]);
    var movementCount = await db.StockMovements.CountAsync();

    var draft = await service.CreateInvoiceAsync(request, data.UserId, default);
    Assert.Equal("SI-000001", draft.DocumentNumber);
    Assert.Equal(SalesInvoiceStatus.Draft, draft.Status);
    Assert.Equal(data.CustomerId, draft.CustomerId);
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
  public async Task Active_create_generates_effects_and_one_created_activity_without_a_post_step()
  {
    var branchContext = new BranchContext();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    await using var db = new AppDbContext(options, branchContext);
    var data = await SeedAsync(db);
    branchContext.BranchId = data.BranchId;
    await AddStockAsync(db, data, 10, 10);

    var created = await CreateService(db).CreateActiveInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null,
        [ServiceLine(data, 1, 25_000), ProductLine(data, 2, 15_000)]),
      data.UserId,
      default);

    Assert.Equal(SalesInvoiceStatus.Posted, created.Status);
    Assert.Equal("SI-000001", created.DocumentNumber);
    Assert.NotNull(created.JournalEntryId);
    Assert.Single(created.StockMovementIds);
    Assert.Equal(8, await QuantityAsync(db, data.WarehouseId, data.ProductId));

    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync();
    Assert.Equal(55_020, journal.Lines.Sum(line => line.DebitBaseAmount));
    Assert.Equal(55_020, journal.Lines.Sum(line => line.CreditBaseAmount));
    Assert.Equal(55_000, journal.Lines.Single(line => line.AccountId == data.ReceivableAccountId).DebitBaseAmount);
    Assert.Equal(25_000, journal.Lines.Single(line => line.AccountId == data.ServiceRevenueAccountId).CreditBaseAmount);
    Assert.Equal(30_000, journal.Lines.Single(line => line.AccountId == data.ProductRevenueAccountId).CreditBaseAmount);
    Assert.Equal(20, journal.Lines.Single(line => line.AccountId == data.CostOfGoodsSoldAccountId).DebitBaseAmount);
    Assert.Equal(20, journal.Lines.Single(line => line.AccountId == data.InventoryAccountId).CreditBaseAmount);
    var activities = await db.ActivityLogs.Where(log => log.EntityId == created.Id).ToListAsync();
    var activity = Assert.Single(activities);
    Assert.Equal("created", activity.Action);
    Assert.Equal("Created sales invoice", activity.Description);
    Assert.DoesNotContain(activities, log => log.Action == "posted");
  }

  [Fact]
  public async Task Active_create_save_failure_rolls_back_invoice_effects_and_activity()
  {
    await using var connection = new SqliteConnection("Data Source=:memory:");
    await connection.OpenAsync();
    var failure = new FailActiveInvoiceSaveInterceptor();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseSqlite(connection)
      .AddInterceptors(failure)
      .Options;
    var branchContext = new BranchContext();
    int movementCount;

    await using (var db = new AppDbContext(options, branchContext))
    {
      await db.Database.EnsureCreatedAsync();
      var data = await SeedAsync(db);
      branchContext.BranchId = data.BranchId;
      await AddStockAsync(db, data, 10, 10);
      movementCount = await db.StockMovements.CountAsync();
      failure.Enabled = true;

      await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService(db).CreateActiveInvoiceAsync(
        Request(data, data.CustomerId, data.BaseCurrencyId, null, [ProductLine(data, 2, 15_000)]),
        data.UserId,
        default));
    }

    var freshOptions = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options;
    await using var fresh = new AppDbContext(freshOptions);
    Assert.Empty(await fresh.SalesInvoices.ToListAsync());
    Assert.Empty(await fresh.JournalEntries.ToListAsync());
    Assert.Equal(movementCount, await fresh.StockMovements.CountAsync());
    Assert.Empty(await fresh.ActivityLogs.ToListAsync());
  }

  [Fact]
  public async Task Active_create_effect_preparation_failure_leaves_no_persisted_invoice_or_effects()
  {
    await using var connection = new SqliteConnection("Data Source=:memory:");
    await connection.OpenAsync();
    var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options;
    var branchContext = new BranchContext();

    await using (var db = new AppDbContext(options, branchContext))
    {
      await db.Database.EnsureCreatedAsync();
      var data = await SeedAsync(db);
      branchContext.BranchId = data.BranchId;

      var error = await Assert.ThrowsAsync<BadRequestException>(() => CreateService(db).CreateActiveInvoiceAsync(
        Request(data, data.CustomerId, data.BaseCurrencyId, null, [ProductLine(data, 1, 15_000)]),
        data.UserId,
        default));

      Assert.Equal(ErrorCodes.Sales.InsufficientStock, error.Code);
    }

    await using var fresh = new AppDbContext(options);
    Assert.Empty(await fresh.SalesInvoices.ToListAsync());
    Assert.Empty(await fresh.SalesInvoiceLines.ToListAsync());
    Assert.Empty(await fresh.JournalEntries.ToListAsync());
    Assert.Empty(await fresh.StockMovements.ToListAsync());
    Assert.Empty(await fresh.ActivityLogs.ToListAsync());
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
  public async Task Converted_product_sale_posts_base_quantity_revenue_and_weighted_average_cogs()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 100, 2_500);
    var carton = new UnitOfMeasureEntity { Name = "Box", Code = "BOX" };
    db.Add(carton);
    db.ProductUnitConversions.Add(new ProductUnitConversionEntity
    {
      ProductId = data.ProductId,
      UnitOfMeasure = carton,
      Operation = UnitConversionOperation.Multiply,
      Factor = 24
    });
    await db.SaveChangesAsync();

    var selectedUnitPrice = UnitConversionCalculator.ConvertBasePriceToUnitPrice(
      4_000,
      UnitConversionOperation.Multiply,
      24);
    var service = CreateService(db);
    var draft = await service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null,
        [new SalesInvoiceLineRequest(
          SalesLineType.Product,
          null,
          data.ProductId,
          carton.Id,
          null,
          2,
          selectedUnitPrice)]),
      data.UserId,
      default);

    var line = Assert.Single(draft.Lines);
    Assert.Equal(96_000, line.UnitPrice);
    Assert.Equal(48, line.BaseQuantity);
    Assert.Equal(4_000, line.BaseUnitPrice);
    Assert.Equal(192_000, line.LineAmount);

    var posted = await service.PostInvoiceAsync(draft.Id, data.UserId, default);
    var movement = await db.StockMovements.SingleAsync(item => item.SalesInvoiceId == posted.Id);
    Assert.Equal(48, movement.QuantityOut);
    Assert.Equal(52, await QuantityAsync(db, data.WarehouseId, data.ProductId));
    var journal = await db.JournalEntries.Include(item => item.Lines)
      .SingleAsync(item => item.Id == posted.JournalEntryId);
    Assert.Equal(192_000, journal.Lines.Single(item => item.AccountId == data.ProductRevenueAccountId).CreditBaseAmount);
    Assert.Equal(120_000, journal.Lines.Single(item => item.AccountId == data.CostOfGoodsSoldAccountId).DebitBaseAmount);
  }

  [Fact]
  public async Task Master_service_and_product_prices_resolve_effective_rate_and_post_original_and_base_values()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    (await db.Products.FindAsync(data.ProductId))!.SellingPriceBase = 4_000;
    await AddStockAsync(db, data, 100, 2_500);
    var box = new UnitOfMeasureEntity { Name = "Box", Code = "BOX" };
    db.Add(box);
    db.ProductUnitConversions.Add(new ProductUnitConversionEntity
    {
      ProductId = data.ProductId,
      UnitOfMeasure = box,
      Operation = UnitConversionOperation.Multiply,
      Factor = 24
    });
    db.ExchangeRates.Add(new ExchangeRateEntity
    {
      FromCurrencyId = data.ForeignCurrencyId,
      ToCurrencyId = data.BaseCurrencyId,
      Rate = 1_300,
      EffectiveAtUtc = DateTime.UtcNow.AddDays(-1),
      CreatedByUserId = data.UserId
    });
    await db.SaveChangesAsync();

    var service = CreateService(db);
    var draft = await service.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.ForeignCurrencyId, null,
      [
        new SalesInvoiceLineRequest(
          SalesLineType.Service, data.ServiceId, null, null, null, 1, 0,
          UseMasterPrice: true),
        new SalesInvoiceLineRequest(
          SalesLineType.Product, null, data.ProductId, box.Id, null, 2, 0,
          UseMasterPrice: true)
      ]),
      data.UserId,
      default);

    Assert.Equal(1_300, draft.ExchangeRate);
    var serviceLine = draft.Lines.Single(line => line.LineType == SalesLineType.Service);
    Assert.Equal(19.230769m, serviceLine.UnitPrice);
    Assert.Equal(25_000, serviceLine.BaseUnitPrice);
    Assert.Equal(25_000, serviceLine.BaseLineAmount);
    Assert.False(serviceLine.IsPriceOverridden);
    var productLine = draft.Lines.Single(line => line.LineType == SalesLineType.Product);
    Assert.Equal(73.846154m, productLine.UnitPrice);
    Assert.Equal(48, productLine.BaseQuantity);
    Assert.Equal(4_000, productLine.BaseUnitPrice);
    Assert.Equal(192_000, productLine.BaseLineAmount);
    Assert.Equal(217_000, draft.BaseTotal);

    var repriced = await service.UpdateInvoiceAsync(
      draft.Id,
      Request(data, data.CustomerId, data.ForeignCurrencyId, 1_310,
      [
        new SalesInvoiceLineRequest(
          SalesLineType.Service, data.ServiceId, null, null, null, 1, 0,
          UseMasterPrice: true),
        new SalesInvoiceLineRequest(
          SalesLineType.Product, null, data.ProductId, box.Id, null, 2, 0,
          UseMasterPrice: true)
      ]),
      default);
    Assert.Equal(19.083969m, repriced.Lines.Single(line => line.LineType == SalesLineType.Service).UnitPrice);
    Assert.Equal(73.282443m, repriced.Lines.Single(line => line.LineType == SalesLineType.Product).UnitPrice);
    Assert.Equal(217_000, repriced.BaseTotal);

    var posted = await service.PostInvoiceAsync(draft.Id, data.UserId, default);
    var movement = await db.StockMovements.SingleAsync(item => item.SalesInvoiceId == posted.Id);
    Assert.Equal(48, movement.QuantityOut);
    Assert.Equal(2_500, movement.UnitCostBase);
    var journal = await db.JournalEntries.Include(item => item.Lines).SingleAsync(item => item.Id == posted.JournalEntryId);
    Assert.Equal(posted.Total, journal.Lines.Single(item => item.AccountId == data.ReceivableAccountId).OriginalDebitAmount);
    Assert.Equal(217_000, journal.Lines.Single(item => item.AccountId == data.ReceivableAccountId).DebitBaseAmount);
    Assert.Equal(25_000, journal.Lines.Single(item => item.AccountId == data.ServiceRevenueAccountId).CreditBaseAmount);
    Assert.Equal(192_000, journal.Lines.Single(item => item.AccountId == data.ProductRevenueAccountId).CreditBaseAmount);
    Assert.Equal(120_000, journal.Lines.Single(item => item.AccountId == data.CostOfGoodsSoldAccountId).DebitBaseAmount);
    Assert.Equal(journal.Lines.Sum(item => item.DebitBaseAmount), journal.Lines.Sum(item => item.CreditBaseAmount));
  }

  [Fact]
  public async Task Manual_foreign_sales_price_preserves_transaction_specific_base_revenue()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var box = new UnitOfMeasureEntity { Name = "Box", Code = "BOX" };
    db.Add(box);
    db.ProductUnitConversions.Add(new ProductUnitConversionEntity
    {
      ProductId = data.ProductId,
      UnitOfMeasure = box,
      Operation = UnitConversionOperation.Multiply,
      Factor = 24
    });
    await db.SaveChangesAsync();

    var draft = await CreateService(db).CreateInvoiceAsync(
      Request(data, data.CustomerId, data.ForeignCurrencyId, 1_300,
        [new SalesInvoiceLineRequest(
          SalesLineType.Product, null, data.ProductId, box.Id, null, 2, 70)]),
      data.UserId,
      default);

    var line = Assert.Single(draft.Lines);
    Assert.True(line.IsPriceOverridden);
    Assert.Equal(70, line.UnitPrice);
    Assert.Equal(3_791.666667m, line.BaseUnitPrice);
    Assert.Equal(182_000, line.BaseLineAmount);
    Assert.Equal(182_000, draft.BaseTotal);
  }

  [Fact]
  public async Task Posting_revalidates_customer_service_product_and_product_purpose()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 10, 10);
    var service = CreateService(db);

    Assert.Equal(ErrorCodes.Sales.CustomerRequired,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateInvoiceAsync(
        Request(data, null, data.BaseCurrencyId, null, [ServiceLine(data, 1, 1)]), data.UserId, default))).Code);

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
    Assert.Equal(2, await db.SalesInvoices.CountAsync(invoice => invoice.Status == SalesInvoiceStatus.Draft));
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
  public async Task Posted_invoice_correction_preserves_identity_and_replaces_owned_effects_with_one_audit()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sales = CreateService(db);
    var draft = await sales.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ServiceLine(data, 1, 50_000)]),
      data.UserId,
      default);
    var posted = await sales.PostInvoiceAsync(draft.Id, data.UserId, default);
    var originalJournalId = posted.JournalEntryId;
    var originalPostedAtUtc = posted.PostedAtUtc;
    var originalCreatedAtUtc = posted.CreatedAtUtc;

    var corrected = await CreateCorrectionService(db).UpdateAsync(posted.Id,
      new UpdatePostedSalesInvoiceRequest(
        null,
        posted.UpdatedAtUtc,
        data.CustomerId,
        posted.InvoiceDate,
        data.BranchId,
        null,
        data.BaseCurrencyId,
        null,
        "Corrected",
        [ServiceLine(data, 1, 45_000)],
        null),
      data.UserId,
      default);

    Assert.Equal(posted.Id, corrected.Id);
    Assert.Equal(posted.DocumentNumber, corrected.DocumentNumber);
    Assert.Equal(originalPostedAtUtc, corrected.PostedAtUtc);
    Assert.Equal(originalCreatedAtUtc, corrected.CreatedAtUtc);
    Assert.Equal(45_000, corrected.Total);
    Assert.NotEqual(originalJournalId, corrected.JournalEntryId);
    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync();
    Assert.Equal(45_000, journal.Lines.Sum(line => line.DebitBaseAmount));
    Assert.Equal(45_000, journal.Lines.Sum(line => line.CreditBaseAmount));
    var audit = await db.ActivityLogs.SingleAsync(log => log.EntityId == posted.Id && log.Action == "edited");
    Assert.Null(audit.Reason);
    Assert.Contains("50000", audit.BeforeState);
    Assert.Contains("45000", audit.AfterState);
  }

  [Fact]
  public async Task Posted_invoice_correction_first_save_only_flushes_owned_effect_removal()
  {
    var interceptor = new CorrectionSaveObserver();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .AddInterceptors(interceptor)
      .Options;
    await using var db = new AppDbContext(options);
    var data = await SeedAsync(db);
    var sales = CreateService(db);
    var draft = await sales.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ServiceLine(data, 1, 50_000)]),
      data.UserId,
      default);
    var posted = await sales.PostInvoiceAsync(draft.Id, data.UserId, default);
    interceptor.Observations.Clear();
    interceptor.Enabled = true;

    await CreateCorrectionService(db).UpdateAsync(posted.Id,
      new UpdatePostedSalesInvoiceRequest(
        "Correct amount",
        posted.UpdatedAtUtc,
        data.CustomerId,
        posted.InvoiceDate,
        data.BranchId,
        null,
        data.BaseCurrencyId,
        null,
        null,
        [ServiceLine(data, 1, 45_000)],
        null),
      data.UserId,
      default);

    Assert.Equal(2, interceptor.Observations.Count);
    var first = interceptor.Observations[0];
    Assert.Equal(50_000, first.Total);
    Assert.False(first.IsDeleted);
    Assert.Equal(0, first.AddedActivityCount);
    Assert.Contains(nameof(SalesInvoiceEntity.JournalEntryId), first.ModifiedInvoiceProperties);
    Assert.DoesNotContain(nameof(SalesInvoiceEntity.Total), first.ModifiedInvoiceProperties);
    Assert.DoesNotContain(nameof(SalesInvoiceEntity.UpdatedAtUtc), first.ModifiedInvoiceProperties);
    var second = interceptor.Observations[1];
    Assert.Equal(45_000, second.Total);
    Assert.False(second.IsDeleted);
    Assert.Equal(1, second.AddedActivityCount);
  }

  [Fact]
  public async Task Posted_invoice_delete_first_save_does_not_apply_deletion_or_add_audit()
  {
    var interceptor = new CorrectionSaveObserver();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .AddInterceptors(interceptor)
      .Options;
    await using var db = new AppDbContext(options);
    var data = await SeedAsync(db);
    var sales = CreateService(db);
    var draft = await sales.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ServiceLine(data, 1, 50_000)]),
      data.UserId,
      default);
    var posted = await sales.PostInvoiceAsync(draft.Id, data.UserId, default);
    interceptor.Observations.Clear();
    interceptor.Enabled = true;

    await CreateCorrectionService(db).DeleteAsync(posted.Id,
      new DeletePostedSalesInvoiceRequest("Duplicate", posted.UpdatedAtUtc),
      data.UserId,
      default);

    Assert.Equal(2, interceptor.Observations.Count);
    var first = interceptor.Observations[0];
    Assert.False(first.IsDeleted);
    Assert.Equal(0, first.AddedActivityCount);
    Assert.Contains(nameof(SalesInvoiceEntity.JournalEntryId), first.ModifiedInvoiceProperties);
    Assert.DoesNotContain(nameof(SalesInvoiceEntity.IsDeleted), first.ModifiedInvoiceProperties);
    Assert.DoesNotContain(nameof(SalesInvoiceEntity.DeletedAtUtc), first.ModifiedInvoiceProperties);
    var second = interceptor.Observations[1];
    Assert.True(second.IsDeleted);
    Assert.Equal(1, second.AddedActivityCount);
  }

  [Fact]
  public async Task Posted_invoice_correction_failure_after_first_save_rolls_back_original_state()
  {
    await using var connection = new SqliteConnection("Data Source=:memory:");
    await connection.OpenAsync();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseSqlite(connection)
      .Options;
    Guid invoiceId;
    Guid journalId;
    Guid movementId;
    string documentNumber;
    DateTime updatedAtUtc;
    await using (var db = new AppDbContext(options))
    {
      await db.Database.EnsureCreatedAsync();
      var data = await SeedAsync(db);
      await AddStockAsync(db, data, 10, 10);
      var sales = CreateService(db);
      var draft = await sales.CreateInvoiceAsync(
        Request(data, data.CustomerId, data.BaseCurrencyId, null, [ProductLine(data, 2, 15_000)]),
        data.UserId,
        default);
      var posted = await sales.PostInvoiceAsync(draft.Id, data.UserId, default);
      invoiceId = posted.Id;
      journalId = posted.JournalEntryId!.Value;
      movementId = posted.StockMovementIds.Single();
      documentNumber = posted.DocumentNumber;
      updatedAtUtc = posted.UpdatedAtUtc;
      var requestUpdatedAtUtc = DateTime.SpecifyKind(posted.UpdatedAtUtc, DateTimeKind.Utc);

      var error = await Assert.ThrowsAsync<BadRequestException>(() => CreateCorrectionService(db).UpdateAsync(
        posted.Id,
        new UpdatePostedSalesInvoiceRequest(
          "Quantity entered incorrectly",
          requestUpdatedAtUtc,
          data.CustomerId,
          posted.InvoiceDate,
          data.BranchId,
          data.WarehouseId,
          data.BaseCurrencyId,
          null,
          posted.Notes,
          [ProductLine(data, 20, 15_000)],
          null),
        data.UserId,
        default));
      Assert.Equal(ErrorCodes.Sales.InsufficientStock, error.Code);
    }

    await using var fresh = new AppDbContext(options);
    var original = await fresh.SalesInvoices.Include(invoice => invoice.Lines)
      .SingleAsync(invoice => invoice.Id == invoiceId);
    Assert.Equal(documentNumber, original.DocumentNumber);
    Assert.Equal(updatedAtUtc, original.UpdatedAtUtc);
    Assert.Equal(30_000, original.Total);
    Assert.Equal(2, original.Lines.Single().Quantity);
    Assert.Equal(journalId, original.JournalEntryId);
    Assert.NotNull(await fresh.JournalEntries.FindAsync(journalId));
    var movement = await fresh.StockMovements.SingleAsync(item => item.Id == movementId);
    Assert.Equal(2, movement.QuantityOut);
    Assert.False(await fresh.ActivityLogs.AnyAsync(log => log.EntityId == invoiceId && log.Action == "edited"));
  }

  [Fact]
  public async Task Posted_invoice_delete_hides_invoice_preserves_lines_and_appends_audit()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 10, 10);
    var sales = CreateService(db);
    var draft = await sales.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ProductLine(data, 2, 15_000)]),
      data.UserId,
      default);
    var posted = await sales.PostInvoiceAsync(draft.Id, data.UserId, default);
    var lineIds = posted.Lines.Select(line => line.Id).ToList();

    var corrections = CreateCorrectionService(db);
    await corrections.DeleteAsync(posted.Id,
      new DeletePostedSalesInvoiceRequest("Duplicate sale", posted.UpdatedAtUtc),
      data.UserId,
      default);

    Assert.False(await db.SalesInvoices.AnyAsync(invoice => invoice.Id == posted.Id));
    var deleted = await db.SalesInvoices.IgnoreQueryFilters().SingleAsync(invoice => invoice.Id == posted.Id);
    Assert.True(deleted.IsDeleted);
    Assert.Equal("Duplicate sale", deleted.DeleteReason);
    Assert.Equal(data.UserId, deleted.DeletedByUserId);
    Assert.Equal(lineIds.Count, await db.SalesInvoiceLines.IgnoreQueryFilters()
      .CountAsync(line => line.SalesInvoiceId == posted.Id));
    Assert.False(await db.StockMovements.AnyAsync(movement => movement.SalesInvoiceId == posted.Id));
    Assert.False(await db.JournalEntries.AnyAsync(entry => entry.Id == posted.JournalEntryId));
    Assert.Single(await db.ActivityLogs.Where(log => log.EntityId == posted.Id && log.Action == "deleted").ToListAsync());
    Assert.Single(await corrections.GetHistoryAsync(posted.Id, default));
  }

  [Fact]
  public async Task Posted_invoice_correction_rejects_stale_timestamp()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sales = CreateService(db);
    var draft = await sales.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ServiceLine(data, 1, 50_000)]),
      data.UserId,
      default);
    var posted = await sales.PostInvoiceAsync(draft.Id, data.UserId, default);
    var request = new UpdatePostedSalesInvoiceRequest(
      "Correct amount",
      posted.UpdatedAtUtc,
      data.CustomerId,
      posted.InvoiceDate,
      data.BranchId,
      null,
      data.BaseCurrencyId,
      null,
      null,
      [ServiceLine(data, 1, 45_000)],
      null);
    var corrections = CreateCorrectionService(db);
    await corrections.UpdateAsync(posted.Id, request, data.UserId, default);

    var error = await Assert.ThrowsAsync<ConflictException>(() =>
      corrections.UpdateAsync(posted.Id, request, data.UserId, default));

    Assert.Equal(ErrorCodes.Sales.ConcurrencyConflict, error.Code);
  }

  [Fact]
  public async Task Posted_invoice_correction_is_blocked_by_customer_receipt()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sales = CreateService(db);
    var draft = await sales.CreateInvoiceAsync(
      Request(data, data.CustomerId, data.BaseCurrencyId, null, [ServiceLine(data, 1, 50_000)]),
      data.UserId,
      default);
    var posted = await sales.PostInvoiceAsync(draft.Id, data.UserId, default);
    var payment = new PaymentEntity
    {
      DocumentNumber = "PAY-000001",
      BranchId = data.BranchId,
      CustomerId = data.CustomerId,
      PaymentDate = posted.InvoiceDate,
      CurrencyId = data.BaseCurrencyId,
      BaseCurrencyId = data.BaseCurrencyId,
      Amount = 10_000,
      BaseAmount = 10_000,
      Origin = PaymentOrigin.CustomerReceipt,
      CreatedByUserId = data.UserId,
      JournalEntryId = Guid.NewGuid()
    };
    db.PaymentAllocations.Add(new PaymentAllocationEntity
    {
      Payment = payment,
      SalesInvoiceId = posted.Id,
      Amount = 10_000,
      BaseAmount = 10_000
    });
    await db.SaveChangesAsync();

    var error = await Assert.ThrowsAsync<ConflictException>(() => CreateCorrectionService(db).DeleteAsync(
      posted.Id,
      new DeletePostedSalesInvoiceRequest("Entered twice", posted.UpdatedAtUtc),
      data.UserId,
      default));

    Assert.Equal(ErrorCodes.Sales.InvoiceHasPayment, error.Code);
    Assert.Contains("active Payments", error.Message);
    Assert.NotNull(await db.SalesInvoices.FindAsync(posted.Id));
    Assert.NotNull(await db.JournalEntries.FindAsync(posted.JournalEntryId));
  }

  [Fact]
  public async Task Invoice_list_uses_shared_pagination_and_filters()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    for (var index = 0; index < 3; index++)
      await service.CreateActiveInvoiceAsync(
        Request(data, data.CustomerId, data.BaseCurrencyId, null, [ServiceLine(data, 1, index + 1)]),
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

  [Fact]
  public async Task Lines_without_explicit_line_type_or_unit_are_automatically_resolved_by_backend()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await AddStockAsync(db, data, 10, 10_000);
    var service = CreateService(db);

    // Create an invoice passing only ItemId for both a service and a product, omitting LineType and UnitOfMeasureId
    var request = new SalesInvoiceDraftRequest(
      data.CustomerId,
      DateOnly.FromDateTime(DateTime.UtcNow),
      data.BranchId,
      data.WarehouseId,
      data.BaseCurrencyId,
      null,
      "Unified line test",
      [
        new SalesInvoiceLineRequest(
          LineType: null,
          ServiceId: null,
          ProductId: null,
          UnitOfMeasureId: null,
          Description: "Service line via ItemId",
          Quantity: 1,
          UnitPrice: 25_000,
          ItemId: data.ServiceId),
        new SalesInvoiceLineRequest(
          LineType: null,
          ServiceId: null,
          ProductId: null,
          UnitOfMeasureId: null,
          Description: "Product line via ItemId",
          Quantity: 2,
          UnitPrice: 15_000,
          ItemId: data.ProductId),
      ]);

    var created = await service.CreateActiveInvoiceAsync(request, data.UserId, default);

    Assert.NotNull(created);
    Assert.Equal(2, created.Lines.Count);

    var serviceLine = created.Lines.Single(l => l.ServiceId == data.ServiceId);
    Assert.Equal(SalesLineType.Service, serviceLine.LineType);
    Assert.Null(serviceLine.ProductId);

    var productLine = created.Lines.Single(l => l.ProductId == data.ProductId);
    Assert.Equal(SalesLineType.Product, productLine.LineType);
    Assert.Null(productLine.ServiceId);
    Assert.Equal(data.UnitId, productLine.UnitOfMeasureId);
  }

  [Fact]
  public async Task Catalog_items_endpoint_returns_combined_services_and_products_with_search_support()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);

    // Unified query with no filter returns both
    var catalog = await service.GetCatalogItemsAsync(new SalesCatalogQuery { Page = 1, PageSize = 20 }, default);
    Assert.Equal(2, catalog.TotalCount);
    Assert.Contains(catalog.Items, item => item.Type == SalesLineType.Service && item.Id == data.ServiceId);
    Assert.Contains(catalog.Items, item => item.Type == SalesLineType.Product && item.Id == data.ProductId);

    // Search by name filters across services and products
    var haircutSearch = await service.GetCatalogItemsAsync(new SalesCatalogQuery { Search = "Haircut" }, default);
    Assert.Single(haircutSearch.Items);
    Assert.Equal(data.ServiceId, haircutSearch.Items[0].Id);

    var shampooSearch = await service.GetCatalogItemsAsync(new SalesCatalogQuery { Search = "SHAMPOO" }, default);
    Assert.Single(shampooSearch.Items);
    Assert.Equal(data.ProductId, shampooSearch.Items[0].Id);
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

  private static SalesInvoiceCorrectionService CreateCorrectionService(AppDbContext db)
  {
    var sales = CreateService(db);
    var finance = new FinanceService(db, Options.Create(new FinanceOptions()));
    var sessions = new PosSessionService(db, finance);
    return new SalesInvoiceCorrectionService(db, sales, new PosSettlementService(db, finance, sessions), sessions);
  }

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
    var walkInCustomer = new ContactEntity
    {
      Name = "Walk-in Customer", IsCustomer = true, IsActive = true, SystemRole = ContactSystemRole.WalkInCustomer
    };
    branch.WalkInCustomer = walkInCustomer;
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
    db.AddRange(user, iqd, usd, business, branch, walkInCustomer, customer, productCategory, unit, warehouse, product,
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

  private sealed class CorrectionSaveObserver : SaveChangesInterceptor
  {
    public List<CorrectionSaveObservation> Observations { get; } = [];
    public bool Enabled { get; set; }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
      DbContextEventData eventData,
      InterceptionResult<int> result,
      CancellationToken cancellationToken = default)
    {
      if (!Enabled) return base.SavingChangesAsync(eventData, result, cancellationToken);
      var context = eventData.Context!;
      var invoiceEntry = context.ChangeTracker.Entries<SalesInvoiceEntity>()
        .Single(entry => entry.State == EntityState.Modified);
      Observations.Add(new CorrectionSaveObservation(
        invoiceEntry.Entity.Total,
        invoiceEntry.Entity.IsDeleted,
        context.ChangeTracker.Entries<Api.Modules.Dashboard.ActivityLogEntity>()
          .Count(entry => entry.State == EntityState.Added),
        invoiceEntry.Properties.Where(property => property.IsModified)
          .Select(property => property.Metadata.Name).ToHashSet()));
      return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
  }

  private sealed record CorrectionSaveObservation(
    decimal Total,
    bool IsDeleted,
    int AddedActivityCount,
    HashSet<string> ModifiedInvoiceProperties);

  private sealed class FailActiveInvoiceSaveInterceptor : SaveChangesInterceptor
  {
    public bool Enabled { get; set; }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
      DbContextEventData eventData,
      InterceptionResult<int> result,
      CancellationToken cancellationToken = default)
    {
      if (Enabled && eventData.Context!.ChangeTracker.Entries<SalesInvoiceEntity>()
        .Any(entry => entry.State == EntityState.Added
          && entry.Entity.Status == SalesInvoiceStatus.Posted
          && entry.Entity.PosSale is null))
        throw new InvalidOperationException("Forced active invoice save failure.");

      return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
  }
}
