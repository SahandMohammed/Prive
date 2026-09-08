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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed partial class PosWorkflowTests
{
  [Fact]
  public async Task Service_only_walk_in_posts_money_and_revenue_without_inventory_or_receivable()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var stockCount = await db.StockMovements.CountAsync();

    var sale = await service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]),
      data.CashierId,
      default);

    Assert.Equal("POS-000001", sale.DocumentNumber);
    Assert.Null(sale.CustomerId);
    Assert.Equal(25_000, sale.Total);
    Assert.Equal(25_000, sale.SettledBaseAmount);
    Assert.Equal(stockCount, await db.StockMovements.CountAsync());
    Assert.Equal(25_000, await PosBalanceAsync(db, data.IqdMoneyAccountId));
    var journal = await db.JournalEntries.Include(entry => entry.Lines)
      .SingleAsync(entry => entry.Id == sale.JournalEntryId);
    Assert.Equal(data.IqdMoneyGlId, journal.Lines.Single(line => line.DebitBaseAmount == 25_000).AccountId);
    Assert.Equal(data.ServiceRevenueGlId, journal.Lines.Single(line => line.CreditBaseAmount == 25_000).AccountId);
    Assert.DoesNotContain(journal.Lines, line => line.AccountId == data.ReceivableGlId);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.SalesInvoiceId, default);
    Assert.Equal(SalesInvoicePaymentStatus.Paid, invoice.PaymentStatus);
    Assert.Equal(0, invoice.OutstandingAmount);
  }

  [Fact]
  public async Task Product_and_service_share_one_sale_and_reuse_weighted_average_cogs()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    db.StockMovements.Add(new StockMovementEntity
    {
      ProductId = data.ProductId,
      WarehouseId = data.WarehouseId,
      Type = StockMovementType.OpeningStock,
      MovementDate = Today,
      QuantityIn = 10,
      UnitCostBase = 20,
      PerformedByUserId = data.CashierId
    });
    await db.SaveChangesAsync();
    var service = CreateService(db);

    var sale = await service.CompleteSaleAsync(
      Request(data, [ServiceLine(data), ProductLine(data, 2)], [new(data.IqdMoneyAccountId, 55_000)], data.CustomerId),
      data.CashierId,
      default);

    Assert.Equal(data.CustomerId, sale.CustomerId);
    Assert.Equal(2, sale.Lines.Count);
    Assert.Equal(data.ProfessionalId, sale.Lines.Single(line => line.LineType == SalesLineType.Service).ProfessionalUserId);
    Assert.Equal(18, await StockQuantityAsync(db, data));
    var movement = await db.StockMovements.SingleAsync(movement => movement.SalesInvoiceId == sale.SalesInvoiceId);
    Assert.Equal(15, movement.UnitCostBase);
    Assert.Equal(sale.StockMovementIds.Single(), movement.Id);
    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync(entry => entry.Id == sale.JournalEntryId);
    Assert.Equal(25_000, journal.Lines.Single(line => line.AccountId == data.ServiceRevenueGlId).CreditBaseAmount);
    Assert.Equal(30_000, journal.Lines.Single(line => line.AccountId == data.ProductRevenueGlId).CreditBaseAmount);
    Assert.Equal(30, journal.Lines.Single(line => line.AccountId == data.CogsGlId).DebitBaseAmount);
    Assert.Equal(30, journal.Lines.Single(line => line.AccountId == data.InventoryGlId).CreditBaseAmount);
    Assert.Equal(journal.Lines.Sum(line => line.DebitBaseAmount), journal.Lines.Sum(line => line.CreditBaseAmount));
  }

  [Fact]
  public async Task Pos_converted_product_unit_derives_price_and_posts_base_quantity()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db, stockQuantity: 100);
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
    var service = CreateService(db);

    var sale = await service.CompleteSaleAsync(
      Request(data, [ProductLine(data, 2, carton.Id)], [new(data.IqdMoneyAccountId, 720_000)]),
      data.CashierId,
      default);

    var line = Assert.Single(sale.Lines);
    Assert.Equal(carton.Id, line.UnitOfMeasureId);
    Assert.Equal(360_000, line.UnitPrice);
    Assert.Equal(48, line.BaseQuantity);
    Assert.Equal(15_000, line.BaseUnitPrice);
    Assert.Equal(720_000, line.LineTotal);
    Assert.Equal(52, await StockQuantityAsync(db, data));
    Assert.Equal(48, (await db.StockMovements.SingleAsync(item => item.SalesInvoiceId == sale.SalesInvoiceId)).QuantityOut);
  }

  [Fact]
  public async Task Mixed_iqd_usd_tender_preserves_physical_amounts_and_rate_snapshot()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    db.ExchangeRates.Add(new ExchangeRateEntity
    {
      FromCurrencyId = data.UsdCurrencyId,
      ToCurrencyId = data.IqdCurrencyId,
      Rate = 1_400,
      EffectiveAtUtc = DateTime.UtcNow.AddHours(1),
      CreatedByUserId = data.CashierId
    });
    await db.SaveChangesAsync();

    var sale = await service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)],
        [new(data.UsdMoneyAccountId, 10), new(data.IqdMoneyAccountId, 12_000)]),
      data.CashierId,
      default);

    Assert.Equal(25_000, sale.TenderedBaseAmount);
    var usd = sale.Tenders.Single(tender => tender.MoneyAccountId == data.UsdMoneyAccountId);
    Assert.Equal(10, usd.TenderedAmount);
    Assert.Equal(1_300, usd.ExchangeRate);
    Assert.Equal(13_000, usd.BaseAmount);
    Assert.Equal(10, await PosBalanceAsync(db, data.UsdMoneyAccountId));
    Assert.Equal(12_000, await PosBalanceAsync(db, data.IqdMoneyAccountId));

    (await db.ExchangeRates.OrderBy(rate => rate.EffectiveAtUtc).FirstAsync()).Rate = 1_500;
    await db.SaveChangesAsync();
    var historical = await service.GetSaleAsync(sale.Id, default);
    Assert.Equal(1_300, historical.Tenders.Single(tender => tender.MoneyAccountId == data.UsdMoneyAccountId).ExchangeRate);
  }

  [Fact]
  public async Task Foreign_tender_with_iqd_change_records_both_physical_movements()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db, iqdOpeningBalance: 200_000);
    var service = CreateService(db);

    var sale = await service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.UsdMoneyAccountId, 100)],
        change: new PosChangeRequest(data.IqdMoneyAccountId, 105_000)),
      data.CashierId,
      default);

    Assert.Equal(130_000, sale.TenderedBaseAmount);
    Assert.Equal(105_000, sale.ChangeBaseAmount);
    Assert.Equal(25_000, sale.SettledBaseAmount);
    Assert.Equal(100, await PosBalanceAsync(db, data.UsdMoneyAccountId));
    Assert.Equal(95_000, await PosBalanceAsync(db, data.IqdMoneyAccountId));
    var movements = await db.MoneyLedgerEntries.Where(entry => entry.SourceDocumentId == sale.Id)
      .OrderBy(entry => entry.Amount).ToListAsync();
    Assert.Equal([-105_000m, 100m], movements.Select(entry => entry.Amount).ToArray());
    Assert.All(movements, entry => Assert.Equal(MoneyLedgerSourceType.PosSale, entry.SourceType));
    Assert.All(movements, entry => Assert.Equal(sale.DocumentNumber, entry.DocumentNumber));
    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync(entry => entry.Id == sale.JournalEntryId);
    Assert.Equal(journal.Lines.Sum(line => line.DebitBaseAmount), journal.Lines.Sum(line => line.CreditBaseAmount));
    Assert.Equal(25_000, journal.Lines.Single(line => line.AccountId == data.ServiceRevenueGlId).CreditBaseAmount);
  }

  [Fact]
  public async Task Underpayment_and_unresolved_overpayment_leave_no_partial_effects()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var baselineJournals = await db.JournalEntries.CountAsync();
    var baselineLedger = await db.MoneyLedgerEntries.CountAsync();

    var under = await Assert.ThrowsAsync<BadRequestException>(() => service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 20_000)]), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.Underpayment, under.Code);
    var over = await Assert.ThrowsAsync<BadRequestException>(() => service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 30_000)]), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.ChangeRequired, over.Code);

    Assert.Empty(db.PosSales);
    Assert.Empty(db.SalesInvoices);
    Assert.Equal(baselineJournals, await db.JournalEntries.CountAsync());
    Assert.Equal(baselineLedger, await db.MoneyLedgerEntries.CountAsync());
  }

  [Fact]
  public async Task Posting_revalidates_stock_money_permissions_and_change_balance()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db, stockQuantity: 1, iqdOpeningBalance: 100_000);
    var service = CreateService(db);

    var stock = await Assert.ThrowsAsync<BadRequestException>(() => service.CompleteSaleAsync(
      Request(data, [ProductLine(data, 2)], [new(data.IqdMoneyAccountId, 30_000)]), data.CashierId, default));
    Assert.Equal(ErrorCodes.Sales.InsufficientStock, stock.Code);

    var viewOnly = await Assert.ThrowsAsync<ForbiddenException>(() => service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]) with { PosSessionId = data.ViewerSessionId }, data.ViewerId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountAccessDenied, viewOnly.Code);
    var noAccess = await Assert.ThrowsAsync<ForbiddenException>(() => service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]) with { PosSessionId = data.OutsideSessionId }, data.OutsideUserId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountAccessDenied, noAccess.Code);

    var balance = await Assert.ThrowsAsync<BadRequestException>(() => service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.UsdMoneyAccountId, 100)],
        change: new PosChangeRequest(data.IqdMoneyAccountId, 105_000)), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.ChangeBalanceInsufficient, balance.Code);
    Assert.Empty(db.PosSales);
    Assert.Empty(db.SalesInvoices);
  }

  [Fact]
  public async Task Pos_sources_are_traceable_and_journal_is_source_owned()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var sale = await service.CompleteSaleAsync(
      Request(data, [ProductLine(data)], [new(data.IqdMoneyAccountId, 15_000)], data.CustomerId),
      data.CashierId,
      default);

    var accounting = new AccountingService(db);
    var journal = await accounting.GetJournalAsync(sale.JournalEntryId, default);
    Assert.Equal(sale.Id, journal.SourcePosSaleId);
    var reversal = await Assert.ThrowsAsync<BadRequestException>(() =>
      accounting.ReverseJournalAsync(sale.JournalEntryId, default));
    Assert.Equal(ErrorCodes.Pos.JournalDirectReversalNotAllowed, reversal.Code);

    var inventory = await new InventoryService(db).GetMovementsAsync(
      new StockMovementListQuery { DocumentNumber = sale.DocumentNumber }, default);
    Assert.Single(inventory.Items);
    Assert.Equal(InventoryDocumentType.PosSale, inventory.Items[0].SourceDocumentType);
    Assert.Equal(sale.Id, inventory.Items[0].SourceDocumentId);
    Assert.Equal(sale.Lines.Single().Id, inventory.Items[0].SourceDocumentLineId);
    Assert.Equal(sale.Id, (await db.MoneyLedgerEntries.SingleAsync(entry => entry.SourceType == MoneyLedgerSourceType.PosSale)).SourceDocumentId);
    var finance = new FinanceService(db, Options.Create(new FinanceOptions
    {
      AccountsPayableAccountCode = "23214",
      AccountsReceivableAccountCode = "13214",
      OpeningBalanceEquityAccountCode = "261"
    }));
    Assert.Empty(await finance.GetOutstandingSalesInvoicesAsync(data.CustomerId, data.IqdCurrencyId, default));
  }

  [Fact]
  public async Task Setup_and_catalog_expose_only_operable_accounts_and_use_shared_pagination()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);

    var setup = await service.GetSetupAsync(data.CashierId, default);
    Assert.Equal(2, setup.MoneyAccounts.Count);
    Assert.Equal(1_300, setup.MoneyAccounts.Single(account => account.CurrencyId == data.UsdCurrencyId).CurrentExchangeRate);
    Assert.Contains(setup.Professionals, professional => professional.Id == data.ProfessionalId);
    var viewerSetup = await service.GetSetupAsync(data.ViewerId, default);
    Assert.Empty(viewerSetup.MoneyAccounts);

    var catalog = await service.GetCatalogAsync(new PosCatalogQuery
    {
      WarehouseId = data.WarehouseId,
      Page = 2,
      PageSize = 1
    }, default);
    Assert.Single(catalog.Items);
    Assert.Equal(2, catalog.TotalCount);
    Assert.Equal(2, catalog.Page);
    Assert.Equal(2, catalog.TotalPages);

    var services = await service.GetCatalogAsync(new PosCatalogQuery
    {
      ItemType = PosCatalogItemType.Service
    }, default);
    Assert.Single(services.Items);
    Assert.Equal(PosCatalogItemType.Service, services.Items[0].ItemType);

    var products = await service.GetCatalogAsync(new PosCatalogQuery
    {
      ItemType = PosCatalogItemType.Product,
      WarehouseId = data.WarehouseId
    }, default);
    Assert.Single(products.Items);
    Assert.Equal(PosCatalogItemType.Product, products.Items[0].ItemType);
  }

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new AppDbContext(options, new BranchContext { BranchId = Guid.NewGuid() });
  }

  private static PosService CreateService(AppDbContext db)
  {
    var sales = new SalesService(db, SalesOptions());
    var finance = new FinanceService(db, Options.Create(new FinanceOptions
    {
      AccountsPayableAccountCode = "23214",
      AccountsReceivableAccountCode = "13214",
      OpeningBalanceEquityAccountCode = "261"
    }));
    return new PosService(db, sales, finance, new PosSessionService(db, finance));
  }

  private static PosSessionService CreateSessionService(AppDbContext db) =>
    new(db, new FinanceService(db, Options.Create(new FinanceOptions())));

  private static IOptions<SalesOptions> SalesOptions() => Options.Create(new SalesOptions
  {
    AccountsReceivableAccountCode = "13214",
    ProductRevenueAccountCode = "4211",
    CostOfGoodsSoldAccountCode = "3641",
    InventoryAccountCode = "1317"
  });

  private static CompletePosSaleRequest Request(
    TestData data,
    List<PosSaleLineRequest> lines,
    List<PosTenderRequest> tenders,
    Guid? customerId = null,
    PosChangeRequest? change = null) => new(
      data.BranchId,
      data.SessionId,
      data.WarehouseId,
      customerId,
      lines,
      tenders,
      change);

  private static PosSaleLineRequest ServiceLine(TestData data) =>
    new(SalesLineType.Service, data.ServiceId, null, null, 1, data.ProfessionalId);

  private static PosSaleLineRequest ProductLine(TestData data, decimal quantity = 1, Guid? unitId = null) =>
    new(SalesLineType.Product, null, data.ProductId, unitId ?? data.UnitId, quantity, null);

  private static Task<decimal> PosBalanceAsync(AppDbContext db, Guid accountId) =>
    db.MoneyLedgerEntries.Where(entry => entry.MoneyAccountId == accountId)
      .SumAsync(entry => entry.Amount);

  private static Task<decimal> StockQuantityAsync(AppDbContext db, TestData data) =>
    db.StockMovements.Where(movement => movement.ProductId == data.ProductId && movement.WarehouseId == data.WarehouseId)
      .SumAsync(movement => movement.QuantityIn - movement.QuantityOut);

  private static async Task<TestData> SeedAsync(
    AppDbContext db,
    decimal stockQuantity = 10,
    decimal iqdOpeningBalance = 0)
  {
    var cashier = new UserEntity { Username = "cashier", PasswordHash = "x", Role = UserRole.Cashier };
    var viewer = new UserEntity { Username = "viewer", PasswordHash = "x", Role = UserRole.Cashier };
    var outsider = new UserEntity { Username = "outside", PasswordHash = "x", Role = UserRole.Cashier };
    var professional = new UserEntity { Username = "sara", PasswordHash = "x", Role = UserRole.Professional };
    var iqd = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD", DecimalPlaces = 0 };
    var usd = new CurrencyEntity { Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2 };
    var business = new BusinessEntity
    {
      Name = "Prive", PrimaryPhoneNumber = "1", Address = "A", City = "C", Region = "R", Country = "IQ",
      BaseCurrency = iqd, IsSetupCompleted = true
    };
    var branch = new BranchEntity
    {
      Id = db.SelectedBranchId!.Value,
      Code = "MAIN", Name = "Main", Address = "A", City = "C", Region = "R", Country = "IQ", IsMainBranch = true
    };
    var customer = new ContactEntity { Name = "Customer", IsCustomer = true, IsActive = true };
    var warehouse = new WarehouseEntity { Code = "MAIN", Name = "Main Warehouse", Branch = branch };
    var productCategory = new ProductCategoryEntity { Name = "Products" };
    var serviceCategory = new ServiceCategoryEntity { Name = "Hair" };
    var unit = new UnitOfMeasureEntity { Name = "Piece", Code = "PC" };
    var receivable = new AccountEntity { Code = "13214", Name = "Receivable", Classification = AccountClassification.Asset };
    var inventory = new AccountEntity { Code = "1317", Name = "Inventory", Classification = AccountClassification.Asset };
    var productRevenue = new AccountEntity { Code = "4211", Name = "Product Revenue", Classification = AccountClassification.Revenue };
    var serviceRevenue = new AccountEntity { Code = "43121", Name = "Service Revenue", Classification = AccountClassification.Revenue };
    var cogs = new AccountEntity { Code = "3641", Name = "COGS", Classification = AccountClassification.Expense };
    var iqdMoneyGl = new AccountEntity { Code = "1111", Name = "IQD Cash", Classification = AccountClassification.Asset };
    var usdMoneyGl = new AccountEntity { Code = "1112", Name = "USD Cash", Classification = AccountClassification.Asset };
    var product = new ProductEntity
    {
      Name = "Shampoo", SKU = "SHAMPOO", Category = productCategory, UnitOfMeasure = unit,
      Purpose = ProductPurpose.Resale, SellingPriceBase = 15_000, TrackInventory = true
    };
    var salonService = new ServiceEntity
    {
      Name = "Classic Haircut", Category = serviceCategory, SellingPriceBase = 25_000,
      DurationMinutes = 30, RevenueAccount = serviceRevenue
    };
    var iqdAccount = new MoneyAccountEntity
    {
      Code = "CASH-IQD", Name = "Reception IQD", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = iqd, AccountingAccount = iqdMoneyGl
    };
    var usdAccount = new MoneyAccountEntity
    {
      Code = "CASH-USD", Name = "Reception USD", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = usd, AccountingAccount = usdMoneyGl
    };
    db.AddRange(cashier, viewer, outsider, professional, iqd, usd, business, branch, customer, warehouse,
      productCategory, serviceCategory, unit, receivable, inventory, productRevenue, serviceRevenue, cogs,
      iqdMoneyGl, usdMoneyGl, product, salonService, iqdAccount, usdAccount);
    await db.SaveChangesAsync();

    db.MoneyAccountAccess.AddRange(
      new MoneyAccountAccessEntity { MoneyAccountId = iqdAccount.Id, UserId = cashier.Id, AccessLevel = MoneyAccountAccessLevel.Operate },
      new MoneyAccountAccessEntity { MoneyAccountId = usdAccount.Id, UserId = cashier.Id, AccessLevel = MoneyAccountAccessLevel.Operate },
      new MoneyAccountAccessEntity { MoneyAccountId = iqdAccount.Id, UserId = viewer.Id, AccessLevel = MoneyAccountAccessLevel.View },
      new MoneyAccountAccessEntity { MoneyAccountId = usdAccount.Id, UserId = viewer.Id, AccessLevel = MoneyAccountAccessLevel.View });
    db.ExchangeRates.Add(new ExchangeRateEntity
    {
      FromCurrencyId = usd.Id,
      ToCurrencyId = iqd.Id,
      Rate = 1_300,
      EffectiveAtUtc = DateTime.UtcNow.AddMinutes(-1),
      CreatedByUserId = cashier.Id
    });
    db.StockMovements.Add(new StockMovementEntity
    {
      ProductId = product.Id,
      WarehouseId = warehouse.Id,
      Type = StockMovementType.OpeningStock,
      MovementDate = Today,
      QuantityIn = stockQuantity,
      UnitCostBase = 10,
      PerformedByUserId = cashier.Id
    });
    if (iqdOpeningBalance > 0)
    {
      db.MoneyLedgerEntries.Add(new MoneyLedgerEntryEntity
      {
        MoneyAccountId = iqdAccount.Id,
        MovementDate = Today,
        SourceType = MoneyLedgerSourceType.OpeningBalance,
        SourceDocumentId = iqdAccount.Id,
        DocumentNumber = "OPEN-CASH-IQD",
        Amount = iqdOpeningBalance,
        BaseAmount = iqdOpeningBalance,
        CurrencyId = iqd.Id,
        BaseCurrencyId = iqd.Id,
        ExchangeRate = 1,
        JournalEntry = new JournalEntryEntity { BranchId = branch.Id },
        PerformedByUserId = cashier.Id
      });
    }
    await db.SaveChangesAsync();

    var sessions = CreateSessionService(db);
    var register = await sessions.CreateRegisterAsync(new("MAIN", "Main POS"), default);
    var session = await sessions.OpenSessionAsync(cashier.Id,
      new(register.Id, [new(iqd.Id, 0), new(usd.Id, 0)], null), default);
    var viewerRegister = await sessions.CreateRegisterAsync(new("VIEWER", "Viewer POS"), default);
    var viewerSession = await sessions.OpenSessionAsync(viewer.Id, new(viewerRegister.Id, [], null), default);
    var outsideRegister = await sessions.CreateRegisterAsync(new("OUTSIDE", "Outside POS"), default);
    var outsideSession = await sessions.OpenSessionAsync(outsider.Id, new(outsideRegister.Id, [], null), default);

    return new TestData(
      session.Id,
      viewerSession.Id,
      outsideSession.Id,
      cashier.Id,
      viewer.Id,
      outsider.Id,
      professional.Id,
      customer.Id,
      branch.Id,
      warehouse.Id,
      iqd.Id,
      usd.Id,
      unit.Id,
      product.Id,
      salonService.Id,
      iqdAccount.Id,
      usdAccount.Id,
      receivable.Id,
      inventory.Id,
      productRevenue.Id,
      serviceRevenue.Id,
      cogs.Id,
      iqdMoneyGl.Id);
  }

  private static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);

  private sealed record TestData(
    Guid SessionId,
    Guid ViewerSessionId,
    Guid OutsideSessionId,
    Guid CashierId,
    Guid ViewerId,
    Guid OutsideUserId,
    Guid ProfessionalId,
    Guid CustomerId,
    Guid BranchId,
    Guid WarehouseId,
    Guid IqdCurrencyId,
    Guid UsdCurrencyId,
    Guid UnitId,
    Guid ProductId,
    Guid ServiceId,
    Guid IqdMoneyAccountId,
    Guid UsdMoneyAccountId,
    Guid ReceivableGlId,
    Guid InventoryGlId,
    Guid ProductRevenueGlId,
    Guid ServiceRevenueGlId,
    Guid CogsGlId,
    Guid IqdMoneyGlId);
}
