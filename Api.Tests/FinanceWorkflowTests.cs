using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Purchase;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed class FinanceWorkflowTests
{
  [Fact]
  public async Task Money_account_access_is_default_deny_and_operate_includes_view()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);

    Assert.Equal(MoneyAccountAccessLevel.View,
      (await service.GetMoneyAccountAsync(data.SourceMoneyAccountId, data.ViewUserId, default)).CurrentUserAccess);
    await Assert.ThrowsAsync<ForbiddenException>(() =>
      service.GetMoneyAccountAsync(data.SourceMoneyAccountId, data.NoAccessUserId, default));
    await Assert.ThrowsAsync<ForbiddenException>(() => service.CreateMoneyTransferAsync(
      TransferRequest(data, 10), data.ViewUserId, default));

    var draft = await service.CreateMoneyTransferAsync(TransferRequest(data, 10), data.OperatorUserId, default);
    Assert.Equal(FinanceDocumentStatus.Draft, draft.Status);
    Assert.Equal(MoneyAccountAccessLevel.Operate,
      (await service.GetMoneyAccountAsync(data.SourceMoneyAccountId, data.OperatorUserId, default)).CurrentUserAccess);
  }

  [Fact]
  public async Task Transfer_draft_has_no_effect_and_posting_is_balanced_traceable_and_immutable()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    await OpenAsync(service, data.SourceMoneyAccountId, data.OperatorUserId, 1000);
    var ledgerCount = await db.MoneyLedgerEntries.CountAsync();
    var journalCount = await db.JournalEntries.CountAsync();

    var draft = await service.CreateMoneyTransferAsync(TransferRequest(data, 300), data.OperatorUserId, default);
    Assert.Equal(ledgerCount, await db.MoneyLedgerEntries.CountAsync());
    Assert.Equal(journalCount, await db.JournalEntries.CountAsync());

    var posted = await service.PostMoneyTransferAsync(draft.Id, data.OperatorUserId, default);
    Assert.Equal(FinanceDocumentStatus.Posted, posted.Status);
    Assert.Equal(700, await BalanceAsync(db, data.SourceMoneyAccountId));
    Assert.Equal(300, await BalanceAsync(db, data.DestinationMoneyAccountId));
    var movements = await db.MoneyLedgerEntries.Where(entry => entry.SourceDocumentId == draft.Id).ToListAsync();
    Assert.Equal(2, movements.Count);
    Assert.Equal(-300, movements.Single(entry => entry.MoneyAccountId == data.SourceMoneyAccountId).Amount);
    Assert.Equal(300, movements.Single(entry => entry.MoneyAccountId == data.DestinationMoneyAccountId).Amount);
    Assert.All(movements, entry => Assert.Equal(MoneyLedgerSourceType.MoneyTransfer, entry.SourceType));
    Assert.All(movements, entry => Assert.Equal(draft.Id, entry.SourceDocumentId));
    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync(entry => entry.Id == posted.JournalEntryId);
    Assert.Equal(300, journal.Lines.Sum(line => line.DebitBaseAmount));
    Assert.Equal(300, journal.Lines.Sum(line => line.CreditBaseAmount));
    Assert.Equal(data.DestinationGlAccountId, journal.Lines.Single(line => line.DebitBaseAmount > 0).AccountId);
    Assert.Equal(data.SourceGlAccountId, journal.Lines.Single(line => line.CreditBaseAmount > 0).AccountId);

    await Assert.ThrowsAsync<ConflictException>(() => service.PostMoneyTransferAsync(draft.Id, data.OperatorUserId, default));
    await Assert.ThrowsAsync<ConflictException>(() => service.UpdateMoneyTransferAsync(draft.Id, TransferRequest(data, 1), data.OperatorUserId, default));
    await Assert.ThrowsAsync<ConflictException>(() => service.DeleteMoneyTransferAsync(draft.Id, data.OperatorUserId, default));
    var reverse = await Assert.ThrowsAsync<BadRequestException>(() =>
      new AccountingService(db).ReverseJournalAsync(journal.Id, default));
    Assert.Equal(ErrorCodes.Finance.JournalDirectReversalNotAllowed, reverse.Code);
  }

  [Fact]
  public async Task Insufficient_transfer_balance_rejects_all_posting_effects()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    await OpenAsync(service, data.SourceMoneyAccountId, data.OperatorUserId, 100);
    var draft = await service.CreateMoneyTransferAsync(TransferRequest(data, 101), data.OperatorUserId, default);
    var journalCount = await db.JournalEntries.CountAsync();
    var ledgerCount = await db.MoneyLedgerEntries.CountAsync();

    var exception = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.PostMoneyTransferAsync(draft.Id, data.OperatorUserId, default));

    Assert.Equal(ErrorCodes.Finance.InsufficientBalance, exception.Code);
    Assert.Equal(journalCount, await db.JournalEntries.CountAsync());
    Assert.Equal(ledgerCount, await db.MoneyLedgerEntries.CountAsync());
    Assert.Equal(FinanceDocumentStatus.Draft, (await db.MoneyTransfers.FindAsync(draft.Id))!.Status);
  }

  [Fact]
  public async Task Supplier_payment_supports_partial_and_multi_invoice_allocations_and_posts_ap()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    await OpenAsync(service, data.SourceMoneyAccountId, data.OperatorUserId, 1000);
    var request = PaymentRequest(data, 350,
      [new(data.InvoiceOneId, 300), new(data.InvoiceTwoId, 50)]);
    var draft = await service.CreateSupplierPaymentAsync(request, data.OperatorUserId, default);
    Assert.Equal(FinanceDocumentStatus.Draft, draft.Status);
    Assert.Equal(1000, await BalanceAsync(db, data.SourceMoneyAccountId));
    Assert.Equal(0, await PostedPaidAsync(db, data.InvoiceOneId));

    var posted = await service.PostSupplierPaymentAsync(draft.Id, data.OperatorUserId, default);
    Assert.Equal(650, await BalanceAsync(db, data.SourceMoneyAccountId));
    Assert.Equal(300, await PostedPaidAsync(db, data.InvoiceOneId));
    Assert.Equal(50, await PostedPaidAsync(db, data.InvoiceTwoId));
    var outstanding = await service.GetOutstandingPurchaseInvoicesAsync(data.SupplierId, data.BaseCurrencyId, default);
    Assert.Equal(200, outstanding.Single(invoice => invoice.Id == data.InvoiceOneId).OutstandingAmount);
    Assert.Equal(200, outstanding.Single(invoice => invoice.Id == data.InvoiceTwoId).OutstandingAmount);
    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync(entry => entry.Id == posted.JournalEntryId);
    Assert.Equal(data.PayableAccountId, journal.Lines.Single(line => line.DebitBaseAmount > 0).AccountId);
    Assert.Equal(data.SourceGlAccountId, journal.Lines.Single(line => line.CreditBaseAmount > 0).AccountId);
    Assert.Equal(350, journal.Lines.Sum(line => line.DebitBaseAmount));
    Assert.Equal(350, journal.Lines.Sum(line => line.CreditBaseAmount));
    var ledger = await db.MoneyLedgerEntries.SingleAsync(entry => entry.SourceDocumentId == draft.Id);
    Assert.Equal(-350, ledger.Amount);
    Assert.Equal(MoneyLedgerSourceType.SupplierPayment, ledger.SourceType);

    var second = await service.CreateSupplierPaymentAsync(
      PaymentRequest(data, 200, [new(data.InvoiceOneId, 200)]), data.OperatorUserId, default);
    await service.PostSupplierPaymentAsync(second.Id, data.OperatorUserId, default);
    Assert.Equal(500, await PostedPaidAsync(db, data.InvoiceOneId));
    Assert.DoesNotContain(await service.GetOutstandingPurchaseInvoicesAsync(data.SupplierId, data.BaseCurrencyId, default),
      invoice => invoice.Id == data.InvoiceOneId);
  }

  [Fact]
  public async Task Supplier_payment_validation_rejects_overallocation_wrong_supplier_inactive_supplier_and_insufficient_balance()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    await OpenAsync(service, data.SourceMoneyAccountId, data.OperatorUserId, 100);

    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateSupplierPaymentAsync(
      PaymentRequest(data, 501, [new(data.InvoiceOneId, 501)]), data.OperatorUserId, default));
    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateSupplierPaymentAsync(
      PaymentRequest(data, 10, [new(data.OtherSupplierInvoiceId, 10)]), data.OperatorUserId, default));

    var draft = await service.CreateSupplierPaymentAsync(
      PaymentRequest(data, 101, [new(data.InvoiceOneId, 101)]), data.OperatorUserId, default);
    var ledgerCount = await db.MoneyLedgerEntries.CountAsync();
    var journalCount = await db.JournalEntries.CountAsync();
    await Assert.ThrowsAsync<BadRequestException>(() =>
      service.PostSupplierPaymentAsync(draft.Id, data.OperatorUserId, default));
    Assert.Equal(ledgerCount, await db.MoneyLedgerEntries.CountAsync());
    Assert.Equal(journalCount, await db.JournalEntries.CountAsync());
    Assert.Equal(0, await PostedPaidAsync(db, data.InvoiceOneId));

    (await db.Contacts.FindAsync(data.SupplierId))!.IsActive = false;
    await db.SaveChangesAsync();
    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateSupplierPaymentAsync(
      PaymentRequest(data, 10, [new(data.InvoiceOneId, 10)]), data.OperatorUserId, default));
  }

  [Fact]
  public async Task Foreign_currency_documents_preserve_historical_rates_and_base_values()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var firstRate = await service.CreateExchangeRateAsync(
      new CreateExchangeRateRequest(data.ForeignCurrencyId, data.BaseCurrencyId, 1310,
        DateTime.UtcNow.AddHours(-1)), data.OperatorUserId, default);
    await OpenAsync(service, data.ForeignSourceMoneyAccountId, data.OperatorUserId, 100, 1310);

    var transfer = await service.CreateMoneyTransferAsync(new MoneyTransferDraftRequest(
      DateOnly.FromDateTime(DateTime.UtcNow), data.ForeignSourceMoneyAccountId,
      data.ForeignDestinationMoneyAccountId, 25, null), data.OperatorUserId, default);
    Assert.Equal(1310, transfer.ExchangeRate);
    Assert.Equal(32750, transfer.BaseAmount);
    await service.CreateExchangeRateAsync(new CreateExchangeRateRequest(
      data.ForeignCurrencyId, data.BaseCurrencyId, 1320, DateTime.UtcNow), data.OperatorUserId, default);
    await service.DeactivateExchangeRateAsync(firstRate.Id, default);

    var posted = await service.PostMoneyTransferAsync(transfer.Id, data.OperatorUserId, default);
    Assert.Equal(1310, posted.ExchangeRate);
    Assert.Equal(32750, posted.BaseAmount);
    Assert.All(await db.MoneyLedgerEntries.Where(entry => entry.SourceDocumentId == transfer.Id).ToListAsync(),
      entry => Assert.Equal(1310, entry.ExchangeRate));
  }

  [Fact]
  public async Task Linked_gl_must_be_active_posting_asset_and_opening_balance_is_not_editable_balance()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var invalid = new MoneyAccountRequest("INVALID", "Invalid", MoneyAccountType.Cashbox,
      data.BranchId, data.BaseCurrencyId, data.PayableAccountId, true, null, null, null);
    var exception = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CreateMoneyAccountAsync(invalid, data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.AccountMappingInvalid, exception.Code);

    await OpenAsync(service, data.SourceMoneyAccountId, data.OperatorUserId, 50);
    await Assert.ThrowsAsync<ConflictException>(() =>
      OpenAsync(service, data.SourceMoneyAccountId, data.OperatorUserId, 50));
    Assert.Equal(50, (await service.GetMoneyAccountAsync(data.SourceMoneyAccountId, data.OperatorUserId, default)).Balance);
  }

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
    return new AppDbContext(options);
  }

  private static FinanceService CreateService(AppDbContext db) => new(db, Options.Create(new FinanceOptions
  {
    AccountsPayableAccountCode = "23214",
    OpeningBalanceEquityAccountCode = "261"
  }));

  private static Task<MoneyLedgerEntryResponse> OpenAsync(
    FinanceService service,
    Guid accountId,
    Guid userId,
    decimal amount,
    decimal? rate = null) => service.PostOpeningMoneyBalanceAsync(accountId,
      new OpeningMoneyBalanceRequest(DateOnly.FromDateTime(DateTime.UtcNow), amount, rate, "Opening"), userId, default);

  private static MoneyTransferDraftRequest TransferRequest(TestData data, decimal amount) => new(
    DateOnly.FromDateTime(DateTime.UtcNow), data.SourceMoneyAccountId, data.DestinationMoneyAccountId, amount, "Transfer");

  private static SupplierPaymentDraftRequest PaymentRequest(
    TestData data,
    decimal amount,
    List<SupplierPaymentAllocationRequest> allocations) => new(
      data.SupplierId, DateOnly.FromDateTime(DateTime.UtcNow), data.SourceMoneyAccountId,
      null, amount, "Payment", allocations);

  private static Task<decimal> BalanceAsync(AppDbContext db, Guid accountId) =>
    db.MoneyLedgerEntries.Where(entry => entry.MoneyAccountId == accountId).SumAsync(entry => entry.Amount);

  private static Task<decimal> PostedPaidAsync(AppDbContext db, Guid invoiceId) =>
    db.SupplierPaymentAllocations.Where(allocation => allocation.PurchaseInvoiceId == invoiceId
      && allocation.SupplierPayment.Status == FinanceDocumentStatus.Posted).SumAsync(allocation => allocation.Amount);

  private static async Task<TestData> SeedAsync(AppDbContext db)
  {
    var manager = new UserEntity { Username = "manager", PasswordHash = "test", Role = UserRole.Manager };
    var viewer = new UserEntity { Username = "viewer", PasswordHash = "test", Role = UserRole.Cashier };
    var outsider = new UserEntity { Username = "outsider", PasswordHash = "test", Role = UserRole.Cashier };
    var iqd = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD", DecimalPlaces = 0 };
    var usd = new CurrencyEntity { Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2 };
    var business = new BusinessEntity
    {
      Name = "Prive", PrimaryPhoneNumber = "1", Address = "A", City = "C", Region = "R", Country = "IQ",
      BaseCurrency = iqd, IsSetupCompleted = true
    };
    var branch = new BranchEntity
    {
      Code = "MAIN", Name = "Main", Address = "A", City = "C", Region = "R", Country = "IQ", IsMainBranch = true
    };
    var supplier = new ContactEntity { Name = "Supplier", IsSupplier = true };
    var otherSupplier = new ContactEntity { Name = "Other supplier", IsSupplier = true };
    var sourceGl = new AccountEntity { Code = "134111", Name = "Cash", Classification = AccountClassification.Asset };
    var destinationGl = new AccountEntity { Code = "13421", Name = "Bank", Classification = AccountClassification.Asset };
    var foreignSourceGl = new AccountEntity { Code = "134112", Name = "USD Cash", Classification = AccountClassification.Asset };
    var foreignDestinationGl = new AccountEntity { Code = "13422", Name = "USD Bank", Classification = AccountClassification.Asset };
    var payable = new AccountEntity { Code = "23214", Name = "AP", Classification = AccountClassification.Liability };
    var equity = new AccountEntity { Code = "261", Name = "Capital", Classification = AccountClassification.Equity };
    var warehouse = new WarehouseEntity { Code = "MAIN", Name = "Main", Branch = branch };
    var source = new MoneyAccountEntity
    {
      Code = "CASH-IQD", Name = "Cash IQD", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = iqd, AccountingAccount = sourceGl
    };
    var destination = new MoneyAccountEntity
    {
      Code = "BANK-IQD", Name = "Bank IQD", Type = MoneyAccountType.Bank,
      Branch = branch, Currency = iqd, AccountingAccount = destinationGl
    };
    var foreignSource = new MoneyAccountEntity
    {
      Code = "CASH-USD", Name = "Cash USD", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = usd, AccountingAccount = foreignSourceGl
    };
    var foreignDestination = new MoneyAccountEntity
    {
      Code = "BANK-USD", Name = "Bank USD", Type = MoneyAccountType.Bank,
      Branch = branch, Currency = usd, AccountingAccount = foreignDestinationGl
    };
    db.AddRange(manager, viewer, outsider, iqd, usd, business, branch, supplier, otherSupplier,
      sourceGl, destinationGl, foreignSourceGl, foreignDestinationGl, payable, equity, warehouse,
      source, destination, foreignSource, foreignDestination);
    await db.SaveChangesAsync();
    foreach (var account in new[] { source, destination, foreignSource, foreignDestination })
    {
      db.MoneyAccountAccess.Add(new MoneyAccountAccessEntity
      {
        MoneyAccountId = account.Id, UserId = manager.Id, AccessLevel = MoneyAccountAccessLevel.Operate
      });
      db.MoneyAccountAccess.Add(new MoneyAccountAccessEntity
      {
        MoneyAccountId = account.Id, UserId = viewer.Id, AccessLevel = MoneyAccountAccessLevel.View
      });
    }
    var invoiceOne = Invoice("PI-000001", supplier, branch, warehouse, iqd, manager, 500);
    var invoiceTwo = Invoice("PI-000002", supplier, branch, warehouse, iqd, manager, 250);
    var otherInvoice = Invoice("PI-000003", otherSupplier, branch, warehouse, iqd, manager, 100);
    db.AddRange(invoiceOne, invoiceTwo, otherInvoice);
    await db.SaveChangesAsync();
    return new(manager.Id, viewer.Id, outsider.Id, supplier.Id, branch.Id, iqd.Id, usd.Id,
      source.Id, destination.Id, foreignSource.Id, foreignDestination.Id,
      sourceGl.Id, destinationGl.Id, payable.Id, invoiceOne.Id, invoiceTwo.Id, otherInvoice.Id);
  }

  private static PurchaseInvoiceEntity Invoice(
    string number,
    ContactEntity supplier,
    BranchEntity branch,
    WarehouseEntity warehouse,
    CurrencyEntity currency,
    UserEntity createdBy,
    decimal total) => new()
  {
    DocumentNumber = number,
    Supplier = supplier,
    InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
    Branch = branch,
    Warehouse = warehouse,
    Currency = currency,
    BaseCurrency = currency,
    ExchangeRate = 1,
    Total = total,
    BaseTotal = total,
    Subtotal = total,
    Status = PurchaseInvoiceStatus.Posted,
    CreatedByUser = createdBy,
    PostedAtUtc = DateTime.UtcNow
  };

  private sealed record TestData(
    Guid OperatorUserId,
    Guid ViewUserId,
    Guid NoAccessUserId,
    Guid SupplierId,
    Guid BranchId,
    Guid BaseCurrencyId,
    Guid ForeignCurrencyId,
    Guid SourceMoneyAccountId,
    Guid DestinationMoneyAccountId,
    Guid ForeignSourceMoneyAccountId,
    Guid ForeignDestinationMoneyAccountId,
    Guid SourceGlAccountId,
    Guid DestinationGlAccountId,
    Guid PayableAccountId,
    Guid InvoiceOneId,
    Guid InvoiceTwoId,
    Guid OtherSupplierInvoiceId);
}
