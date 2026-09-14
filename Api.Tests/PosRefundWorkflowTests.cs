using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using System.Reflection;

namespace Api.Tests;

public sealed partial class PosWorkflowTests
{
  [Fact]
  public void Refund_and_void_endpoints_require_management_roles()
  {
    foreach (var methodName in new[] { nameof(PosController.PostRefund), nameof(PosController.VoidRemaining) })
    {
      var roles = typeof(PosController).GetMethod(methodName)!
        .GetCustomAttributes<AuthorizeAttribute>().Single().Roles;
      Assert.Equal("SuperAdmin,Manager,Owner", roles);
      Assert.DoesNotContain("Cashier", roles);
    }
  }

  [Fact]
  public async Task Full_paid_service_refund_posts_new_balanced_reversal_and_negative_money_entry()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    var originalJournal = await db.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == sale.JournalEntryId);
    var originalLines = originalJournal.Lines.Select(x => (x.AccountId, x.DebitBaseAmount, x.CreditBaseAmount)).ToArray();

    var missingPayout = await Assert.ThrowsAsync<BadRequestException>(() => CreateRefundService(db).PostRefundAsync(
      sale.Id, RefundRequest(data, sale, 1, false, []), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.RefundTenderMismatch, missingPayout.Code);

    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);

    Assert.Equal(25_000, refund.TotalRefundBase);
    Assert.Equal(0, refund.ReceivableReversalBase);
    Assert.Equal(25_000, refund.CashRefundBase);
    Assert.Equal(-25_000, (await db.MoneyLedgerEntries.SingleAsync(x => x.SourceType == MoneyLedgerSourceType.PosRefund)).Amount);
    var reversal = await db.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == refund.JournalEntryId);
    Assert.Equal(JournalEntryType.Reversal, reversal.Type);
    Assert.Equal(reversal.Lines.Sum(x => x.DebitBaseAmount), reversal.Lines.Sum(x => x.CreditBaseAmount));
    Assert.Equal(originalLines, originalJournal.Lines.Select(x => (x.AccountId, x.DebitBaseAmount, x.CreditBaseAmount)).ToArray());
  }

  [Fact]
  public async Task Partial_service_refunds_can_be_posted_repeatedly_and_consume_rounding_remainder()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var sale = await service.CompleteSaleAsync(
      Request(data, [ServiceLine(data) with { Quantity = 3 }], [new(data.IqdMoneyAccountId, 75_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    var refunds = CreateRefundService(db);

    var first = await refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    var second = await refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    var third = await refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    var position = await refunds.GetRefundabilityAsync(sale.Id, default);

    Assert.Equal(25_000, first.TotalRefundBase);
    Assert.Equal(25_000, second.TotalRefundBase);
    Assert.Equal(25_000, third.TotalRefundBase);
    Assert.Equal(PosRefundState.FullyRefunded, position.RefundStatus);
    Assert.Equal(0, position.RemainingRefundableBaseAmount);
    Assert.Equal(3, position.Refunds.Count);
    var fourth = await Assert.ThrowsAsync<ConflictException>(() => refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, []), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.RefundNothingAvailable, fourth.Code);
  }

  [Fact]
  public async Task Over_refund_and_second_full_refund_are_rejected_without_partial_effects()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    var refunds = CreateRefundService(db);
    var over = RefundRequest(data, sale, 2, false, [new(data.IqdMoneyAccountId, 25_000)]);
    var error = await Assert.ThrowsAsync<ConflictException>(() => refunds.PostRefundAsync(sale.Id, over, data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.RefundQuantityExceeded, error.Code);
    Assert.Empty(db.PosRefunds);

    await refunds.PostRefundAsync(sale.Id, RefundRequest(data, sale, 1, false,
      [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    var second = await Assert.ThrowsAsync<ConflictException>(() => refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, []), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.RefundNothingAvailable, second.Code);
    Assert.Single(db.PosRefunds);
  }

  [Fact]
  public async Task Product_refund_with_restock_returns_original_quantity_and_cost_and_reverses_cogs()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ProductLine(data, 2)], [new(data.IqdMoneyAccountId, 30_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);

    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, true, [new(data.IqdMoneyAccountId, 15_000)]), data.CashierId, default);

    var movement = await db.StockMovements.SingleAsync(x => x.PosRefundLineId == refund.Lines.Single().Id);
    Assert.Equal(StockMovementType.SaleReturn, movement.Type);
    Assert.Equal(1, movement.QuantityIn);
    Assert.Equal(10, movement.UnitCostBase);
    Assert.Equal(9, await StockQuantityAsync(db, data));
    var journal = await db.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == refund.JournalEntryId);
    Assert.Equal(10, journal.Lines.Single(x => x.AccountId == data.InventoryGlId).DebitBaseAmount);
    Assert.Equal(10, journal.Lines.Single(x => x.AccountId == data.CogsGlId).CreditBaseAmount);
  }

  [Fact]
  public async Task Product_refund_without_restock_requires_notes_and_has_no_stock_or_cogs_effect()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ProductLine(data)], [new(data.IqdMoneyAccountId, 15_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    var refunds = CreateRefundService(db);
    var before = await db.StockMovements.CountAsync();
    var missingNote = RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 15_000)]) with { Notes = null };
    var error = await Assert.ThrowsAsync<BadRequestException>(() => refunds.PostRefundAsync(sale.Id, missingNote, data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.RefundNotesRequired, error.Code);

    var refund = await refunds.PostRefundAsync(sale.Id, missingNote with { Notes = "Damaged return" }, data.CashierId, default);
    Assert.Equal(before, await db.StockMovements.CountAsync());
    var journal = await db.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == refund.JournalEntryId);
    Assert.DoesNotContain(journal.Lines, x => x.AccountId == data.InventoryGlId || x.AccountId == data.CogsGlId);
  }

  [Fact]
  public async Task Credit_refund_reduces_ar_first_without_money_ledger()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [], data.CustomerId) with { PaymentMode = PosPaymentMode.Credit }, data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    var ledgerBefore = await db.MoneyLedgerEntries.CountAsync();

    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, []), data.CashierId, default);

    Assert.Equal(25_000, refund.ReceivableReversalBase);
    Assert.Equal(0, refund.CashRefundBase);
    Assert.Empty(refund.Tenders);
    Assert.Equal(ledgerBefore, await db.MoneyLedgerEntries.CountAsync());
  }

  [Fact]
  public async Task Partial_sale_refund_reduces_remaining_ar_then_returns_only_the_remainder()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 10_000)], data.CustomerId)
        with { PaymentMode = PosPaymentMode.Partial }, data.CashierId, default);
    await PromoteAsync(db, data.CashierId);

    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 10_000)]), data.CashierId, default);

    Assert.Equal(15_000, refund.ReceivableReversalBase);
    Assert.Equal(10_000, refund.CashRefundBase);
    Assert.Equal(0, (await CreateRefundService(db).GetRefundabilityAsync(sale.Id, default)).CurrentOutstandingBaseAmount);
  }

  [Fact]
  public async Task Refund_within_partial_sale_outstanding_reduces_ar_without_physical_money()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data) with { Quantity = 4 }], [new(data.IqdMoneyAccountId, 40_000)], data.CustomerId)
        with { PaymentMode = PosPaymentMode.Partial }, data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    var ledgerBefore = await db.MoneyLedgerEntries.CountAsync();

    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, []), data.CashierId, default);

    Assert.Equal(25_000, refund.ReceivableReversalBase);
    Assert.Equal(0, refund.CashRefundBase);
    Assert.Equal(ledgerBefore, await db.MoneyLedgerEntries.CountAsync());
    Assert.Equal(35_000, (await CreateRefundService(db).GetRefundabilityAsync(sale.Id, default)).CurrentOutstandingBaseAmount);
  }

  [Fact]
  public async Task Posted_customer_receipt_is_included_before_ar_first_refund_allocation()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db, iqdOpeningBalance: 10_000);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [], data.CustomerId) with { PaymentMode = PosPaymentMode.Credit }, data.CashierId, default);
    db.CustomerReceipts.Add(new CustomerReceiptEntity
    {
      DocumentNumber = "CR-TEST", CustomerId = data.CustomerId, ReceiptDate = Today,
      MoneyAccountId = data.IqdMoneyAccountId, CurrencyId = data.IqdCurrencyId, BaseCurrencyId = data.IqdCurrencyId,
      ExchangeRate = 1, TotalAmount = 10_000, BaseTotalAmount = 10_000, Status = FinanceDocumentStatus.Posted,
      CreatedByUserId = data.CashierId, PostedAtUtc = DateTime.UtcNow,
      Allocations = [new CustomerReceiptAllocationEntity { SalesInvoiceId = sale.SalesInvoiceId, Amount = 10_000, BaseAmount = 10_000 }]
    });
    await db.SaveChangesAsync();
    await PromoteAsync(db, data.CashierId);

    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 10_000)]), data.CashierId, default);

    Assert.Equal(15_000, refund.ReceivableReversalBase);
    Assert.Equal(10_000, refund.CashRefundBase);
  }

  [Fact]
  public async Task Mixed_currency_refund_uses_current_rate_snapshots_and_exact_base_total()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db, iqdOpeningBalance: 100_000);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.UsdMoneyAccountId, 10), new(data.IqdMoneyAccountId, 12_000)]), data.CashierId, default);
    db.ExchangeRates.Add(new ExchangeRateEntity
    {
      FromCurrencyId = data.UsdCurrencyId, ToCurrencyId = data.IqdCurrencyId, Rate = 1_200,
      EffectiveAtUtc = DateTime.UtcNow.AddSeconds(-1), CreatedByUserId = data.CashierId
    });
    await db.SaveChangesAsync();
    await PromoteAsync(db, data.CashierId);
    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.UsdMoneyAccountId, 10), new(data.IqdMoneyAccountId, 13_000)]), data.CashierId, default);

    Assert.Equal(1_200, refund.Tenders.Single(x => x.MoneyAccountId == data.UsdMoneyAccountId).ExchangeRate);
    Assert.Equal(25_000, refund.Tenders.Sum(x => x.BaseAmount));
  }

  [Fact]
  public async Task Usd_only_refund_preserves_physical_amount_and_refund_time_rate()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    (await db.Services.SingleAsync(x => x.Id == data.ServiceId)).SellingPriceBase = 26_000;
    await db.SaveChangesAsync();
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.UsdMoneyAccountId, 20)]), data.CashierId, default);
    db.ExchangeRates.Add(new ExchangeRateEntity
    {
      FromCurrencyId = data.UsdCurrencyId, ToCurrencyId = data.IqdCurrencyId, Rate = 1_300,
      EffectiveAtUtc = DateTime.UtcNow.AddSeconds(-1), CreatedByUserId = data.CashierId
    });
    await db.SaveChangesAsync();
    await PromoteAsync(db, data.CashierId);

    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.UsdMoneyAccountId, 20)]), data.CashierId, default);

    var tender = Assert.Single(refund.Tenders);
    Assert.Equal(20, tender.Amount);
    Assert.Equal(1_300, tender.ExchangeRate);
    Assert.Equal(26_000, tender.BaseAmount);
  }

  [Fact]
  public async Task Missing_rate_insufficient_balance_inactive_account_and_view_access_are_rejected()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db, includeUsdRate: false);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    var refunds = CreateRefundService(db);
    var missingRate = await Assert.ThrowsAsync<BadRequestException>(() => refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.UsdMoneyAccountId, 19.2308m)]), data.CashierId, default));
    Assert.Equal(ErrorCodes.Finance.ExchangeRateRequired, missingRate.Code);

    var noBalance = await Assert.ThrowsAsync<BadRequestException>(() => refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_001)]), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.RefundInsufficientBalance, noBalance.Code);

    await PromoteAsync(db, data.ViewerId);
    var viewOnly = await Assert.ThrowsAsync<ForbiddenException>(() => refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_000)])
        with { PosSessionId = data.ViewerSessionId }, data.ViewerId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountAccessDenied, viewOnly.Code);

    (await db.MoneyAccounts.SingleAsync(x => x.Id == data.IqdMoneyAccountId)).IsActive = false;
    await db.SaveChangesAsync();
    var inactive = await Assert.ThrowsAsync<BadRequestException>(() => refunds.PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountInactive, inactive.Code);
  }

  [Fact]
  public async Task Cashier_and_wrong_or_closed_sessions_cannot_post_refunds()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    var refunds = CreateRefundService(db);
    var request = RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_000)]);
    var unauthorized = await Assert.ThrowsAsync<ForbiddenException>(() => refunds.PostRefundAsync(sale.Id, request, data.CashierId, default));
    Assert.Equal(ErrorCodes.Common.Forbidden, unauthorized.Code);

    await PromoteAsync(db, data.CashierId);
    var missingSession = await Assert.ThrowsAsync<BadRequestException>(() => refunds.PostRefundAsync(sale.Id,
      request with { PosSessionId = Guid.Empty }, data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.RefundSessionRequired, missingSession.Code);
    var wrongSession = await Assert.ThrowsAsync<ForbiddenException>(() => refunds.PostRefundAsync(sale.Id,
      request with { PosSessionId = data.ViewerSessionId }, data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.SessionAccessDenied, wrongSession.Code);

    var session = await db.PosSessions.SingleAsync(x => x.Id == data.SessionId);
    session.Status = PosSessionStatus.Closed;
    await db.SaveChangesAsync();
    var closed = await Assert.ThrowsAsync<ConflictException>(() => refunds.PostRefundAsync(sale.Id, request, data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.SessionClosed, closed.Code);
  }

  [Fact]
  public async Task Void_reverses_every_remaining_line_and_preserves_original_sale()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data), ProductLine(data)], [new(data.IqdMoneyAccountId, 40_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);

    var refund = await CreateRefundService(db).VoidRemainingAsync(sale.Id,
      new(data.SessionId, PosRefundReason.DuplicateSale, "Duplicate", [sale.Lines.Single(x => x.LineType == SalesLineType.Product).Id],
        [new(data.IqdMoneyAccountId, 40_000)]), data.CashierId, default);

    Assert.True(refund.IsVoid);
    Assert.Equal(2, refund.Lines.Count);
    Assert.Equal(40_000, refund.TotalRefundBase);
    Assert.Equal(PosSaleStatus.Completed, (await db.PosSales.SingleAsync(x => x.Id == sale.Id)).Status);
    Assert.Equal(SalesInvoiceStatus.Posted, (await db.SalesInvoices.SingleAsync(x => x.Id == sale.SalesInvoiceId)).Status);
  }

  [Fact]
  public async Task Refund_sources_are_traceable_and_direct_journal_reversal_is_blocked()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ProductLine(data)], [new(data.IqdMoneyAccountId, 15_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    var refund = await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, true, [new(data.IqdMoneyAccountId, 15_000)]), data.CashierId, default);

    var accounting = await new AccountingService(db).GetJournalAsync(refund.JournalEntryId, default);
    Assert.Equal(refund.Id, accounting.SourcePosRefundId);
    var blocked = await Assert.ThrowsAsync<BadRequestException>(() => new AccountingService(db).ReverseJournalAsync(refund.JournalEntryId, default));
    Assert.Equal(ErrorCodes.Pos.JournalDirectReversalNotAllowed, blocked.Code);
    var inventory = await new InventoryService(db).GetMovementsAsync(new StockMovementListQuery { DocumentNumber = refund.DocumentNumber }, default);
    Assert.Equal(InventoryDocumentType.PosRefund, Assert.Single(inventory.Items).SourceDocumentType);
    Assert.Equal(refund.Id, inventory.Items[0].SourceDocumentId);
  }

  [Fact]
  public async Task Refund_uses_original_price_revenue_and_cost_snapshots_after_configuration_changes()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data), ProductLine(data)], [new(data.IqdMoneyAccountId, 40_000)]), data.CashierId, default);
    var replacementRevenue = new AccountEntity
    {
      Code = "4999", Name = "Replacement Revenue", Classification = AccountClassification.Revenue
    };
    db.Accounts.Add(replacementRevenue);
    var service = await db.Services.SingleAsync(x => x.Id == data.ServiceId);
    service.SellingPriceBase = 90_000;
    service.RevenueAccount = replacementRevenue;
    (await db.Products.SingleAsync(x => x.Id == data.ProductId)).SellingPriceBase = 80_000;
    await db.SaveChangesAsync();
    await PromoteAsync(db, data.CashierId);

    var refund = await CreateRefundService(db).VoidRemainingAsync(sale.Id,
      new(data.SessionId, PosRefundReason.DuplicateSale, "Configuration changed after sale", [sale.Lines.Single(x => x.LineType == SalesLineType.Product).Id],
        [new(data.IqdMoneyAccountId, 40_000)]), data.CashierId, default);

    Assert.Equal(40_000, refund.TotalRefundBase);
    Assert.Equal(10, refund.Lines.Single(x => x.LineType == SalesLineType.Product).OriginalUnitCostBase);
    var journal = await db.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == refund.JournalEntryId);
    Assert.Contains(journal.Lines, x => x.AccountId == data.ServiceRevenueGlId && x.DebitBaseAmount == 25_000);
    Assert.DoesNotContain(journal.Lines, x => x.AccountId == replacementRevenue.Id);
  }

  [Fact]
  public async Task X_report_is_live_refund_aware_and_Z_report_freezes_the_same_values()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default);
    var sessions = CreateSessionService(db);

    var x = await sessions.GetXReportAsync(data.CashierId, data.SessionId, default);
    Assert.Equal(25_000, x.GrossSalesBase);
    Assert.Equal(25_000, x.RefundTotalBase);
    Assert.Equal(0, x.NetSalesBase);
    Assert.Equal(25_000, x.Payments.Single(x => x.MoneyAccountId == data.IqdMoneyAccountId).RefundAmount);
    Assert.Equal(0, x.Drawers.Single(x => x.CurrencyId == data.IqdCurrencyId).ExpectedAmount);

    var z = await sessions.CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdCurrencyId, 0), new(data.UsdCurrencyId, 0)], null), default);
    Assert.Equal(x.RefundTotalBase, z.RefundTotalBase);
    Assert.Equal(x.NetSalesBase, z.NetSalesBase);
    Assert.Equal(1, z.RefundCount);
  }

  [Fact]
  public async Task Ar_only_refund_changes_net_sales_but_not_X_drawer()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [], data.CustomerId) with { PaymentMode = PosPaymentMode.Credit }, data.CashierId, default);
    await PromoteAsync(db, data.CashierId);
    await CreateRefundService(db).PostRefundAsync(sale.Id,
      RefundRequest(data, sale, 1, false, []), data.CashierId, default);

    var x = await CreateSessionService(db).GetXReportAsync(data.CashierId, data.SessionId, default);
    Assert.Equal(0, x.NetSalesBase);
    Assert.Equal(0, x.Drawers.Single(row => row.CurrencyId == data.IqdCurrencyId).RefundAmount);
    Assert.Equal(0, x.Drawers.Single(row => row.CurrencyId == data.IqdCurrencyId).ExpectedAmount);
  }

  private static PosRefundService CreateRefundService(AppDbContext db)
  {
    var finance = new FinanceService(db, Options.Create(new FinanceOptions
    {
      AccountsPayableAccountCode = "23214",
      AccountsReceivableAccountCode = "13214",
      OpeningBalanceEquityAccountCode = "261"
    }));
    return new PosRefundService(db, finance, new PosSessionService(db, finance));
  }

  private static CreatePosRefundRequest RefundRequest(
    TestData data, PosSaleResponse sale, decimal quantity, bool restock,
    List<PosRefundTenderRequest> tenders) => new(
      data.SessionId, PosRefundReason.CustomerComplaint, "Approved refund",
      [new(sale.Lines[0].Id, quantity, restock)], tenders);

  private static async Task PromoteAsync(AppDbContext db, Guid userId)
  {
    (await db.Users.SingleAsync(x => x.Id == userId)).Role = UserRole.Manager;
    await db.SaveChangesAsync();
  }
}
