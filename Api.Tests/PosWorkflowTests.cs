using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Professional;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed partial class PosWorkflowTests
{
  [Fact]
  public async Task Service_only_walk_in_posts_on_a_relational_database()
  {
    await using var connection = new SqliteConnection("Data Source=:memory:");
    await connection.OpenAsync();
    var branchId = Guid.NewGuid();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseSqlite(connection)
      .Options;
    await using var db = new AppDbContext(options, new BranchContext { BranchId = branchId });
    await db.Database.EnsureCreatedAsync();
    var data = await SeedAsync(db);
    var service = CreateService(db);

    var sale = await service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]),
      data.CashierId,
      default);

    Assert.Equal(25_000, sale.SettledBaseAmount);
    Assert.Equal(25_000, await PosBalanceAsync(db, data.IqdMoneyAccountId));
    Assert.NotNull((await db.PosContexts.SingleAsync(item => item.SalesInvoiceId == sale.Id)).PaymentId);
  }

  [Fact]
  public async Task Service_only_walk_in_posts_receivable_and_separate_payment_journals()
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
    Assert.Equal((await db.Branches.SingleAsync(item => item.Id == data.BranchId)).WalkInCustomerId, sale.CustomerId);
    Assert.Equal(25_000, sale.Total);
    Assert.Equal(25_000, sale.SettledBaseAmount);
    Assert.Equal(stockCount, await db.StockMovements.CountAsync());
    Assert.Equal(25_000, await PosBalanceAsync(db, data.IqdMoneyAccountId));
    var journal = await db.JournalEntries.Include(entry => entry.Lines)
      .SingleAsync(entry => entry.Id == sale.JournalEntryId);
    Assert.Equal(data.ReceivableGlId, journal.Lines.Single(line => line.DebitBaseAmount == 25_000).AccountId);
    Assert.Equal(data.ServiceRevenueGlId, journal.Lines.Single(line => line.CreditBaseAmount == 25_000).AccountId);
    Assert.DoesNotContain(journal.Lines, line => line.AccountId == data.IqdMoneyGlId);
    var paymentId = (await db.PosContexts.SingleAsync(item => item.SalesInvoiceId == sale.Id)).PaymentId;
    var paymentJournal = await db.JournalEntries.Include(entry => entry.Lines)
      .SingleAsync(entry => entry.SourcePayment!.Id == paymentId);
    Assert.Equal(data.IqdMoneyGlId, paymentJournal.Lines.Single(line => line.DebitBaseAmount == 25_000).AccountId);
    Assert.Equal(data.ReceivableGlId, paymentJournal.Lines.Single(line => line.CreditBaseAmount == 25_000).AccountId);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);
    Assert.Equal(SalesInvoicePaymentStatus.Paid, invoice.PaymentStatus);
    Assert.Equal(0, invoice.OutstandingAmount);
  }

  [Fact]
  public async Task Pos_settlement_correction_replaces_settlement_and_preserves_invoice_and_payment_identity()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var pos = CreateService(db);
    var sale = await pos.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)], data.CustomerId),
      data.CashierId,
      default);
    var original = await db.PosContexts.AsNoTracking().SingleAsync(item => item.SalesInvoiceId == sale.Id);
    var originalPaymentId = original.PaymentId;
    var originalTenderId = sale.Tenders.Single().Id;
    (await db.Users.FindAsync(data.CashierId))!.Role = UserRole.Manager;
    await db.SaveChangesAsync();
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);

    var corrected = await pos.CorrectSettlementAsync(invoice.Id,
      new CorrectPosSettlementRequest(
        PosPaymentMode.Partial,
        [new PosTenderRequest(data.IqdMoneyAccountId, 20_000)],
        null,
        "Correct tendered amount",
        invoice.UpdatedAtUtc),
      data.CashierId,
      default);

    var rebuilt = await db.PosContexts.AsNoTracking()
      .Include(item => item.Tenders)
      .SingleAsync(item => item.SalesInvoiceId == sale.Id);
    Assert.Equal(sale.Id, corrected.Id);
    Assert.Equal(sale.DocumentNumber, corrected.DocumentNumber);
    Assert.Equal(original.SalesInvoiceId, rebuilt.SalesInvoiceId);
    Assert.Equal(original.PosSessionId, rebuilt.PosSessionId);
    Assert.Equal(original.CashierUserId, rebuilt.CashierUserId);
    Assert.Equal(original.CompletedAtUtc, rebuilt.CompletedAtUtc);
    Assert.Equal(original.ClientRequestId, rebuilt.ClientRequestId);
    Assert.Equal(original.RequestFingerprint, rebuilt.RequestFingerprint);
    Assert.Equal(originalPaymentId, rebuilt.PaymentId);
    Assert.NotEqual(originalTenderId, rebuilt.Tenders.Single().Id);
    Assert.Equal(20_000, rebuilt.Tenders.Single().BaseAmount);
    Assert.Equal(20_000, await PosBalanceAsync(db, data.IqdMoneyAccountId));
    Assert.Single(await db.MoneyLedgerEntries.Where(entry => entry.SourceDocumentId == rebuilt.PaymentId).ToListAsync());
    Assert.Single(await db.ActivityLogs.Where(log => log.EntityId == sale.Id
      && log.EntityType == "POS Settlement" && log.Action == "corrected").ToListAsync());
  }

  [Fact]
  public async Task Posted_pos_delete_preserves_wrapper_and_hides_sale_from_operational_queries()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var pos = CreateService(db);
    var sale = await pos.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]),
      data.CashierId,
      default);
    var original = await db.PosContexts.AsNoTracking().SingleAsync(item => item.SalesInvoiceId == sale.Id);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);
    var sales = new SalesService(db, SalesOptions());
    var finance = new FinanceService(db, Options.Create(new FinanceOptions()));
    var sessions = new PosSessionService(db, finance);
    var corrections = new SalesInvoiceCorrectionService(db, sales, sessions);

    await corrections.DeleteAsync(invoice.Id,
      new DeletePostedSalesInvoiceRequest("Duplicate POS sale", invoice.UpdatedAtUtc),
      data.CashierId,
      default);

    var wrapper = await db.PosContexts.IgnoreQueryFilters().AsNoTracking()
      .SingleAsync(item => item.SalesInvoiceId == sale.Id);
    Assert.Equal(original.SalesInvoiceId, wrapper.SalesInvoiceId);
    Assert.Equal(original.PosSessionId, wrapper.PosSessionId);
    Assert.Equal(original.CashierUserId, wrapper.CashierUserId);
    Assert.Equal(original.CompletedAtUtc, wrapper.CompletedAtUtc);
    Assert.Equal(original.ClientRequestId, wrapper.ClientRequestId);
    Assert.Equal(original.RequestFingerprint, wrapper.RequestFingerprint);
    Assert.Empty((await pos.GetSalesAsync(new PosSaleListQuery { Page = 1, PageSize = 20 }, default)).Items);
    Assert.False(await db.PosTenders.AnyAsync(tender => tender.SalesInvoiceId == sale.Id));
    Assert.False(await db.PosChanges.AnyAsync(change => change.SalesInvoiceId == sale.Id));
    Assert.False(await db.MoneyLedgerEntries.AnyAsync(entry => entry.SourceDocumentId == original.PaymentId));
    Assert.False(await db.JournalEntries.AnyAsync(entry => entry.Id == sale.JournalEntryId));
    Assert.Single(await db.ActivityLogs.Where(log => log.EntityId == sale.Id && log.Action == "deleted").ToListAsync());
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
    Assert.Equal(data.ProfessionalId, sale.Lines.Single(line => line.LineType == SalesLineType.Service).ProfessionalId);
    Assert.Equal(18, await StockQuantityAsync(db, data));
    var movement = await db.StockMovements.SingleAsync(movement => movement.SalesInvoiceId == sale.Id);
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
    Assert.Equal(48, (await db.StockMovements.SingleAsync(item => item.SalesInvoiceId == sale.Id)).QuantityOut);
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
      Rate = 1_290,
      EffectiveAtUtc = DateTime.UtcNow.AddHours(-2),
      CreatedByUserId = data.CashierId
    });
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
    var paymentId = (await db.PosContexts.SingleAsync(item => item.SalesInvoiceId == sale.Id)).PaymentId;
    var usdLedger = await db.MoneyLedgerEntries.SingleAsync(entry =>
      entry.SourceDocumentId == paymentId && entry.MoneyAccountId == data.UsdMoneyAccountId);
    Assert.Equal(data.UsdCurrencyId, usdLedger.CurrencyId);
    Assert.Equal(data.IqdCurrencyId, usdLedger.BaseCurrencyId);
    Assert.Equal(10, usdLedger.Amount);
    Assert.Equal(1_300, usdLedger.ExchangeRate);
    Assert.Equal(13_000, usdLedger.BaseAmount);
    var usdGlId = (await db.MoneyAccounts.SingleAsync(account => account.Id == data.UsdMoneyAccountId)).AccountingAccountId;
    var journal = await db.JournalEntries.Include(entry => entry.Lines)
      .SingleAsync(entry => entry.SourcePayment!.Id == paymentId);
    var usdSettlement = journal.Lines.Single(line => line.AccountId == usdGlId);
    Assert.Equal(10, usdSettlement.OriginalDebitAmount);
    Assert.Equal(13_000, usdSettlement.DebitBaseAmount);

    (await db.ExchangeRates.SingleAsync(rate => rate.Rate == 1_300)).Rate = 1_500;
    await db.SaveChangesAsync();
    var historical = await service.GetSaleAsync(sale.Id, default);
    Assert.Equal(1_300, historical.Tenders.Single(tender => tender.MoneyAccountId == data.UsdMoneyAccountId).ExchangeRate);
  }

  [Fact]
  public async Task Checkout_uses_transaction_time_fx_and_rejects_stale_change_without_partial_effects()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db, iqdOpeningBalance: 1_000);
    var pricedService = await db.Services.SingleAsync(item => item.Id == data.ServiceId);
    pricedService.SellingPriceBase = 30_000;
    var previewRate = await db.ExchangeRates.SingleAsync(rate => rate.FromCurrencyId == data.UsdCurrencyId);
    previewRate.Rate = 1_310;
    db.ExchangeRates.Add(new ExchangeRateEntity
    {
      FromCurrencyId = data.UsdCurrencyId,
      ToCurrencyId = data.IqdCurrencyId,
      Rate = 1_320,
      EffectiveAtUtc = DateTime.UtcNow.AddSeconds(-1),
      CreatedByUserId = data.CashierId
    });
    await db.SaveChangesAsync();
    var service = CreateService(db);
    var saleCount = await db.PosContexts.CountAsync();
    var invoiceCount = await db.SalesInvoices.CountAsync();
    var stockCount = await db.StockMovements.CountAsync();
    var ledgerCount = await db.MoneyLedgerEntries.CountAsync();
    var journalCount = await db.JournalEntries.CountAsync();
    var stale = Request(data, [ServiceLine(data)],
      [new(data.IqdMoneyAccountId, 10_000), new(data.UsdMoneyAccountId, 15.27m)],
      change: new(data.IqdMoneyAccountId, 3.7m));

    var mismatch = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CompleteSaleAsync(stale, data.CashierId, default));

    Assert.Equal(ErrorCodes.Pos.ChangeMismatch, mismatch.Code);
    Assert.Equal(saleCount, await db.PosContexts.CountAsync());
    Assert.Equal(invoiceCount, await db.SalesInvoices.CountAsync());
    Assert.Equal(stockCount, await db.StockMovements.CountAsync());
    Assert.Equal(ledgerCount, await db.MoneyLedgerEntries.CountAsync());
    Assert.Equal(journalCount, await db.JournalEntries.CountAsync());

    var completed = await service.CompleteSaleAsync(stale with
    {
      ClientRequestId = Guid.NewGuid(),
      Change = new(data.IqdMoneyAccountId, 156.4m)
    }, data.CashierId, default);
    var usd = completed.Tenders.Single(tender => tender.MoneyAccountId == data.UsdMoneyAccountId);
    Assert.Equal(1_320, usd.ExchangeRate);
    Assert.Equal(20_156.4m, usd.BaseAmount);
    Assert.Equal(156.4m, completed.ChangeBaseAmount);

    (await db.ExchangeRates.SingleAsync(rate => rate.Rate == 1_320)).Rate = 1_330;
    await db.SaveChangesAsync();
    var historical = await service.GetSaleAsync(completed.Id, default);
    Assert.Equal(1_320, historical.Tenders.Single(tender => tender.MoneyAccountId == data.UsdMoneyAccountId).ExchangeRate);
    Assert.Equal(20_156.4m, historical.Tenders.Single(tender => tender.MoneyAccountId == data.UsdMoneyAccountId).BaseAmount);
  }

  [Fact]
  public async Task Same_currency_cashbox_outside_the_exact_session_snapshot_is_rejected()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var substitute = await db.MoneyAccounts.SingleAsync(account => account.Code == "VIEWER-IQD");
    db.MoneyAccountAccess.Add(new()
    {
      MoneyAccountId = substitute.Id,
      UserId = data.CashierId,
      AccessLevel = MoneyAccountAccessLevel.Operate
    });
    await db.SaveChangesAsync();

    var rejected = await Assert.ThrowsAsync<BadRequestException>(() => CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(substitute.Id, 25_000)]), data.CashierId, default));

    Assert.Equal(ErrorCodes.Pos.SessionCashboxNotAllowed, rejected.Code);
    Assert.Empty(await db.PosContexts.ToListAsync());
    Assert.Empty(await db.SalesInvoices.ToListAsync());
  }

  [Fact]
  public async Task Usd_only_sale_keeps_the_invoice_in_iqd_and_posts_physical_usd()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var pricedService = await db.Services.SingleAsync(item => item.Id == data.ServiceId);
    pricedService.SellingPriceBase = 26_000;
    await db.SaveChangesAsync();
    var service = CreateService(db);

    var sale = await service.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.UsdMoneyAccountId, 20)]),
      data.CashierId,
      default);

    Assert.Equal(26_000, sale.Total);
    Assert.Equal(26_000, sale.SettledBaseAmount);
    var tender = Assert.Single(sale.Tenders);
    Assert.Equal(20, tender.TenderedAmount);
    Assert.Equal(1_300, tender.ExchangeRate);
    Assert.Equal(26_000, tender.BaseAmount);

    var invoice = await db.SalesInvoices.SingleAsync(item => item.Id == sale.Id);
    Assert.Equal(data.IqdCurrencyId, invoice.CurrencyId);
    Assert.Equal(data.IqdCurrencyId, invoice.BaseCurrencyId);
    Assert.Equal(1, invoice.ExchangeRate);
    Assert.Equal(26_000, invoice.BaseTotal);

    var paymentId = (await db.PosContexts.SingleAsync(item => item.SalesInvoiceId == sale.Id)).PaymentId;
    var ledger = await db.MoneyLedgerEntries.SingleAsync(entry => entry.SourceDocumentId == paymentId);
    Assert.Equal(data.UsdMoneyAccountId, ledger.MoneyAccountId);
    Assert.Equal(data.UsdCurrencyId, ledger.CurrencyId);
    Assert.Equal(data.IqdCurrencyId, ledger.BaseCurrencyId);
    Assert.Equal(20, ledger.Amount);
    Assert.Equal(1_300, ledger.ExchangeRate);
    Assert.Equal(26_000, ledger.BaseAmount);
  }

  [Fact]
  public async Task Missing_usd_rate_blocks_opening_a_multi_currency_session()
  {
    await using var db = CreateDb();
    var missingRate = await Assert.ThrowsAsync<BadRequestException>(() => SeedAsync(db, includeUsdRate: false));
    Assert.Equal(ErrorCodes.Pos.OpeningCountInvalid, missingRate.Code);
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
    var paymentId = (await db.PosContexts.SingleAsync(item => item.SalesInvoiceId == sale.Id)).PaymentId;
    var movements = await db.MoneyLedgerEntries.Where(entry => entry.SourceDocumentId == paymentId)
      .OrderBy(entry => entry.Amount).ToListAsync();
    Assert.Equal([-105_000m, 100m], movements.Select(entry => entry.Amount).ToArray());
    Assert.All(movements, entry => Assert.Equal(MoneyLedgerSourceType.Payment, entry.SourceType));
    Assert.All(movements, entry => Assert.StartsWith("PAY-", entry.DocumentNumber));
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

    Assert.Empty(db.PosContexts);
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
    Assert.Empty(db.PosContexts);
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
    Assert.Equal(sale.Id, journal.SourceSalesInvoiceId);
    var reversal = await Assert.ThrowsAsync<BadRequestException>(() =>
      accounting.ReverseJournalAsync(sale.JournalEntryId, default));
    Assert.Equal(ErrorCodes.Pos.JournalDirectReversalNotAllowed, reversal.Code);

    var inventory = await new InventoryService(db).GetMovementsAsync(
      new StockMovementListQuery { DocumentNumber = sale.DocumentNumber }, default);
    Assert.Single(inventory.Items);
    Assert.Equal(InventoryDocumentType.PosSale, inventory.Items[0].SourceDocumentType);
    Assert.Equal(sale.Id, inventory.Items[0].SourceDocumentId);
    Assert.Equal(sale.Lines.Single().Id, inventory.Items[0].SourceDocumentLineId);
    var paymentId = (await db.PosContexts.SingleAsync(item => item.SalesInvoiceId == sale.Id)).PaymentId;
    Assert.Equal(paymentId, (await db.MoneyLedgerEntries.SingleAsync(entry => entry.SourceType == MoneyLedgerSourceType.Payment)).SourceDocumentId);
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
    Assert.Equal(0, setup.MoneyAccounts.Single(account => account.CurrencyId == data.IqdCurrencyId).CurrencyDecimalPlaces);
    Assert.Equal(2, setup.MoneyAccounts.Single(account => account.CurrencyId == data.UsdCurrencyId).CurrencyDecimalPlaces);
    Assert.Equal(1_300, setup.MoneyAccounts.Single(account => account.CurrencyId == data.UsdCurrencyId).CurrentExchangeRate);
    Assert.Contains(setup.Professionals, professional => professional.Id == data.ProfessionalId);
    var viewerSetup = await service.GetSetupAsync(data.ViewerId, default);
    Assert.Equal(data.IqdCurrencyId, Assert.Single(viewerSetup.MoneyAccounts).CurrencyId);

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

  private static AppDbContext CreateDb(
    string? databaseName = null,
    Guid? branchId = null,
    InMemoryDatabaseRoot? databaseRoot = null,
    params IInterceptor[] interceptors)
  {
    var builder = new DbContextOptionsBuilder<AppDbContext>();
    if (databaseRoot is null)
      builder.UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString());
    else
      builder.UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString(), databaseRoot);
    if (interceptors.Length > 0) builder.AddInterceptors(interceptors);
    return new AppDbContext(builder.Options, new BranchContext { BranchId = branchId ?? Guid.NewGuid() });
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
      change,
      ClientRequestId: Guid.NewGuid());

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
    decimal iqdOpeningBalance = 0,
    bool includeUsdRate = true)
  {
    var cashier = new UserEntity { Username = "cashier", PasswordHash = "x", Role = UserRole.Cashier };
    var viewer = new UserEntity { Username = "viewer", PasswordHash = "x", Role = UserRole.Cashier };
    var outsider = new UserEntity { Username = "outside", PasswordHash = "x", Role = UserRole.Cashier };
    var professionalUser = new UserEntity { Username = "sara", PasswordHash = "x", Role = UserRole.Professional };
    var professional = new ProfessionalEntity { Name = "Sara", LinkedUser = professionalUser };
    professionalUser.LinkedProfessionalId = professional.Id;
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
    var walkInCustomer = new ContactEntity
    {
      Name = "Walk-in Customer", IsCustomer = true, IsActive = true, SystemRole = ContactSystemRole.WalkInCustomer
    };
    branch.WalkInCustomer = walkInCustomer;
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
    var viewerAccount = new MoneyAccountEntity
    {
      Code = "VIEWER-IQD", Name = "Viewer IQD", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = iqd,
      AccountingAccount = new() { Code = "1113", Name = "Viewer IQD", Classification = AccountClassification.Asset }
    };
    var outsideAccount = new MoneyAccountEntity
    {
      Code = "OUTSIDE-IQD", Name = "Outside IQD", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = iqd,
      AccountingAccount = new() { Code = "1114", Name = "Outside IQD", Classification = AccountClassification.Asset }
    };
    db.AddRange(cashier, viewer, outsider, professionalUser, professional, iqd, usd, business, branch, walkInCustomer, customer, warehouse,
      productCategory, serviceCategory, unit, receivable, inventory, productRevenue, serviceRevenue, cogs,
      iqdMoneyGl, usdMoneyGl, product, salonService, iqdAccount, usdAccount, viewerAccount, outsideAccount);
    await db.SaveChangesAsync();

    db.MoneyAccountAccess.AddRange(
      new MoneyAccountAccessEntity { MoneyAccountId = iqdAccount.Id, UserId = cashier.Id, AccessLevel = MoneyAccountAccessLevel.Operate },
      new MoneyAccountAccessEntity { MoneyAccountId = usdAccount.Id, UserId = cashier.Id, AccessLevel = MoneyAccountAccessLevel.Operate },
      new MoneyAccountAccessEntity { MoneyAccountId = iqdAccount.Id, UserId = viewer.Id, AccessLevel = MoneyAccountAccessLevel.View },
      new MoneyAccountAccessEntity { MoneyAccountId = usdAccount.Id, UserId = viewer.Id, AccessLevel = MoneyAccountAccessLevel.View },
      new MoneyAccountAccessEntity { MoneyAccountId = viewerAccount.Id, UserId = viewer.Id, AccessLevel = MoneyAccountAccessLevel.Operate },
      new MoneyAccountAccessEntity { MoneyAccountId = outsideAccount.Id, UserId = outsider.Id, AccessLevel = MoneyAccountAccessLevel.Operate });
    db.ProfessionalBranchAssignments.Add(new ProfessionalBranchAssignmentEntity { ProfessionalId = professional.Id, BranchId = branch.Id });
    if (includeUsdRate) db.ExchangeRates.Add(new ExchangeRateEntity
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
    var register = await sessions.CreateRegisterAsync(new("MAIN", "Main POS", [iqdAccount.Id, usdAccount.Id]), default);
    var session = await sessions.OpenSessionAsync(cashier.Id,
      new(register.Id, [new(iqdAccount.Id, 0), new(usdAccount.Id, 0)], null), default);
    var viewerRegister = await sessions.CreateRegisterAsync(new("VIEWER", "Viewer POS", [viewerAccount.Id]), default);
    var viewerSession = await sessions.OpenSessionAsync(viewer.Id, new(viewerRegister.Id, [new(viewerAccount.Id, 0)], null), default);
    var outsideRegister = await sessions.CreateRegisterAsync(new("OUTSIDE", "Outside POS", [outsideAccount.Id]), default);
    var outsideSession = await sessions.OpenSessionAsync(outsider.Id, new(outsideRegister.Id, [new(outsideAccount.Id, 0)], null), default);

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
