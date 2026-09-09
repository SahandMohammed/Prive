using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Modules.Pos;
using Api.Modules.Sales;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed partial class PosWorkflowTests
{
  [Fact]
  public async Task Partial_pos_sale_supports_mixed_currency_and_later_customer_receipt_settlement()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var pos = CreateService(db);

    var sale = await pos.CompleteSaleAsync(
      Request(
        data,
        [ServiceLine(data)],
        [new(data.UsdMoneyAccountId, 5), new(data.IqdMoneyAccountId, 3_500)],
        data.CustomerId) with { PaymentMode = PosPaymentMode.Partial },
      data.CashierId,
      default);

    Assert.Equal(25_000, sale.Total);
    Assert.Equal(10_000, sale.SettledBaseAmount);
    Assert.Equal(15_000, sale.OutstandingBaseAmount);
    Assert.Equal(PosPaymentMode.Partial, sale.PaymentMode);
    Assert.Equal(2, sale.Tenders.Count);

    var journal = await db.JournalEntries.Include(entry => entry.Lines)
      .SingleAsync(entry => entry.Id == sale.JournalEntryId);
    Assert.Equal(6_500, journal.Lines.Single(line => line.AccountId != data.IqdMoneyGlId
      && line.DebitBaseAmount == 6_500).DebitBaseAmount);
    Assert.Equal(3_500, journal.Lines.Single(line => line.AccountId == data.IqdMoneyGlId).DebitBaseAmount);
    Assert.Equal(15_000, journal.Lines.Single(line => line.AccountId == data.ReceivableGlId).DebitBaseAmount);
    Assert.Equal(25_000, journal.Lines.Single(line => line.AccountId == data.ServiceRevenueGlId).CreditBaseAmount);
    Assert.Equal(journal.Lines.Sum(line => line.DebitBaseAmount), journal.Lines.Sum(line => line.CreditBaseAmount));

    var posLedger = await db.MoneyLedgerEntries
      .Where(entry => entry.SourceType == MoneyLedgerSourceType.PosSale && entry.SourceDocumentId == sale.Id)
      .ToListAsync();
    Assert.Equal(2, posLedger.Count);
    Assert.Equal(10_000, posLedger.Sum(entry => entry.BaseAmount));

    var finance = CreateReceivableFinanceService(db);
    var outstanding = Assert.Single(await finance.GetOutstandingSalesInvoicesAsync(
      data.CustomerId, data.IqdCurrencyId, default));
    Assert.Equal(sale.SalesInvoiceId, outstanding.Id);
    Assert.Equal(10_000, outstanding.ReceivedAmount);
    Assert.Equal(15_000, outstanding.OutstandingAmount);

    var receiptDraft = await finance.CreateCustomerReceiptAsync(
      new CustomerReceiptDraftRequest(
        data.CustomerId,
        Today,
        data.IqdMoneyAccountId,
        null,
        15_000,
        "Settle POS balance",
        [new CustomerReceiptAllocationRequest(sale.SalesInvoiceId, 15_000)]),
      data.CashierId,
      default);
    var receipt = await finance.PostCustomerReceiptAsync(receiptDraft.Id, data.CashierId, default);
    Assert.Equal(FinanceDocumentStatus.Posted, receipt.Status);

    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.SalesInvoiceId, default);
    Assert.Equal(25_000, invoice.ReceivedAmount);
    Assert.Equal(0, invoice.OutstandingAmount);
    Assert.Equal(SalesInvoicePaymentStatus.Paid, invoice.PaymentStatus);

    var refreshedSale = await pos.GetSaleAsync(sale.Id, default);
    Assert.Equal(PosPaymentMode.Partial, refreshedSale.PaymentMode);
    Assert.Equal(0, refreshedSale.OutstandingBaseAmount);
    Assert.DoesNotContain(await finance.GetOutstandingSalesInvoicesAsync(
      data.CustomerId, data.IqdCurrencyId, default), item => item.Id == sale.SalesInvoiceId);
  }

  [Fact]
  public async Task Credit_pos_sale_posts_full_receivable_without_money_movement()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var pos = CreateService(db);

    var sale = await pos.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [], data.CustomerId) with { PaymentMode = PosPaymentMode.Credit },
      data.CashierId,
      default);

    Assert.Equal(0, sale.SettledBaseAmount);
    Assert.Equal(25_000, sale.OutstandingBaseAmount);
    Assert.Equal(PosPaymentMode.Credit, sale.PaymentMode);
    Assert.Empty(sale.Tenders);
    Assert.Null(sale.Change);
    Assert.False(await db.MoneyLedgerEntries.AnyAsync(entry =>
      entry.SourceType == MoneyLedgerSourceType.PosSale && entry.SourceDocumentId == sale.Id));

    var journal = await db.JournalEntries.Include(entry => entry.Lines)
      .SingleAsync(entry => entry.Id == sale.JournalEntryId);
    Assert.Equal(25_000, journal.Lines.Single(line => line.AccountId == data.ReceivableGlId).DebitBaseAmount);
    Assert.Equal(25_000, journal.Lines.Single(line => line.AccountId == data.ServiceRevenueGlId).CreditBaseAmount);
    Assert.DoesNotContain(journal.Lines, line => line.AccountId == data.IqdMoneyGlId);
    Assert.Equal(journal.Lines.Sum(line => line.DebitBaseAmount), journal.Lines.Sum(line => line.CreditBaseAmount));

    var outstanding = Assert.Single(await CreateReceivableFinanceService(db).GetOutstandingSalesInvoicesAsync(
      data.CustomerId, data.IqdCurrencyId, default));
    Assert.Equal(0, outstanding.ReceivedAmount);
    Assert.Equal(25_000, outstanding.OutstandingAmount);

    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.SalesInvoiceId, default);
    Assert.Equal(SalesInvoicePaymentStatus.Unpaid, invoice.PaymentStatus);
    Assert.Equal(25_000, invoice.OutstandingAmount);
  }

  [Fact]
  public async Task Partial_and_credit_pos_sales_require_a_customer()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var pos = CreateService(db);

    var partial = await Assert.ThrowsAsync<BadRequestException>(() => pos.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 10_000)]) with
      {
        PaymentMode = PosPaymentMode.Partial
      },
      data.CashierId,
      default));
    Assert.Equal(ErrorCodes.Sales.CustomerRequired, partial.Code);

    var credit = await Assert.ThrowsAsync<BadRequestException>(() => pos.CompleteSaleAsync(
      Request(data, [ServiceLine(data)], []) with { PaymentMode = PosPaymentMode.Credit },
      data.CashierId,
      default));
    Assert.Equal(ErrorCodes.Sales.CustomerRequired, credit.Code);

    Assert.Empty(db.PosSales);
    Assert.Empty(db.SalesInvoices);
  }

  private static FinanceService CreateReceivableFinanceService(Api.Shared.Persistence.AppDbContext db) =>
    new(db, Options.Create(new FinanceOptions
    {
      AccountsPayableAccountCode = "23214",
      AccountsReceivableAccountCode = "13214",
      OpeningBalanceEquityAccountCode = "261"
    }));
}
