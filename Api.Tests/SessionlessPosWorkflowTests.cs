using System.Data.Common;
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
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed class SessionlessPosWorkflowTests
{
  [Fact]
  public async Task Paid_checkout_uses_one_owned_payment_and_directional_money_lines_without_a_session()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreatePosService(db).CompleteSaleAsync(
      Checkout(data, customerId: null, collection: 30_000, change: 5_000), data.OperatorId, default);

    Assert.Equal(SalesInvoicePaymentStatus.Paid, sale.PaymentStatus);
    Assert.Equal(30_000, sale.GrossCollectionBaseAmount);
    Assert.Equal(5_000, sale.ChangeBaseAmount);
    Assert.Equal(25_000, sale.CollectedBaseAmount);
    Assert.Equal(data.OperatorId, sale.OperatorUserId);
    Assert.Equal("operator", sale.OperatorUsername);
    Assert.Equal("Walk-in Customer", sale.CustomerName);
    Assert.Equal("MAIN", sale.BranchCode);
    Assert.Equal("Main", sale.BranchName);
    Assert.Equal("IQD", sale.BaseCurrencyCode);
    Assert.Single(sale.Collections);
    Assert.NotNull(sale.Change);
    Assert.Equal("CASH-IQD", sale.Collections.Single().MoneyAccountCode);
    Assert.Equal("Reception Cash", sale.Collections.Single().MoneyAccountName);
    Assert.Equal("IQD", sale.Collections.Single().CurrencyCode);
    Assert.Empty(sale.Refunds);
    var receiptLine = Assert.Single(sale.Lines);
    Assert.Equal("Haircut", receiptLine.ServiceName);
    Assert.Equal("Sara", receiptLine.ProfessionalName);

    var payment = await db.Payments.Include(item => item.Allocations).Include(item => item.MoneyLines)
      .SingleAsync(item => item.Origin == PaymentOrigin.Pos && item.SourceSalesInvoiceId == sale.Id);
    Assert.Single(payment.Allocations);
    Assert.Equal(sale.Id, payment.Allocations.Single().SalesInvoiceId);
    Assert.Equal(25_000, payment.Allocations.Single().BaseAmount);
    Assert.Equal(2, payment.MoneyLines.Count);
    Assert.Single(payment.MoneyLines, line => line.Direction == PaymentMoneyDirection.Collection);
    Assert.Single(payment.MoneyLines, line => line.Direction == PaymentMoneyDirection.Change);
    Assert.Equal(6, (int)MoneyLedgerSourceType.Payment);
  }

  [Fact]
  public async Task Product_checkout_returns_receipt_details_from_the_prepared_sale()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var branch = await db.Branches.SingleAsync(item => item.Id == data.BranchId);
    var unit = new UnitOfMeasureEntity { Name = "Piece", Code = "pc" };
    var category = new ProductCategoryEntity { Name = "Retail" };
    var product = new ProductEntity
    {
      Name = "Shampoo",
      SKU = "SHP-1",
      Category = category,
      UnitOfMeasure = unit,
      Purpose = ProductPurpose.Resale,
      PurchasePriceBase = 4_000,
      SellingPriceBase = 10_000,
      TrackInventory = true
    };
    var warehouse = new WarehouseEntity { Code = "MAIN-WH", Name = "Main Warehouse", Branch = branch };
    db.AddRange(
      unit,
      category,
      product,
      warehouse,
      new AccountEntity { Code = "4211", Name = "Product Revenue", Classification = AccountClassification.Revenue },
      new AccountEntity { Code = "3641", Name = "Cost of Goods", Classification = AccountClassification.Expense },
      new AccountEntity { Code = "1317", Name = "Inventory", Classification = AccountClassification.Asset });
    db.StockMovements.Add(new StockMovementEntity
    {
      Product = product,
      Warehouse = warehouse,
      Type = StockMovementType.OpeningStock,
      MovementDate = DateOnly.FromDateTime(DateTime.UtcNow),
      QuantityIn = 5,
      UnitCostBase = 4_000,
      PerformedByUserId = data.OperatorId
    });
    await db.SaveChangesAsync();

    var sale = await CreatePosService(db).CompleteSaleAsync(new CompletePosSaleRequest(
      data.BranchId,
      warehouse.Id,
      data.CustomerId,
      [new PosSaleLineRequest(SalesLineType.Product, null, product.Id, unit.Id, 1, null)],
      [new CollectionMoneyLineRequest(data.MoneyAccountId, 10_000)],
      null,
      PosPaymentMode.Paid,
      Guid.NewGuid()), data.OperatorId, default);

    Assert.Equal("MAIN-WH", sale.WarehouseCode);
    Assert.Equal("Main Warehouse", sale.WarehouseName);
    Assert.Single(sale.StockMovementIds);
    var receiptLine = Assert.Single(sale.Lines);
    Assert.Equal("Shampoo", receiptLine.ProductName);
    Assert.Equal("SHP-1", receiptLine.SKU);
    Assert.Equal("pc", receiptLine.UnitCode);
    Assert.Null(receiptLine.ProfessionalId);
  }

  [Fact]
  public async Task Paid_checkout_stays_within_the_read_query_budget()
  {
    await using var connection = new SqliteConnection("Data Source=:memory:");
    await connection.OpenAsync();
    var reads = new SelectCommandCounter();
    var branchContext = new BranchContext { BranchId = Guid.NewGuid() };
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseSqlite(connection)
      .AddInterceptors(reads)
      .Options;
    await using var db = new AppDbContext(options, branchContext);
    await db.Database.EnsureCreatedAsync();
    var data = await SeedAsync(db);
    reads.Reset();

    await CreatePosService(db).CompleteSaleAsync(
      Checkout(data, customerId: null, collection: 25_000), data.OperatorId, default);

    Assert.InRange(reads.Count, 1, 17);
  }

  [Fact]
  public async Task Multi_account_checkout_is_idempotent_and_uses_ordinary_invoice_and_payment_numbering()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreatePosService(db);
    var request = Checkout(data, data.CustomerId, 0) with
    {
      Collections =
      [
        new CollectionMoneyLineRequest(data.MoneyAccountId, 10_000),
        new CollectionMoneyLineRequest(data.SecondMoneyAccountId, 15_000)
      ],
      ClientRequestId = Guid.NewGuid()
    };

    var original = await service.CompleteSaleAsync(request, data.OperatorId, default);
    var replay = await service.CompleteSaleAsync(request, data.OperatorId, default);

    Assert.Equal(original.Id, replay.Id);
    Assert.Equal(original.PaymentId, replay.PaymentId);
    Assert.StartsWith("SI-", original.DocumentNumber);
    Assert.StartsWith("PAY-", original.PaymentDocumentNumber);
    Assert.Equal(2, original.Collections.Count);
    Assert.Null(original.Change);
    Assert.Single(await db.PosContexts.ToListAsync());
    Assert.Single(await db.Payments.ToListAsync());

    var reused = await Assert.ThrowsAsync<ConflictException>(() => service.CompleteSaleAsync(
      request with { CustomerId = null }, data.OperatorId, default));
    Assert.Equal(ErrorCodes.Pos.IdempotencyKeyReused, reused.Code);

    var next = await service.CompleteSaleAsync(
      Checkout(data, data.CustomerId, 25_000), data.OperatorId, default);
    Assert.StartsWith("SI-", next.DocumentNumber);
    Assert.NotEqual(original.DocumentNumber, next.DocumentNumber);
    Assert.NotEqual(original.PaymentDocumentNumber, next.PaymentDocumentNumber);
  }

  [Fact]
  public async Task Checkout_revalidates_professional_and_money_account_access()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreatePosService(db);

    var missingProfessional = Checkout(data, data.CustomerId, 25_000) with
    {
      Lines =
      [
        new PosSaleLineRequest(SalesLineType.Service, data.ServiceId, null, null, 1, null)
      ]
    };
    var professionalError = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CompleteSaleAsync(missingProfessional, data.OperatorId, default));
    Assert.Equal(ErrorCodes.Sales.ProfessionalInvalid, professionalError.Code);

    var access = await db.MoneyAccountAccess.SingleAsync(item =>
      item.MoneyAccountId == data.MoneyAccountId && item.UserId == data.OperatorId);
    db.MoneyAccountAccess.Remove(access);
    await db.SaveChangesAsync();
    var accessError = await Assert.ThrowsAsync<ForbiddenException>(() => service.CompleteSaleAsync(
      Checkout(data, data.CustomerId, 25_000), data.OperatorId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountAccessDenied, accessError.Code);
    Assert.Empty(await db.PosContexts.ToListAsync());
    Assert.Empty(await db.Payments.ToListAsync());
  }

  [Fact]
  public async Task Incorrect_change_is_rejected_without_partial_effects()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreatePosService(db);

    var mismatch = await Assert.ThrowsAsync<BadRequestException>(() => service.CompleteSaleAsync(
      Checkout(data, data.CustomerId, 30_000, change: 4_999), data.OperatorId, default));

    Assert.Equal(ErrorCodes.Pos.ChangeMismatch, mismatch.Code);
    Assert.Empty(await db.PosContexts.ToListAsync());
    Assert.Empty(await db.SalesInvoices.ToListAsync());
    Assert.Empty(await db.Payments.ToListAsync());
    Assert.Empty(await db.PaymentMoneyLines.ToListAsync());
    Assert.Empty(await db.MoneyLedgerEntries.ToListAsync());
  }

  [Fact]
  public async Task Partial_and_credit_enforce_registered_customer_rules()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreatePosService(db);

    var partial = await service.CompleteSaleAsync(
      Checkout(data, data.CustomerId, 10_000, paymentMode: PosPaymentMode.Partial), data.OperatorId, default);
    Assert.Equal(SalesInvoicePaymentStatus.PartiallyPaid, partial.PaymentStatus);
    Assert.Equal(15_000, partial.OutstandingBaseAmount);

    var credit = await service.CompleteSaleAsync(
      Checkout(data, data.CustomerId, 0, paymentMode: PosPaymentMode.Credit), data.OperatorId, default);
    Assert.Equal(SalesInvoicePaymentStatus.Unpaid, credit.PaymentStatus);
    Assert.Null(credit.PaymentId);
    Assert.Empty(credit.Collections);

    var exception = await Assert.ThrowsAsync<BadRequestException>(() => service.CompleteSaleAsync(
      Checkout(data, null, 10_000, paymentMode: PosPaymentMode.Partial), data.OperatorId, default));
    Assert.Equal(ErrorCodes.Pos.RealCustomerRequired, exception.Code);
  }

  [Fact]
  public async Task Commercial_correction_leaves_payment_untouched_and_derives_partial_then_overpaid()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreatePosService(db).CompleteSaleAsync(
      Checkout(data, data.CustomerId, 25_000), data.OperatorId, default);
    var payment = await db.Payments.AsNoTracking().SingleAsync(item => item.SourceSalesInvoiceId == sale.Id);

    var corrections = CreateCorrectionService(db);
    var raised = await corrections.UpdateAsync(sale.Id,
      Correction(data, data.CustomerId, 30_000, "Raise corrected service value", DateOnly.FromDateTime(sale.CompletedAtUtc), sale.UpdatedAtUtc), data.OperatorId, default);

    Assert.Equal(30_000, raised.BaseTotal);
    Assert.Equal(25_000, raised.CollectedAmount);
    Assert.Equal(5_000, raised.OutstandingAmount);
    Assert.Equal(SalesInvoicePaymentStatus.PartiallyPaid, raised.PaymentStatus);
    var unchanged = await db.Payments.AsNoTracking().SingleAsync(item => item.SourceSalesInvoiceId == sale.Id);
    Assert.Equal(payment.Id, unchanged.Id);
    Assert.Equal(payment.UpdatedAtUtc, unchanged.UpdatedAtUtc);
    Assert.Equal(25_000, unchanged.BaseAmount);

    var reduced = await corrections.UpdateAsync(sale.Id,
      Correction(data, data.CustomerId, 20_000, "Reduce corrected service value", raised.InvoiceDate, raised.UpdatedAtUtc), data.OperatorId, default);
    Assert.Equal(5_000, reduced.OverpaidAmount);
    Assert.Equal(SalesInvoicePaymentStatus.Overpaid, reduced.PaymentStatus);
    Assert.Equal(25_000, (await db.Payments.AsNoTracking()
      .SingleAsync(item => item.SourceSalesInvoiceId == sale.Id)).BaseAmount);
  }

  [Fact]
  public async Task Walk_in_commercial_correction_cannot_create_debt_but_may_remain_paid_or_overpaid()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreatePosService(db).CompleteSaleAsync(
      Checkout(data, null, 25_000), data.OperatorId, default);
    var corrections = CreateCorrectionService(db);

    var exception = await Assert.ThrowsAsync<ConflictException>(() => corrections.UpdateAsync(sale.Id,
      Correction(data, sale.CustomerId, 30_000, "Would create walk-in debt", DateOnly.FromDateTime(sale.CompletedAtUtc), sale.UpdatedAtUtc), data.OperatorId, default));
    Assert.Equal(ErrorCodes.Sales.InvoiceHasDependentTransaction, exception.Code);

    await using var secondDb = CreateDb();
    var secondData = await SeedAsync(secondDb);
    var secondSale = await CreatePosService(secondDb).CompleteSaleAsync(
      Checkout(secondData, null, 25_000), secondData.OperatorId, default);
    var reduced = await CreateCorrectionService(secondDb).UpdateAsync(secondSale.Id,
      Correction(secondData, secondSale.CustomerId, 20_000, "Walk-in remains overpaid", DateOnly.FromDateTime(secondSale.CompletedAtUtc), secondSale.UpdatedAtUtc), secondData.OperatorId, default);
    Assert.Equal(SalesInvoicePaymentStatus.Overpaid, reduced.PaymentStatus);
    Assert.Equal(0, reduced.OutstandingAmount);
  }

  [Fact]
  public async Task Invoice_deletion_invokes_unified_owned_payment_deletion_lifecycle()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreatePosService(db).CompleteSaleAsync(
      Checkout(data, data.CustomerId, 25_000), data.OperatorId, default);
    var paymentId = sale.PaymentId!.Value;

    await CreateCorrectionService(db).DeleteAsync(sale.Id,
      new DeletePostedSalesInvoiceRequest("Duplicate invoice", sale.UpdatedAtUtc), data.OperatorId, default);

    var invoice = await db.SalesInvoices.IgnoreQueryFilters().SingleAsync(item => item.Id == sale.Id);
    var payment = await db.Payments.IgnoreQueryFilters().SingleAsync(item => item.Id == paymentId);
    Assert.True(invoice.IsDeleted);
    Assert.True(payment.IsDeleted);
    Assert.Equal("Duplicate invoice", payment.DeleteReason);
    Assert.False(await db.PaymentAllocations.AnyAsync(item => item.PaymentId == paymentId));
    Assert.False(await db.PaymentMoneyLines.AnyAsync(item => item.PaymentId == paymentId));
    Assert.Contains(await db.ActivityLogs.ToListAsync(), log =>
      log.EntityType == "Payment" && log.EntityId == paymentId && log.Action == "deleted");
  }

  [Fact]
  public async Task Invoice_deletion_blocks_independent_payment_allocations()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreatePosService(db).CompleteSaleAsync(
      Checkout(data, data.CustomerId, 25_000), data.OperatorId, default);
    var invoice = await db.SalesInvoices.SingleAsync(item => item.Id == sale.Id);
    var independent = new PaymentEntity
    {
      DocumentNumber = "PAY-INDEPENDENT",
      BranchId = invoice.BranchId,
      CustomerId = invoice.CustomerId,
      PaymentDate = invoice.InvoiceDate,
      CurrencyId = invoice.CurrencyId,
      BaseCurrencyId = invoice.BaseCurrencyId,
      Amount = 1,
      BaseAmount = 1,
      Origin = PaymentOrigin.CustomerReceipt,
      CreatedByUserId = data.OperatorId
    };
    independent.Allocations.Add(new PaymentAllocationEntity
    {
      Payment = independent,
      SalesInvoice = invoice,
      Amount = 1,
      BaseAmount = 1
    });
    db.Payments.Add(independent);
    await db.SaveChangesAsync();

    var exception = await Assert.ThrowsAsync<ConflictException>(() => CreateCorrectionService(db).DeleteAsync(
      sale.Id, new DeletePostedSalesInvoiceRequest("Must retain independent allocation", sale.UpdatedAtUtc),
      data.OperatorId, default));

    Assert.Equal(ErrorCodes.Sales.InvoiceHasDependentTransaction, exception.Code);
    Assert.False((await db.SalesInvoices.SingleAsync(item => item.Id == sale.Id)).IsDeleted);
    Assert.False((await db.Payments.SingleAsync(item => item.Id == sale.PaymentId)).IsDeleted);
  }

  [Fact]
  public async Task Invoice_deletion_blocks_owned_payment_reversals_and_other_journal_owners()
  {
    await using (var reversalDb = CreateDb())
    {
      var data = await SeedAsync(reversalDb);
      var sale = await CreatePosService(reversalDb).CompleteSaleAsync(
        Checkout(data, data.CustomerId, 25_000), data.OperatorId, default);
      var payment = await reversalDb.Payments.SingleAsync(item => item.Id == sale.PaymentId);
      reversalDb.JournalEntries.Add(new JournalEntryEntity
      {
        BranchId = data.BranchId,
        EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
        Description = "External reversal dependency",
        Status = JournalEntryStatus.Posted,
        Type = JournalEntryType.Reversal,
        PostedAtUtc = DateTime.UtcNow,
        ReversalOfJournalId = payment.JournalEntryId
      });
      await reversalDb.SaveChangesAsync();

      var reversal = await Assert.ThrowsAsync<ConflictException>(() => CreateCorrectionService(reversalDb).DeleteAsync(
        sale.Id, new DeletePostedSalesInvoiceRequest("Must retain reversal", sale.UpdatedAtUtc),
        data.OperatorId, default));
      Assert.Equal(ErrorCodes.Sales.InvoiceHasDependentTransaction, reversal.Code);
    }

    await using (var ownerDb = CreateDb())
    {
      var data = await SeedAsync(ownerDb);
      var sale = await CreatePosService(ownerDb).CompleteSaleAsync(
        Checkout(data, data.CustomerId, 25_000), data.OperatorId, default);
      var payment = await ownerDb.Payments.SingleAsync(item => item.Id == sale.PaymentId);
      ownerDb.MoneyTransfers.Add(new MoneyTransferEntity
      {
        DocumentNumber = "TRF-OTHER-OWNER",
        TransferDate = DateOnly.FromDateTime(DateTime.UtcNow),
        SourceMoneyAccountId = data.MoneyAccountId,
        DestinationMoneyAccountId = data.SecondMoneyAccountId,
        CurrencyId = data.CurrencyId,
        BaseCurrencyId = data.CurrencyId,
        Amount = 1,
        BaseAmount = 1,
        CreatedByUserId = data.OperatorId,
        JournalEntryId = payment.JournalEntryId
      });
      await ownerDb.SaveChangesAsync();

      var otherOwner = await Assert.ThrowsAsync<ConflictException>(() => CreateCorrectionService(ownerDb).DeleteAsync(
        sale.Id, new DeletePostedSalesInvoiceRequest("Must retain other owner", sale.UpdatedAtUtc),
        data.OperatorId, default));
      Assert.Equal(ErrorCodes.Sales.InvoiceHasDependentTransaction, otherOwner.Code);
    }
  }

  [Fact]
  public async Task Posted_refund_snapshots_attribution_and_blocks_commercial_correction_and_deletion()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreatePosService(db).CompleteSaleAsync(
      Checkout(data, data.CustomerId, 25_000), data.OperatorId, default);
    var refund = await new PosRefundService(db, CreateFinanceService(db)).PostRefundAsync(
      sale.Id,
      new CreatePosRefundRequest(
        PosRefundReason.CustomerComplaint,
        "Approved refund",
        [new PosRefundLineRequest(sale.Lines.Single().Id, 1, false)],
        [new PosRefundPayoutRequest(data.MoneyAccountId, 25_000)],
        Guid.NewGuid()),
      data.OperatorId,
      default);

    var line = await db.PosRefundLines.AsNoTracking().SingleAsync(item => item.PosRefundId == refund.Id);
    Assert.Equal(sale.Lines.Single().Id, line.OriginalSalesInvoiceLineId);
    Assert.Equal(data.ProfessionalId, line.ProfessionalId);
    Assert.Equal(data.ServiceId, line.ServiceId);
    Assert.Equal(25_000, line.RefundAmountBase);

    var corrections = CreateCorrectionService(db);
    var update = await Assert.ThrowsAsync<ConflictException>(() => corrections.UpdateAsync(sale.Id,
      Correction(data, data.CustomerId, 20_000, "Refund-dependent edit", DateOnly.FromDateTime(sale.CompletedAtUtc), sale.UpdatedAtUtc), data.OperatorId, default));
    Assert.Equal(ErrorCodes.Sales.InvoiceHasRefundOrVoid, update.Code);
    var delete = await Assert.ThrowsAsync<ConflictException>(() => corrections.DeleteAsync(sale.Id,
      new DeletePostedSalesInvoiceRequest("Refund-dependent delete", sale.UpdatedAtUtc), data.OperatorId, default));
    Assert.Equal(ErrorCodes.Sales.InvoiceHasRefundOrVoid, delete.Code);
  }

  private static AppDbContext CreateDb()
  {
    var branchId = Guid.NewGuid();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
    return new AppDbContext(options, new BranchContext { BranchId = branchId });
  }

  private static PosService CreatePosService(AppDbContext db)
  {
    var finance = CreateFinanceService(db);
    var payments = new PaymentService(db);
    return new PosService(
      db,
      new SalesService(db, SalesOptions()),
      new PosSettlementService(db, finance),
      payments,
      new InvoiceSettlementReader(db));
  }

  private static SalesInvoiceCorrectionService CreateCorrectionService(AppDbContext db) =>
    new(db, new SalesService(db, SalesOptions()), new PaymentService(db));

  private static FinanceService CreateFinanceService(AppDbContext db) => new(db, Options.Create(new FinanceOptions
  {
    AccountsPayableAccountCode = "23214",
    AccountsReceivableAccountCode = "13214",
    OpeningBalanceEquityAccountCode = "261"
  }));

  private static IOptions<SalesOptions> SalesOptions() => Options.Create(new SalesOptions
  {
    AccountsReceivableAccountCode = "13214",
    ProductRevenueAccountCode = "4211",
    CostOfGoodsSoldAccountCode = "3641",
    InventoryAccountCode = "1317"
  });

  private static CompletePosSaleRequest Checkout(
    TestData data,
    Guid? customerId,
    decimal collection,
    decimal change = 0,
    PosPaymentMode paymentMode = PosPaymentMode.Paid) => new(
      data.BranchId,
      null,
      customerId,
      [new PosSaleLineRequest(SalesLineType.Service, data.ServiceId, null, null, 1, data.ProfessionalId)],
      collection > 0 ? [new CollectionMoneyLineRequest(data.MoneyAccountId, collection)] : [],
      change > 0 ? new ChangeMoneyLineRequest(data.MoneyAccountId, change) : null,
      paymentMode,
      Guid.NewGuid());

  private static UpdatePostedSalesInvoiceRequest Correction(
    TestData data,
    Guid customerId,
    decimal price,
    string reason,
    DateOnly invoiceDate,
    DateTime updatedAtUtc) => new(
      reason,
      updatedAtUtc,
      customerId,
      invoiceDate,
      data.BranchId,
      null,
      data.CurrencyId,
      null,
      "Corrected POS invoice",
      [new SalesInvoiceLineRequest(
        SalesLineType.Service,
        data.ServiceId,
        null,
        null,
        "Haircut",
        1,
        price,
        data.ProfessionalId)]);

  private static async Task<TestData> SeedAsync(AppDbContext db)
  {
    var user = new UserEntity { Username = "operator", PasswordHash = "x", Role = UserRole.Manager };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD", DecimalPlaces = 0 };
    var business = new BusinessEntity
    {
      Name = "Prive", PrimaryPhoneNumber = "1", Address = "A", City = "C", Region = "R", Country = "IQ",
      BaseCurrency = currency, IsSetupCompleted = true, TimeZoneId = "Asia/Baghdad"
    };
    var branch = new BranchEntity
    {
      Id = db.SelectedBranchId!.Value,
      Code = "MAIN", Name = "Main", Address = "A", City = "C", Region = "R", Country = "IQ", IsMainBranch = true
    };
    var walkIn = new ContactEntity
    {
      Name = "Walk-in Customer", IsCustomer = true, IsActive = true, SystemRole = ContactSystemRole.WalkInCustomer
    };
    branch.WalkInCustomer = walkIn;
    var customer = new ContactEntity { Name = "Registered Customer", IsCustomer = true, IsActive = true };
    var receivable = new AccountEntity { Code = "13214", Name = "Receivable", Classification = AccountClassification.Asset };
    var revenue = new AccountEntity { Code = "43121", Name = "Service Revenue", Classification = AccountClassification.Revenue };
    var moneyGl = new AccountEntity { Code = "1111", Name = "Cash", Classification = AccountClassification.Asset };
    var secondMoneyGl = new AccountEntity { Code = "1112", Name = "Bank", Classification = AccountClassification.Asset };
    var category = new ServiceCategoryEntity { Name = "Hair" };
    var service = new ServiceEntity
    {
      Name = "Haircut", Category = category, SellingPriceBase = 25_000, DurationMinutes = 30, RevenueAccount = revenue
    };
    var professional = new ProfessionalEntity { Name = "Sara" };
    var moneyAccount = new MoneyAccountEntity
    {
      Code = "CASH-IQD", Name = "Reception Cash", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = currency, AccountingAccount = moneyGl
    };
    var secondMoneyAccount = new MoneyAccountEntity
    {
      Code = "BANK-IQD", Name = "Reception Bank", Type = MoneyAccountType.Bank,
      Branch = branch, Currency = currency, AccountingAccount = secondMoneyGl
    };
    db.AddRange(user, currency, business, branch, walkIn, customer, receivable, revenue, moneyGl, secondMoneyGl,
      category, service, professional, moneyAccount, secondMoneyAccount);
    await db.SaveChangesAsync();
    db.ProfessionalBranchAssignments.Add(new ProfessionalBranchAssignmentEntity
      { ProfessionalId = professional.Id, BranchId = branch.Id });
    db.MoneyAccountAccess.AddRange(
      new MoneyAccountAccessEntity
        { MoneyAccountId = moneyAccount.Id, UserId = user.Id, AccessLevel = MoneyAccountAccessLevel.Operate },
      new MoneyAccountAccessEntity
        { MoneyAccountId = secondMoneyAccount.Id, UserId = user.Id, AccessLevel = MoneyAccountAccessLevel.Operate });
    await db.SaveChangesAsync();
    return new(user.Id, professional.Id, customer.Id, branch.Id, currency.Id, service.Id,
      moneyAccount.Id, secondMoneyAccount.Id);
  }

  private sealed record TestData(
    Guid OperatorId,
    Guid ProfessionalId,
    Guid CustomerId,
    Guid BranchId,
    Guid CurrencyId,
    Guid ServiceId,
    Guid MoneyAccountId,
    Guid SecondMoneyAccountId);

  private sealed class SelectCommandCounter : DbCommandInterceptor
  {
    public int Count { get; private set; }

    public void Reset() => Count = 0;

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
      DbCommand command,
      CommandEventData eventData,
      InterceptionResult<DbDataReader> result,
      CancellationToken cancellationToken = default)
    {
      CountSelect(command);
      return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
      DbCommand command,
      CommandEventData eventData,
      InterceptionResult<object> result,
      CancellationToken cancellationToken = default)
    {
      CountSelect(command);
      return base.ScalarExecutingAsync(command, eventData, result, cancellationToken);
    }

    private void CountSelect(DbCommand command)
    {
      if (command.CommandText.TrimStart().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase)) Count++;
    }
  }
}
