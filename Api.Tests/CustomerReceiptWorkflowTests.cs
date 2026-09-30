using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed class CustomerReceiptWorkflowTests
{
  [Fact]
  public async Task Draft_create_edit_and_delete_have_no_financial_or_settlement_effect()
  {
    var databaseName = Guid.NewGuid().ToString();
    await using var db = CreateDb(databaseName);
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var draft = await service.CreateCustomerReceiptAsync(
      Receipt(data, 100, [new(data.InvoiceOneId, 50), new(data.InvoiceTwoId, 50)]), data.OperatorUserId, default);

    Assert.Equal("REC-000001", draft.DocumentNumber);
    Assert.Equal(FinanceDocumentStatus.Draft, draft.Status);
    Assert.Empty(db.MoneyLedgerEntries);
    Assert.Empty(db.JournalEntries);
    Assert.Equal(2, await db.CustomerReceiptDraftAllocations.AsNoTracking().CountAsync());
    Assert.Equal(0, await PostedReceivedAsync(db, data.InvoiceOneId));

    await using var editDb = CreateDb(databaseName);
    var editService = CreateService(editDb);
    var updated = await editService.UpdateCustomerReceiptAsync(draft.Id,
      Receipt(data, 120, [new(data.InvoiceTwoId, 120)]), data.OperatorUserId, default);
    Assert.Empty(editDb.MoneyLedgerEntries);
    Assert.Empty(editDb.JournalEntries);
    Assert.Equal(0, await PostedReceivedAsync(editDb, data.InvoiceOneId));
    Assert.Equal(data.InvoiceTwoId, Assert.Single(updated.Allocations).SalesInvoiceId);

    await using var deleteDb = CreateDb(databaseName);
    var deleteService = CreateService(deleteDb);
    await deleteService.DeleteCustomerReceiptAsync(draft.Id, data.OperatorUserId, default);
    Assert.Empty(deleteDb.CustomerReceipts);
    Assert.Equal(500, (await deleteService.GetOutstandingSalesInvoicesAsync(
      data.CustomerId, data.BaseCurrencyId, default)).Single(invoice => invoice.Id == data.InvoiceOneId).OutstandingAmount);
  }

  [Fact]
  public async Task Posting_supports_partial_and_multi_invoice_allocations_with_complete_traceability()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var draft = await service.CreateCustomerReceiptAsync(
      Receipt(data, 350, [new(data.InvoiceOneId, 300), new(data.InvoiceTwoId, 50)]),
      data.OperatorUserId, default);

    var posted = await service.PostCustomerReceiptAsync(draft.Id, data.OperatorUserId, default);

    Assert.Equal(FinanceDocumentStatus.Posted, posted.Status);
    Assert.Equal(350, await BalanceAsync(db, data.MoneyAccountId));
    Assert.Empty(db.StockMovements);
    Assert.NotNull(posted.PaymentId);
    Assert.NotNull(posted.PaymentJournalEntryId);
    Assert.Empty(db.CustomerReceiptDraftAllocations);
    var ledger = await db.MoneyLedgerEntries.SingleAsync(entry => entry.SourceDocumentId == posted.PaymentId);
    Assert.Equal(MoneyLedgerSourceType.Payment, ledger.SourceType);
    Assert.Equal(350, ledger.Amount);
    Assert.Equal(posted.PaymentId, ledger.SourceDocumentId);

    var journal = await db.JournalEntries.Include(entry => entry.Lines)
      .SingleAsync(entry => entry.Id == posted.PaymentJournalEntryId);
    Assert.Equal(data.MoneyAccountGlId, journal.Lines.Single(line => line.DebitBaseAmount > 0).AccountId);
    Assert.Equal(data.ReceivableAccountId, journal.Lines.Single(line => line.CreditBaseAmount > 0).AccountId);
    Assert.Equal(350, journal.Lines.Sum(line => line.DebitBaseAmount));
    Assert.Equal(350, journal.Lines.Sum(line => line.CreditBaseAmount));
    Assert.Equal(posted.PaymentId, journal.SourcePayment!.Id);

    var payment = await new PaymentService(db).GetAsync(posted.PaymentId!.Value, default);
    Assert.Equal(PaymentOrigin.CustomerReceipt, payment.Origin);
    Assert.Equal(posted.Id, payment.OriginSourceId);
    Assert.Equal(posted.DocumentNumber, payment.OriginSourceDocumentNumber);

    var sales = CreateSalesService(db);
    var firstInvoice = await sales.GetInvoiceAsync(data.InvoiceOneId, default);
    Assert.Equal(300, firstInvoice.CollectedAmount);
    Assert.Equal(200, firstInvoice.OutstandingAmount);
    Assert.Equal(SalesInvoicePaymentStatus.PartiallyPaid, firstInvoice.PaymentStatus);
    Assert.Equal(posted.PaymentId, Assert.Single(firstInvoice.Payments).PaymentId);
    var secondInvoice = await sales.GetInvoiceAsync(data.InvoiceTwoId, default);
    Assert.Equal(50, secondInvoice.CollectedAmount);
    Assert.Equal(200, secondInvoice.OutstandingAmount);

    var accounting = await new AccountingService(db).GetJournalAsync(journal.Id, default);
    Assert.Equal(posted.PaymentId, accounting.SourcePaymentId);
    var reverse = await Assert.ThrowsAsync<BadRequestException>(() =>
      new AccountingService(db).ReverseJournalAsync(journal.Id, default));
    Assert.Equal(ErrorCodes.Finance.JournalDirectReversalNotAllowed, reverse.Code);
  }

  [Fact]
  public async Task Multiple_receipts_can_fully_settle_one_invoice_and_derive_paid_state()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);

    var first = await service.CreateCustomerReceiptAsync(
      Receipt(data, 200, [new(data.InvoiceOneId, 200)]), data.OperatorUserId, default);
    await service.PostCustomerReceiptAsync(first.Id, data.OperatorUserId, default);
    var second = await service.CreateCustomerReceiptAsync(
      Receipt(data, 300, [new(data.InvoiceOneId, 300)]), data.OperatorUserId, default);
    await service.PostCustomerReceiptAsync(second.Id, data.OperatorUserId, default);

    Assert.Equal(500, await PostedReceivedAsync(db, data.InvoiceOneId));
    Assert.DoesNotContain(await service.GetOutstandingSalesInvoicesAsync(data.CustomerId, data.BaseCurrencyId, default),
      invoice => invoice.Id == data.InvoiceOneId);
    var invoice = await CreateSalesService(db).GetInvoiceAsync(data.InvoiceOneId, default);
    Assert.Equal(0, invoice.OutstandingAmount);
    Assert.Equal(SalesInvoicePaymentStatus.Paid, invoice.PaymentStatus);
    Assert.Equal(2, invoice.Payments.Count);
    Assert.Equal(ErrorCodes.Finance.ReceiptAllocationExceedsOutstanding,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 1, [new(data.InvoiceOneId, 1)]), data.OperatorUserId, default))).Code);
  }

  [Fact]
  public async Task Posting_revalidates_outstanding_and_rejects_a_competing_draft_without_partial_effects()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var first = await service.CreateCustomerReceiptAsync(
      Receipt(data, 200, [new(data.InvoiceTwoId, 200)]), data.OperatorUserId, default);
    var competing = await service.CreateCustomerReceiptAsync(
      Receipt(data, 100, [new(data.InvoiceTwoId, 100)]), data.OperatorUserId, default);
    await service.PostCustomerReceiptAsync(first.Id, data.OperatorUserId, default);
    var ledgerCount = await db.MoneyLedgerEntries.CountAsync();
    var journalCount = await db.JournalEntries.CountAsync();

    var exception = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.PostCustomerReceiptAsync(competing.Id, data.OperatorUserId, default));

    Assert.Equal(ErrorCodes.Finance.ReceiptAllocationExceedsOutstanding, exception.Code);
    Assert.Equal(ledgerCount, await db.MoneyLedgerEntries.CountAsync());
    Assert.Equal(journalCount, await db.JournalEntries.CountAsync());
    Assert.Equal(FinanceDocumentStatus.Draft, (await db.CustomerReceipts.FindAsync(competing.Id))!.Status);
    Assert.Equal(200, await PostedReceivedAsync(db, data.InvoiceTwoId));
  }

  [Fact]
  public async Task Validation_rejects_wrong_customer_draft_invoice_unallocated_total_and_invalid_customers()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);

    Assert.Equal(ErrorCodes.Finance.ReceiptCustomerMismatch,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 10, [new(data.OtherCustomerInvoiceId, 10)]), data.OperatorUserId, default))).Code);
    Assert.Equal(ErrorCodes.Finance.SalesInvoiceInvalid,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 10, [new(data.DraftInvoiceId, 10)]), data.OperatorUserId, default))).Code);
    Assert.Equal(ErrorCodes.Finance.ReceiptMustBeFullyAllocated,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 20, [new(data.InvoiceOneId, 10)]), data.OperatorUserId, default))).Code);
    Assert.Equal(ErrorCodes.Finance.CustomerInvalid,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 10, [new(data.InvoiceOneId, 10)]) with { CustomerId = data.InactiveCustomerId },
        data.OperatorUserId, default))).Code);
    Assert.Equal(ErrorCodes.Finance.CustomerInvalid,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 10, [new(data.InvoiceOneId, 10)]) with { CustomerId = data.NonCustomerId },
        data.OperatorUserId, default))).Code);
    Assert.Equal(ErrorCodes.Finance.ReceiptAllocationExceedsOutstanding,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 501, [new(data.InvoiceOneId, 501)]), data.OperatorUserId, default))).Code);
    Assert.Equal(ErrorCodes.Finance.ReceiptAllocationInvalid,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 0, [new(data.InvoiceOneId, 0)]), data.OperatorUserId, default))).Code);
  }

  [Fact]
  public async Task Operate_access_is_required_and_posted_receipts_are_immutable()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var request = Receipt(data, 100, [new(data.InvoiceOneId, 100)]);

    await Assert.ThrowsAsync<ForbiddenException>(() =>
      service.CreateCustomerReceiptAsync(request, data.ViewUserId, default));
    await Assert.ThrowsAsync<ForbiddenException>(() =>
      service.CreateCustomerReceiptAsync(request, data.NoAccessUserId, default));

    var draft = await service.CreateCustomerReceiptAsync(request, data.OperatorUserId, default);
    await Assert.ThrowsAsync<ForbiddenException>(() =>
      service.PostCustomerReceiptAsync(draft.Id, data.ViewUserId, default));
    await Assert.ThrowsAsync<ForbiddenException>(() =>
      service.PostCustomerReceiptAsync(draft.Id, data.NoAccessUserId, default));
    await service.PostCustomerReceiptAsync(draft.Id, data.OperatorUserId, default);
    await Assert.ThrowsAsync<ConflictException>(() =>
      service.PostCustomerReceiptAsync(draft.Id, data.OperatorUserId, default));
    await Assert.ThrowsAsync<ConflictException>(() =>
      service.UpdateCustomerReceiptAsync(draft.Id, request, data.OperatorUserId, default));
    await Assert.ThrowsAsync<ConflictException>(() =>
      service.DeleteCustomerReceiptAsync(draft.Id, data.OperatorUserId, default));
  }

  [Fact]
  public async Task Base_and_foreign_receipts_preserve_safe_rates_and_reject_cross_currency_or_rate_mismatch()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var baseDraft = await service.CreateCustomerReceiptAsync(
      Receipt(data, 10, [new(data.InvoiceOneId, 10)]) with { ExchangeRate = 999 },
      data.OperatorUserId, default);
    Assert.Equal(1, baseDraft.ExchangeRate);
    Assert.Equal(10, baseDraft.BaseTotalAmount);

    var foreignRequest = Receipt(data, 100, [new(data.ForeignInvoiceId, 100)]) with
    {
      MoneyAccountId = data.ForeignMoneyAccountId,
      ExchangeRate = 1310
    };
    var foreignDraft = await service.CreateCustomerReceiptAsync(foreignRequest, data.OperatorUserId, default);
    var foreign = await service.PostCustomerReceiptAsync(foreignDraft.Id, data.OperatorUserId, default);
    Assert.Equal(data.ForeignCurrencyId, foreign.CurrencyId);
    Assert.Equal(1310, foreign.ExchangeRate);
    Assert.Equal(131_000, foreign.BaseTotalAmount);
    Assert.Equal(131_000, (await db.MoneyLedgerEntries.SingleAsync(
      entry => entry.SourceDocumentId == foreign.PaymentId)).BaseAmount);

    Assert.Equal(ErrorCodes.Finance.ReceiptExchangeRateMismatch,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        foreignRequest with { TotalAmount = 10, Allocations = [new(data.ForeignRateMismatchInvoiceId, 10)] },
        data.OperatorUserId, default))).Code);
    Assert.Equal(ErrorCodes.Finance.ReceiptCurrencyMismatch,
      (await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerReceiptAsync(
        Receipt(data, 10, [new(data.ForeignRateMismatchInvoiceId, 10)]), data.OperatorUserId, default))).Code);
  }

  [Fact]
  public async Task Missing_invoice_receivable_account_is_atomic_and_list_uses_shared_pagination()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var first = await service.CreateCustomerReceiptAsync(
      Receipt(data, 10, [new(data.InvoiceOneId, 10)]), data.OperatorUserId, default);
    await service.CreateCustomerReceiptAsync(
      Receipt(data, 20, [new(data.InvoiceOneId, 20)]), data.OperatorUserId, default);
    await service.CreateCustomerReceiptAsync(
      Receipt(data, 30, [new(data.InvoiceOneId, 30)]), data.OperatorUserId, default);
    var invoiceWithoutReceivable = await db.SalesInvoices.SingleAsync(item => item.Id == data.InvoiceOneId);
    invoiceWithoutReceivable.AccountsReceivableAccountId = null;
    await db.SaveChangesAsync();

    var exception = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.PostCustomerReceiptAsync(first.Id, data.OperatorUserId, default));

    Assert.Equal(ErrorCodes.Finance.PaymentReceivableAccountMissing, exception.Code);
    Assert.Empty(db.MoneyLedgerEntries);
    Assert.Empty(db.JournalEntries);
    Assert.Equal(0, await PostedReceivedAsync(db, data.InvoiceOneId));
    Assert.Equal(FinanceDocumentStatus.Draft, (await db.CustomerReceipts.FindAsync(first.Id))!.Status);

    var page = await service.GetCustomerReceiptsAsync(new CustomerReceiptListQuery
    {
      Page = 2,
      PageSize = 2,
      Search = "REC-",
      CustomerId = data.CustomerId,
      BranchId = data.BranchId,
      CurrencyId = data.BaseCurrencyId,
      Status = FinanceDocumentStatus.Draft
    }, data.OperatorUserId, default);
    Assert.Single(page.Items);
    Assert.Equal(3, page.TotalCount);
    Assert.Equal(2, page.Page);
    Assert.Equal(2, page.TotalPages);
  }

  [Fact]
  public async Task Payment_core_enforces_customer_branch_currency_and_source_invoice_ownership()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var payments = new PaymentService(db);
    var today = DateOnly.FromDateTime(DateTime.UtcNow);

    CreatePaymentCommand Command(
      Guid customerId,
      Guid branchId,
      Guid currencyId,
      PaymentOrigin origin,
      Guid? sourceInvoiceId,
      params PaymentAllocationCommand[] allocations) => new(
        branchId, customerId, today, currencyId, origin, sourceInvoiceId, null,
        allocations,
        [new PaymentMoneyLineCommand(data.MoneyAccountId, allocations.Sum(item => item.Amount), 1,
          PaymentMoneyDirection.Collection)]);

    var customerMismatch = await Assert.ThrowsAsync<BadRequestException>(() => payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.BaseCurrencyId, PaymentOrigin.CustomerReceipt, null,
        new PaymentAllocationCommand(data.OtherCustomerInvoiceId, 10)), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentCustomerMismatch, customerMismatch.Code);

    var branchMismatch = await Assert.ThrowsAsync<BadRequestException>(() => payments.CreateAsync(
      Command(data.CustomerId, Guid.NewGuid(), data.BaseCurrencyId, PaymentOrigin.CustomerReceipt, null,
        new PaymentAllocationCommand(data.InvoiceOneId, 10)), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentBranchMismatch, branchMismatch.Code);

    var currencyMismatch = await Assert.ThrowsAsync<BadRequestException>(() => payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.ForeignCurrencyId, PaymentOrigin.CustomerReceipt, null,
        new PaymentAllocationCommand(data.InvoiceOneId, 10)), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentCurrencyMismatch, currencyMismatch.Code);

    var directSourceMismatch = await Assert.ThrowsAsync<BadRequestException>(() => payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.BaseCurrencyId, PaymentOrigin.SalesInvoice,
        data.InvoiceOneId, new PaymentAllocationCommand(data.InvoiceTwoId, 10)), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentSourceInvoiceMismatch, directSourceMismatch.Code);

    var directWithoutAllocation = await Assert.ThrowsAsync<BadRequestException>(() => payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.BaseCurrencyId, PaymentOrigin.SalesInvoice,
        data.InvoiceOneId), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentAllocationsRequired, directWithoutAllocation.Code);

    var directWithMultipleAllocations = await Assert.ThrowsAsync<BadRequestException>(() => payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.BaseCurrencyId, PaymentOrigin.SalesInvoice,
        data.InvoiceOneId, new PaymentAllocationCommand(data.InvoiceOneId, 10),
        new PaymentAllocationCommand(data.InvoiceTwoId, 10)), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentSourceInvoiceMismatch, directWithMultipleAllocations.Code);

    var posSourceMismatch = await Assert.ThrowsAsync<BadRequestException>(() => payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.BaseCurrencyId, PaymentOrigin.Pos,
        data.InvoiceOneId, new PaymentAllocationCommand(data.InvoiceTwoId, 10)), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentSourceInvoiceMismatch, posSourceMismatch.Code);

    var posWithMultipleAllocations = await Assert.ThrowsAsync<BadRequestException>(() => payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.BaseCurrencyId, PaymentOrigin.Pos,
        data.InvoiceOneId, new PaymentAllocationCommand(data.InvoiceOneId, 10),
        new PaymentAllocationCommand(data.InvoiceTwoId, 10)), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentSourceInvoiceMismatch, posWithMultipleAllocations.Code);

    var receiptPayment = await payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.BaseCurrencyId, PaymentOrigin.CustomerReceipt, null,
        new PaymentAllocationCommand(data.InvoiceOneId, 50),
        new PaymentAllocationCommand(data.InvoiceTwoId, 50)), data.OperatorUserId, default);
    var posPayment = await payments.CreateAsync(
      Command(data.CustomerId, data.BranchId, data.BaseCurrencyId, PaymentOrigin.Pos,
        data.InvoiceOneId, new PaymentAllocationCommand(data.InvoiceOneId, 25)), data.OperatorUserId, default);
    await db.SaveChangesAsync();

    Assert.Equal(2, receiptPayment.Allocations.Count);
    Assert.Single(posPayment.Allocations);
    Assert.Equal(data.InvoiceOneId, posPayment.Allocations.Single().SalesInvoiceId);
  }

  [Fact]
  public async Task Direct_payment_edit_and_delete_regenerate_effects_on_the_same_payment()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var payments = new PaymentService(db);
    var today = DateOnly.FromDateTime(DateTime.UtcNow);

    var created = await payments.CreateInvoicePaymentAsync(data.InvoiceOneId,
      new InvoicePaymentRequest(today, data.MoneyAccountId, 100, null, "Deposit"),
      data.OperatorUserId, default);
    Assert.Equal("PAY-000001", created.DocumentNumber);
    var originalJournalId = created.JournalEntryId;

    var wrongSource = await Assert.ThrowsAsync<BadRequestException>(() =>
      payments.UpdateInvoicePaymentAsync(data.InvoiceTwoId, created.Id,
        new UpdateInvoicePaymentRequest(today, data.MoneyAccountId, 80, null, "Correction",
          "Wrong invoice", created.UpdatedAtUtc), data.OperatorUserId, default));
    Assert.Equal(ErrorCodes.Finance.PaymentSourceInvoiceMismatch, wrongSource.Code);

    var updated = await payments.UpdateInvoicePaymentAsync(data.InvoiceOneId, created.Id,
      new UpdateInvoicePaymentRequest(today, data.MoneyAccountId, 80, null, "Corrected deposit",
        "Correct amount", created.UpdatedAtUtc), data.OperatorUserId, default);

    Assert.Equal(created.Id, updated.Id);
    Assert.Equal(created.DocumentNumber, updated.DocumentNumber);
    Assert.Equal(80, updated.Amount);
    Assert.NotEqual(originalJournalId, updated.JournalEntryId);
    Assert.False(await db.JournalEntries.AnyAsync(item => item.Id == originalJournalId));
    Assert.Equal(80, await PostedReceivedAsync(db, data.InvoiceOneId));

    await payments.DeleteInvoicePaymentAsync(data.InvoiceOneId, updated.Id,
      new DeletePaymentRequest("Entered twice", updated.UpdatedAtUtc), data.OperatorUserId, default);

    Assert.False(await db.Payments.AnyAsync(item => item.Id == updated.Id));
    var deleted = await db.Payments.IgnoreQueryFilters().SingleAsync(item => item.Id == updated.Id);
    Assert.True(deleted.IsDeleted);
    Assert.Null(deleted.JournalEntryId);
    Assert.Empty(db.PaymentAllocations);
    Assert.Empty(db.PaymentMoneyLines);
    Assert.Empty(db.MoneyLedgerEntries);
    Assert.Equal(2, await db.ActivityLogs.CountAsync(item => item.EntityId == updated.Id));
  }

  [Fact]
  public async Task Customer_account_summary_and_statement_are_derived_from_invoices_and_allocations()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var payments = new PaymentService(db);
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    await payments.CreateAsync(new CreatePaymentCommand(
      data.BranchId, data.CustomerId, today, data.BaseCurrencyId, PaymentOrigin.CustomerReceipt,
      null, "Account settlement",
      [new(data.InvoiceOneId, 500), new(data.InvoiceTwoId, 50)],
      [new(data.MoneyAccountId, 550, 1, PaymentMoneyDirection.Collection)]),
      data.OperatorUserId, default);
    await db.SaveChangesAsync();

    var reader = new CustomerAccountReader(db);
    var summary = await reader.GetSummaryAsync(data.CustomerId, default);
    Assert.Equal(197_750, summary.TotalReceivable);
    Assert.Equal(550, summary.TotalCollected);
    Assert.Equal(197_200, summary.NetBalance);
    Assert.Equal(197_200, summary.Outstanding);
    Assert.Equal(0, summary.Credit);
    Assert.Equal(2, summary.Currencies.Count);

    var statement = await reader.GetStatementAsync(data.CustomerId, new CustomerAccountStatementQuery
    {
      FromDate = today,
      ToDate = today,
      PageNumber = 1,
      PageSize = 25
    }, default);
    Assert.Equal(0, statement.OpeningBalance);
    Assert.Equal(197_200, statement.ClosingBalance);
    Assert.Equal(5, statement.Entries.Count);
    Assert.Equal(CustomerAccountEntryType.Invoice, statement.Entries[0].EntryType);
    Assert.Equal(CustomerAccountEntryType.Payment, statement.Entries[^1].EntryType);
    Assert.Equal(197_200, statement.Entries[^1].RunningBaseBalance);
  }

  private static AppDbContext CreateDb(string? databaseName = null)
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString()).Options;
    return new AppDbContext(options);
  }

  private static FinanceService CreateService(AppDbContext db, string receivableCode = "13214") => new(
    db,
    Options.Create(new FinanceOptions
    {
      AccountsPayableAccountCode = "23214",
      AccountsReceivableAccountCode = receivableCode,
      OpeningBalanceEquityAccountCode = "261"
    }));

  private static SalesService CreateSalesService(AppDbContext db) => new(
    db,
    Options.Create(new SalesOptions
    {
      AccountsReceivableAccountCode = "13214",
      ProductRevenueAccountCode = "4211",
      CostOfGoodsSoldAccountCode = "3641",
      InventoryAccountCode = "1317"
    }));

  private static CustomerReceiptDraftRequest Receipt(
    TestData data,
    decimal amount,
    List<CustomerReceiptAllocationRequest> allocations) => new(
      data.CustomerId,
      DateOnly.FromDateTime(DateTime.UtcNow),
      data.MoneyAccountId,
      null,
      amount,
      "Receipt",
      allocations);

  private static Task<decimal> BalanceAsync(AppDbContext db, Guid moneyAccountId) =>
    db.MoneyLedgerEntries.Where(entry => entry.MoneyAccountId == moneyAccountId).SumAsync(entry => entry.Amount);

  private static Task<decimal> PostedReceivedAsync(AppDbContext db, Guid invoiceId) =>
    db.PaymentAllocations.Where(allocation => allocation.SalesInvoiceId == invoiceId)
      .SumAsync(allocation => allocation.Amount);

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
    var customer = new ContactEntity { Name = "Customer", IsCustomer = true };
    var otherCustomer = new ContactEntity { Name = "Other customer", IsCustomer = true };
    var inactiveCustomer = new ContactEntity { Name = "Inactive customer", IsCustomer = true, IsActive = false };
    var nonCustomer = new ContactEntity { Name = "Supplier only", IsSupplier = true };
    var moneyGl = new AccountEntity { Code = "134111", Name = "Cash", Classification = AccountClassification.Asset };
    var foreignMoneyGl = new AccountEntity { Code = "134112", Name = "USD Cash", Classification = AccountClassification.Asset };
    var receivable = new AccountEntity { Code = "13214", Name = "Accounts Receivable", Classification = AccountClassification.Asset };
    var moneyAccount = new MoneyAccountEntity
    {
      Code = "CASH-IQD", Name = "Cash IQD", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = iqd, AccountingAccount = moneyGl
    };
    var foreignMoneyAccount = new MoneyAccountEntity
    {
      Code = "CASH-USD", Name = "Cash USD", Type = MoneyAccountType.Cashbox,
      Branch = branch, Currency = usd, AccountingAccount = foreignMoneyGl
    };
    db.AddRange(manager, viewer, outsider, iqd, usd, business, branch, customer, otherCustomer,
      inactiveCustomer, nonCustomer, moneyGl, foreignMoneyGl, receivable, moneyAccount, foreignMoneyAccount);
    db.PaymentDocumentCounters.Add(new PaymentDocumentCounterEntity { Id = 1, NextValue = 1 });
    await db.SaveChangesAsync();
    foreach (var account in new[] { moneyAccount, foreignMoneyAccount })
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

    var invoiceOne = Invoice("SI-000001", customer, branch, iqd, iqd, manager, 500, 1, SalesInvoiceStatus.Posted);
    var invoiceTwo = Invoice("SI-000002", customer, branch, iqd, iqd, manager, 250, 1, SalesInvoiceStatus.Posted);
    var otherInvoice = Invoice("SI-000003", otherCustomer, branch, iqd, iqd, manager, 100, 1, SalesInvoiceStatus.Posted);
    var draftInvoice = Invoice("SI-000004", customer, branch, iqd, iqd, manager, 100, 1, SalesInvoiceStatus.Draft);
    var foreignInvoice = Invoice("SI-000005", customer, branch, usd, iqd, manager, 100, 1310, SalesInvoiceStatus.Posted);
    var mismatchInvoice = Invoice("SI-000006", customer, branch, usd, iqd, manager, 50, 1320, SalesInvoiceStatus.Posted);
    foreach (var invoice in new[] { invoiceOne, invoiceTwo, otherInvoice, draftInvoice, foreignInvoice, mismatchInvoice })
      invoice.AccountsReceivableAccountId = receivable.Id;
    db.AddRange(invoiceOne, invoiceTwo, otherInvoice, draftInvoice, foreignInvoice, mismatchInvoice);
    await db.SaveChangesAsync();
    return new TestData(manager.Id, viewer.Id, outsider.Id, customer.Id, inactiveCustomer.Id, nonCustomer.Id,
      branch.Id, iqd.Id, usd.Id, moneyAccount.Id, foreignMoneyAccount.Id, moneyGl.Id, receivable.Id,
      invoiceOne.Id, invoiceTwo.Id, otherInvoice.Id, draftInvoice.Id, foreignInvoice.Id, mismatchInvoice.Id);
  }

  private static SalesInvoiceEntity Invoice(
    string number,
    ContactEntity customer,
    BranchEntity branch,
    CurrencyEntity currency,
    CurrencyEntity baseCurrency,
    UserEntity createdBy,
    decimal total,
    decimal rate,
    SalesInvoiceStatus status) => new()
  {
    DocumentNumber = number,
    Customer = customer,
    InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
    Branch = branch,
    Currency = currency,
    BaseCurrency = baseCurrency,
    ExchangeRate = rate,
    Subtotal = total,
    Total = total,
    BaseTotal = total * rate,
    Status = status,
    CreatedByUser = createdBy,
    PostedAtUtc = status == SalesInvoiceStatus.Posted ? DateTime.UtcNow : null
  };

  private sealed record TestData(
    Guid OperatorUserId,
    Guid ViewUserId,
    Guid NoAccessUserId,
    Guid CustomerId,
    Guid InactiveCustomerId,
    Guid NonCustomerId,
    Guid BranchId,
    Guid BaseCurrencyId,
    Guid ForeignCurrencyId,
    Guid MoneyAccountId,
    Guid ForeignMoneyAccountId,
    Guid MoneyAccountGlId,
    Guid ReceivableAccountId,
    Guid InvoiceOneId,
    Guid InvoiceTwoId,
    Guid OtherCustomerInvoiceId,
    Guid DraftInvoiceId,
    Guid ForeignInvoiceId,
    Guid ForeignRateMismatchInvoiceId);
}
