using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Finance;
using Api.Modules.Pos;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using System.Data.Common;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Api.Tests;

public sealed partial class PosWorkflowTests
{
  [Theory]
  [InlineData(PosPaymentMode.Paid, PosPaymentMode.Paid)]
  [InlineData(PosPaymentMode.Paid, PosPaymentMode.Partial)]
  [InlineData(PosPaymentMode.Paid, PosPaymentMode.Credit)]
  [InlineData(PosPaymentMode.Partial, PosPaymentMode.Paid)]
  [InlineData(PosPaymentMode.Partial, PosPaymentMode.Partial)]
  [InlineData(PosPaymentMode.Partial, PosPaymentMode.Credit)]
  [InlineData(PosPaymentMode.Credit, PosPaymentMode.Paid)]
  [InlineData(PosPaymentMode.Credit, PosPaymentMode.Partial)]
  [InlineData(PosPaymentMode.Credit, PosPaymentMode.Credit)]
  public async Task Real_customer_settlement_correction_supports_every_mode_transition(
    PosPaymentMode initialMode,
    PosPaymentMode targetMode)
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    (await db.Users.FindAsync(data.CashierId))!.Role = UserRole.Manager;
    await db.SaveChangesAsync();
    var pos = CreateService(db);
    var sale = await pos.CompleteSaleAsync(
      CheckoutForMode(data, initialMode, data.CustomerId), data.CashierId, default);
    var originalContext = await db.PosContexts.AsNoTracking()
      .SingleAsync(context => context.SalesInvoiceId == sale.Id);
    var originalInvoiceJournalId = sale.JournalEntryId;
    var originalStockIds = sale.StockMovementIds.Order().ToArray();
    var originalPaymentJournalId = originalContext.PaymentId is Guid originalPaymentId
      ? await db.Payments.Where(payment => payment.Id == originalPaymentId)
        .Select(payment => payment.JournalEntryId).SingleAsync()
      : null;
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);

    var corrected = await pos.CorrectSettlementAsync(sale.Id,
      CorrectionForMode(data, targetMode, invoice.UpdatedAtUtc), data.CashierId, default);
    var context = await db.PosContexts.AsNoTracking()
      .SingleAsync(item => item.SalesInvoiceId == sale.Id);
    var refreshedInvoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);
    var targetAmount = SettlementAmount(targetMode);

    Assert.Equal(sale.Id, corrected.Id);
    Assert.Equal(sale.DocumentNumber, corrected.DocumentNumber);
    Assert.Equal(originalContext.PosSessionId, context.PosSessionId);
    Assert.Equal(originalContext.CashierUserId, context.CashierUserId);
    Assert.Equal(originalContext.CompletedAtUtc, context.CompletedAtUtc);
    Assert.Equal(originalContext.ClientRequestId, context.ClientRequestId);
    Assert.Equal(originalContext.RequestFingerprint, context.RequestFingerprint);
    Assert.Equal(targetMode, context.PaymentMode);
    Assert.Equal(originalInvoiceJournalId, refreshedInvoice.JournalEntryId);
    Assert.Equal(originalStockIds, refreshedInvoice.StockMovementIds.Order().ToArray());
    Assert.Equal(targetAmount, refreshedInvoice.CollectedAmount);
    Assert.Equal(25_000 - targetAmount, refreshedInvoice.OutstandingAmount);
    Assert.Equal(targetMode switch
    {
      PosPaymentMode.Paid => SalesInvoicePaymentStatus.Paid,
      PosPaymentMode.Partial => SalesInvoicePaymentStatus.PartiallyPaid,
      _ => SalesInvoicePaymentStatus.Unpaid
    }, refreshedInvoice.PaymentStatus);

    if (targetAmount > 0)
    {
      Assert.NotNull(context.PaymentId);
      if (originalContext.PaymentId is not null)
        Assert.Equal(originalContext.PaymentId, context.PaymentId);
      else
        Assert.NotEqual(originalContext.PaymentId, context.PaymentId);

      var payment = await db.Payments.AsNoTracking()
        .Include(item => item.Allocations)
        .Include(item => item.MoneyLines)
        .Include(item => item.JournalEntry).ThenInclude(journal => journal!.Lines)
        .SingleAsync(item => item.Id == context.PaymentId);
      Assert.Equal(targetAmount, payment.Amount);
      Assert.Equal(targetAmount, Assert.Single(payment.Allocations).Amount);
      Assert.Equal(targetAmount, payment.MoneyLines.Sum(line =>
        line.Direction == PaymentMoneyDirection.Collection ? line.BaseAmount : -line.BaseAmount));
      Assert.NotNull(payment.JournalEntry);
      Assert.Equal(payment.JournalEntry!.Lines.Sum(line => line.DebitBaseAmount),
        payment.JournalEntry.Lines.Sum(line => line.CreditBaseAmount));
      if (originalPaymentJournalId is not null)
        Assert.NotEqual(originalPaymentJournalId, payment.JournalEntryId);
      Assert.Single(corrected.Tenders);
      Assert.Equal(targetAmount, corrected.Tenders.Single().BaseAmount);
      Assert.Single(await db.MoneyLedgerEntries
        .Where(entry => entry.SourceDocumentId == payment.Id).ToListAsync());
    }
    else
    {
      Assert.Null(context.PaymentId);
      Assert.Empty(corrected.Tenders);
      if (originalContext.PaymentId is Guid deletedPaymentId)
      {
        var deleted = await db.Payments.IgnoreQueryFilters().AsNoTracking()
          .SingleAsync(payment => payment.Id == deletedPaymentId);
        Assert.True(deleted.IsDeleted);
        Assert.False(await db.MoneyLedgerEntries.AnyAsync(entry => entry.SourceDocumentId == deletedPaymentId));
      }
    }

    Assert.Single(await db.ActivityLogs.Where(log => log.EntityId == sale.Id
      && log.EntityType == "POS Settlement" && log.Action == "corrected").ToListAsync());
  }

  [Fact]
  public async Task Walk_in_paid_to_paid_is_allowed_and_preserves_historical_mode()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    (await db.Users.FindAsync(data.CashierId))!.Role = UserRole.Manager;
    await db.SaveChangesAsync();
    var pos = CreateService(db);
    var sale = await pos.CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Paid, null), data.CashierId, default);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);

    var corrected = await pos.CorrectSettlementAsync(sale.Id,
      CorrectionForMode(data, PosPaymentMode.Paid, invoice.UpdatedAtUtc), data.CashierId, default);

    Assert.Equal(PosPaymentMode.Paid, corrected.PaymentMode);
    Assert.Equal(PosPaymentMode.Paid,
      (await db.PosContexts.AsNoTracking().SingleAsync(context => context.SalesInvoiceId == sale.Id)).PaymentMode);
  }

  [Theory]
  [InlineData(PosPaymentMode.Partial)]
  [InlineData(PosPaymentMode.Credit)]
  public async Task Walk_in_debt_transition_is_rejected_without_mutating_closed_session_truth(
    PosPaymentMode targetMode)
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    (await db.Users.FindAsync(data.CashierId))!.Role = UserRole.Manager;
    await db.SaveChangesAsync();
    var pos = CreateService(db);
    var sale = await pos.CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Paid, null), data.CashierId, default);
    var report = await CreateSessionService(db).CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 25_000), new(data.UsdMoneyAccountId, 0)], "Counted"), default);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);
    var contextBefore = await db.PosContexts.AsNoTracking()
      .SingleAsync(context => context.SalesInvoiceId == sale.Id);
    var tenderBefore = await db.PosTenders.AsNoTracking().SingleAsync(tender => tender.SalesInvoiceId == sale.Id);
    var paymentBefore = await db.Payments.AsNoTracking()
      .Include(payment => payment.MoneyLines)
      .SingleAsync(payment => payment.Id == contextBefore.PaymentId);
    var zBefore = await db.PosZReports.AsNoTracking()
      .Include(z => z.PaymentSummaries).Include(z => z.DrawerSummaries)
      .SingleAsync(z => z.Id == report.Id);
    var auditCount = await db.ActivityLogs.CountAsync(log => log.EntityId == sale.Id);

    var error = await Assert.ThrowsAsync<BadRequestException>(() => pos.CorrectSettlementAsync(
      sale.Id, CorrectionForMode(data, targetMode, invoice.UpdatedAtUtc), data.CashierId, default));

    Assert.Equal(ErrorCodes.Pos.RealCustomerRequired, error.Code);
    db.ChangeTracker.Clear();
    var contextAfter = await db.PosContexts.AsNoTracking()
      .SingleAsync(context => context.SalesInvoiceId == sale.Id);
    var tenderAfter = await db.PosTenders.AsNoTracking().SingleAsync(tender => tender.SalesInvoiceId == sale.Id);
    var paymentAfter = await db.Payments.AsNoTracking()
      .Include(payment => payment.MoneyLines)
      .SingleAsync(payment => payment.Id == contextAfter.PaymentId);
    var zAfter = await db.PosZReports.AsNoTracking()
      .Include(z => z.PaymentSummaries).Include(z => z.DrawerSummaries)
      .SingleAsync(z => z.Id == report.Id);
    Assert.Equal(PosPaymentMode.Paid, contextAfter.PaymentMode);
    Assert.Equal(contextBefore.PaymentId, contextAfter.PaymentId);
    Assert.Equal(tenderBefore.Id, tenderAfter.Id);
    Assert.Equal(tenderBefore.BaseAmount, tenderAfter.BaseAmount);
    Assert.Equal(paymentBefore.JournalEntryId, paymentAfter.JournalEntryId);
    Assert.Equal(paymentBefore.MoneyLines.Select(line => line.Id), paymentAfter.MoneyLines.Select(line => line.Id));
    Assert.Equal(zBefore.GeneratedAtUtc, zAfter.GeneratedAtUtc);
    Assert.Equal(zBefore.GrossSalesBase, zAfter.GrossSalesBase);
    Assert.Equal(zBefore.PaymentSummaries.Select(summary => summary.Id), zAfter.PaymentSummaries.Select(summary => summary.Id));
    Assert.Equal(zBefore.DrawerSummaries.Select(summary => summary.Id), zAfter.DrawerSummaries.Select(summary => summary.Id));
    Assert.Equal(auditCount, await db.ActivityLogs.CountAsync(log => log.EntityId == sale.Id));
  }

  [Theory]
  [InlineData(30_000, SalesInvoicePaymentStatus.PartiallyPaid, 5_000, 0)]
  [InlineData(20_000, SalesInvoicePaymentStatus.Overpaid, 0, 5_000)]
  public async Task Commercial_pos_correction_preserves_checkout_mode_and_collection_truth_while_regenerating_z(
    decimal correctedTotal,
    SalesInvoicePaymentStatus expectedStatus,
    decimal expectedOutstanding,
    decimal expectedOverpaid)
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var pos = CreateService(db);
    var sale = await pos.CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Paid, data.CustomerId), data.CashierId, default);
    var originalReport = await CreateSessionService(db).CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 25_000), new(data.UsdMoneyAccountId, 0)], "Counted"), default);
    var originalSession = await db.PosSessions.AsNoTracking()
      .SingleAsync(session => session.Id == data.SessionId);
    var originalClosingCount = await db.PosSessionClosingCounts.AsNoTracking()
      .SingleAsync(count => count.PosSessionId == data.SessionId
        && count.MoneyAccountId == data.IqdMoneyAccountId);
    var beforeContext = await db.PosContexts.AsNoTracking()
      .SingleAsync(context => context.SalesInvoiceId == sale.Id);
    var beforeTender = await db.PosTenders.AsNoTracking().SingleAsync(tender => tender.SalesInvoiceId == sale.Id);
    var beforePayment = await db.Payments.AsNoTracking()
      .Include(payment => payment.Allocations)
      .Include(payment => payment.MoneyLines)
      .SingleAsync(payment => payment.Id == beforeContext.PaymentId);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);

    var corrected = await CreateSalesCorrectionService(db).UpdateAsync(sale.Id,
      CommercialCorrection(data, invoice, correctedTotal), data.CashierId, default);

    var afterContext = await db.PosContexts.AsNoTracking()
      .SingleAsync(context => context.SalesInvoiceId == sale.Id);
    var afterTender = await db.PosTenders.AsNoTracking().SingleAsync(tender => tender.SalesInvoiceId == sale.Id);
    var afterPayment = await db.Payments.AsNoTracking()
      .Include(payment => payment.Allocations)
      .Include(payment => payment.MoneyLines)
      .SingleAsync(payment => payment.Id == afterContext.PaymentId);
    var rebuiltReport = await db.PosZReports.AsNoTracking()
      .Include(report => report.DrawerSummaries)
      .SingleAsync(report => report.PosSessionId == data.SessionId);
    var rebuiltSession = await db.PosSessions.AsNoTracking()
      .SingleAsync(session => session.Id == data.SessionId);
    var rebuiltClosingCount = await db.PosSessionClosingCounts.AsNoTracking()
      .SingleAsync(count => count.PosSessionId == data.SessionId
        && count.MoneyAccountId == data.IqdMoneyAccountId);

    Assert.Equal(PosPaymentMode.Paid, afterContext.PaymentMode);
    Assert.Equal(beforeContext.PaymentId, afterContext.PaymentId);
    Assert.Equal(beforeTender.Id, afterTender.Id);
    Assert.Equal(beforeTender.BaseAmount, afterTender.BaseAmount);
    Assert.Equal(beforePayment.JournalEntryId, afterPayment.JournalEntryId);
    Assert.Equal(beforePayment.Allocations.Select(allocation => allocation.Id),
      afterPayment.Allocations.Select(allocation => allocation.Id));
    Assert.Equal(beforePayment.MoneyLines.Select(line => line.Id), afterPayment.MoneyLines.Select(line => line.Id));
    Assert.Equal(25_000, corrected.CollectedAmount);
    Assert.Equal(expectedStatus, corrected.PaymentStatus);
    Assert.Equal(expectedOutstanding, corrected.OutstandingAmount);
    Assert.Equal(expectedOverpaid, corrected.OverpaidAmount);
    Assert.Equal(originalReport.Id, rebuiltReport.Id);
    Assert.Equal(originalReport.ReportNumber, rebuiltReport.ReportNumber);
    Assert.Equal(originalReport.ClosedAtUtc, rebuiltReport.ClosedAtUtc);
    Assert.Equal(correctedTotal, rebuiltReport.GrossSalesBase);
    Assert.Equal(25_000, rebuiltReport.DrawerSummaries
      .Single(summary => summary.MoneyAccountId == data.IqdMoneyAccountId).ExpectedAmount);
    Assert.Equal(originalSession.ClosedAtUtc, rebuiltSession.ClosedAtUtc);
    Assert.Equal(originalSession.ClosedByUserId, rebuiltSession.ClosedByUserId);
    Assert.Equal(originalSession.ClosingNotes, rebuiltSession.ClosingNotes);
    Assert.Equal(originalClosingCount.CountedAmount, rebuiltClosingCount.CountedAmount);
    Assert.Equal(originalClosingCount.ExpectedAmount, rebuiltClosingCount.ExpectedAmount);
    Assert.Equal(originalClosingCount.VarianceAmount, rebuiltClosingCount.VarianceAmount);
  }

  [Fact]
  public async Task Commercial_pos_correction_rejects_invoice_date_change_before_mutation()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Paid, data.CustomerId), data.CashierId, default);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);

    var error = await Assert.ThrowsAsync<ConflictException>(() => CreateSalesCorrectionService(db).UpdateAsync(
      sale.Id,
      CommercialCorrection(data, invoice, 30_000) with { InvoiceDate = invoice.InvoiceDate.AddDays(1) },
      data.CashierId,
      default));

    Assert.Equal(ErrorCodes.Sales.PosInvoiceDateImmutable, error.Code);
    var unchanged = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);
    Assert.Equal(invoice.InvoiceDate, unchanged.InvoiceDate);
    Assert.Equal(invoice.Total, unchanged.Total);
    Assert.Equal(invoice.JournalEntryId, unchanged.JournalEntryId);
    Assert.Equal(PosPaymentMode.Paid,
      (await db.PosContexts.AsNoTracking().SingleAsync(context => context.SalesInvoiceId == sale.Id)).PaymentMode);
  }

  [Fact]
  public async Task Invoice_history_combines_commercial_and_pos_settlement_audits()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    (await db.Users.FindAsync(data.CashierId))!.Role = UserRole.Manager;
    await db.SaveChangesAsync();
    var pos = CreateService(db);
    var sale = await pos.CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Paid, data.CustomerId), data.CashierId, default);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);
    await pos.CorrectSettlementAsync(sale.Id,
      CorrectionForMode(data, PosPaymentMode.Partial, invoice.UpdatedAtUtc), data.CashierId, default);
    invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);
    var corrections = CreateSalesCorrectionService(db);
    await corrections.UpdateAsync(sale.Id,
      CommercialCorrection(data, invoice, 30_000), data.CashierId, default);

    var history = await corrections.GetHistoryAsync(sale.Id, default);

    Assert.Contains(history, entry => entry.Source == "Invoice" && entry.Action == "edited");
    Assert.Contains(history, entry => entry.Source == "POS Settlement" && entry.Action == "corrected");
    Assert.Equal(history.Select(entry => entry.Id).Distinct().Count(), history.Count);
    Assert.Equal(history.OrderBy(entry => entry.ChangedAtUtc).ThenBy(entry => entry.Id).Select(entry => entry.Id),
      history.Select(entry => entry.Id));
  }

  [Fact]
  public async Task Closed_commercial_pos_correction_failure_restores_original_invoice_and_z()
  {
    await using var connection = new SqliteConnection("Data Source=:memory:");
    await connection.OpenAsync();
    var failure = new FailReplacementZReportSaveInterceptor();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseSqlite(connection)
      .AddInterceptors(failure)
      .Options;
    var branchId = Guid.NewGuid();
    Guid invoiceId;
    Guid invoiceJournalId;
    Guid reportId;
    string reportNumber;
    DateTime updatedAtUtc;

    await using (var db = new AppDbContext(options, new BranchContext { BranchId = branchId }))
    {
      await db.Database.EnsureCreatedAsync();
      var data = await SeedAsync(db);
      var sale = await CreateService(db).CompleteSaleAsync(
        CheckoutForMode(data, PosPaymentMode.Paid, data.CustomerId), data.CashierId, default);
      var report = await CreateSessionService(db).CloseSessionAsync(data.CashierId, data.SessionId,
        new([new(data.IqdMoneyAccountId, 25_000), new(data.UsdMoneyAccountId, 0)], null), default);
      var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.Id, default);
      invoiceId = invoice.Id;
      invoiceJournalId = invoice.JournalEntryId!.Value;
      reportId = report.Id;
      reportNumber = report.ReportNumber;
      updatedAtUtc = invoice.UpdatedAtUtc;
      failure.Enabled = true;

      await Assert.ThrowsAsync<InvalidOperationException>(() => CreateSalesCorrectionService(db).UpdateAsync(
        invoice.Id, CommercialCorrection(data, invoice, 30_000), data.CashierId, default));
    }

    await using var fresh = new AppDbContext(options, new BranchContext { BranchId = branchId });
    var restoredInvoice = await fresh.SalesInvoices.AsNoTracking().SingleAsync(invoice => invoice.Id == invoiceId);
    var restoredReport = await fresh.PosZReports.AsNoTracking().SingleAsync(report => report.Id == reportId);
    Assert.Equal(25_000, restoredInvoice.Total);
    Assert.Equal(updatedAtUtc, restoredInvoice.UpdatedAtUtc);
    Assert.Equal(invoiceJournalId, restoredInvoice.JournalEntryId);
    Assert.NotNull(await fresh.JournalEntries.FindAsync(invoiceJournalId));
    Assert.Equal(reportNumber, restoredReport.ReportNumber);
    Assert.Equal(25_000, restoredReport.GrossSalesBase);
    Assert.False(await fresh.ActivityLogs.AnyAsync(log => log.EntityId == invoiceId
      && log.EntityType == "Sales Invoice" && log.Action == "edited"));
  }

  [Fact]
  public async Task Direct_payment_endpoint_rejects_a_pos_invoice()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Paid, data.CustomerId), data.CashierId, default);

    var error = await Assert.ThrowsAsync<BadRequestException>(() => new PaymentService(db)
      .CreateInvoicePaymentAsync(sale.Id,
        new InvoicePaymentRequest(Today, data.IqdMoneyAccountId, 1_000, 1, null),
        data.CashierId,
        default));

    Assert.Equal(ErrorCodes.Finance.PaymentSourceInvoiceMismatch, error.Code);
  }

  [Fact]
  public async Task Customer_account_statement_pages_relationally_with_global_running_balances()
  {
    await using var connection = new SqliteConnection("Data Source=:memory:");
    await connection.OpenAsync();
    var commands = new StatementCommandObserver();
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseSqlite(connection)
      .AddInterceptors(commands)
      .Options;
    var branchId = Guid.NewGuid();
    await using var db = new AppDbContext(options, new BranchContext { BranchId = branchId });
    await db.Database.EnsureCreatedAsync();
    var data = await SeedAsync(db);
    var pos = CreateService(db);
    var priorCredit = await pos.CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Credit, data.CustomerId), data.CashierId, default);
    var partial = await pos.CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Partial, data.CustomerId), data.CashierId, default);
    var paid = await pos.CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Paid, data.CustomerId), data.CashierId, default);
    await pos.CompleteSaleAsync(
      CheckoutForMode(data, PosPaymentMode.Credit, data.CustomerId), data.CashierId, default);

    var timestamp = DateTime.SpecifyKind(DateTime.UtcNow.AddMinutes(-1), DateTimeKind.Utc);
    var refundJournal = new JournalEntryEntity
    {
      EntryDate = Today,
      Reference = "REF-ACCOUNT-TEST",
      Description = "Customer account reader AR refund",
      BranchId = data.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = timestamp
    };
    var refund = new PosRefundEntity
    {
      DocumentNumber = "REF-ACCOUNT-TEST",
      SalesInvoiceId = priorCredit.Id,
      BranchId = data.BranchId,
      PosSessionId = data.SessionId,
      CustomerId = data.CustomerId,
      Reason = PosRefundReason.CustomerComplaint,
      Notes = "Reader projection test",
      Status = PosRefundStatus.Posted,
      TotalRefundBase = 25_000,
      ReceivableReversalBase = 25_000,
      CashRefundBase = 0,
      CreatedByUserId = data.CashierId,
      ApprovedByUserId = data.CashierId,
      CreatedAtUtc = timestamp,
      PostedAtUtc = timestamp,
      JournalEntryId = refundJournal.Id,
      JournalEntry = refundJournal
    };
    db.PosRefunds.Add(refund);

    var invoices = await db.SalesInvoices.Where(invoice => invoice.CustomerId == data.CustomerId).ToListAsync();
    foreach (var invoice in invoices) invoice.CreatedAtUtc = timestamp;
    (await db.SalesInvoices.SingleAsync(invoice => invoice.Id == priorCredit.Id)).InvoiceDate = Today.AddDays(-1);
    var payments = await db.Payments.Where(payment => payment.CustomerId == data.CustomerId).ToListAsync();
    foreach (var payment in payments) payment.CreatedAtUtc = timestamp;
    var excludedPayment = payments.Single(payment => payment.SourceSalesInvoiceId == paid.Id);
    excludedPayment.IsDeleted = true;
    excludedPayment.DeletedAtUtc = timestamp;
    excludedPayment.DeletedByUserId = data.CashierId;
    excludedPayment.DeleteReason = "Reader must exclude inactive payments";
    excludedPayment.JournalEntryId = null;
    await db.SaveChangesAsync();
    db.ChangeTracker.Clear();

    commands.Enabled = true;
    var reader = new CustomerAccountReader(db);
    var query = new CustomerAccountStatementQuery
    {
      FromDate = Today,
      ToDate = Today,
      PageNumber = 1,
      PageSize = 2
    };
    var pageOne = await reader.GetStatementAsync(data.CustomerId, query, default);
    var pageTwo = await reader.GetStatementAsync(data.CustomerId, new CustomerAccountStatementQuery
    {
      FromDate = Today,
      ToDate = Today,
      PageNumber = 2,
      PageSize = 2
    }, default);
    var pageThree = await reader.GetStatementAsync(data.CustomerId, new CustomerAccountStatementQuery
    {
      FromDate = Today,
      ToDate = Today,
      PageNumber = 3,
      PageSize = 2
    }, default);
    var pageOneRepeat = await reader.GetStatementAsync(data.CustomerId, query, default);
    var partialPaymentId = await db.PosContexts.AsNoTracking()
      .Where(context => context.SalesInvoiceId == partial.Id)
      .Select(context => context.PaymentId!.Value).SingleAsync();

    Assert.Equal(25_000, pageOne.OpeningBalance);
    Assert.Equal(65_000, pageOne.ClosingBalance);
    Assert.Equal(5, pageOne.Pagination.TotalCount);
    Assert.Equal(1, pageOne.Pagination.Page);
    Assert.Equal(2, pageOne.Pagination.PageSize);
    Assert.Equal(2, pageOne.Entries.Count);
    Assert.Equal(2, pageTwo.Entries.Count);
    Assert.Single(pageThree.Entries);
    Assert.Equal(pageOne.Entries.Select(entry => entry.SourceId),
      pageOneRepeat.Entries.Select(entry => entry.SourceId));
    Assert.Equal(65_000, pageThree.Entries.Single().RunningBaseBalance);
    Assert.DoesNotContain(pageOne.Entries.Concat(pageTwo.Entries).Concat(pageThree.Entries),
      entry => entry.EntryType == CustomerAccountEntryType.Payment && entry.SourceId == excludedPayment.Id);
    Assert.Contains(pageOne.Entries.Concat(pageTwo.Entries).Concat(pageThree.Entries),
      entry => entry.EntryType == CustomerAccountEntryType.Payment
        && entry.SourceId == partialPaymentId);
    Assert.Contains(commands.Commands, command => command.Contains("LIMIT", StringComparison.OrdinalIgnoreCase)
      && command.Contains("OFFSET", StringComparison.OrdinalIgnoreCase));
  }

  private static CompletePosSaleRequest CheckoutForMode(
    TestData data,
    PosPaymentMode mode,
    Guid? customerId)
  {
    var tenders = mode switch
    {
      PosPaymentMode.Paid => new List<PosTenderRequest> { new(data.IqdMoneyAccountId, 25_000) },
      PosPaymentMode.Partial => [new(data.IqdMoneyAccountId, 10_000)],
      _ => []
    };
    return Request(data, [ServiceLine(data)], tenders, customerId) with { PaymentMode = mode };
  }

  private static CorrectPosSettlementRequest CorrectionForMode(
    TestData data,
    PosPaymentMode mode,
    DateTime expectedUpdatedAtUtc)
  {
    var tenders = mode switch
    {
      PosPaymentMode.Paid => new List<PosTenderRequest> { new(data.IqdMoneyAccountId, 25_000) },
      PosPaymentMode.Partial => [new(data.IqdMoneyAccountId, 10_000)],
      _ => []
    };
    return new CorrectPosSettlementRequest(mode, tenders, null, $"Change settlement to {mode}", expectedUpdatedAtUtc);
  }

  private static decimal SettlementAmount(PosPaymentMode mode) => mode switch
  {
    PosPaymentMode.Paid => 25_000,
    PosPaymentMode.Partial => 10_000,
    _ => 0
  };

  private static UpdatePostedSalesInvoiceRequest CommercialCorrection(
    TestData data,
    SalesInvoiceResponse invoice,
    decimal correctedTotal) => new(
      "Correct commercial total",
      DateTime.SpecifyKind(invoice.UpdatedAtUtc, DateTimeKind.Utc),
      invoice.CustomerId,
      invoice.InvoiceDate,
      invoice.BranchId,
      invoice.WarehouseId,
      invoice.CurrencyId,
      null,
      invoice.Notes,
      [new SalesInvoiceLineRequest(
        SalesLineType.Service,
        data.ServiceId,
        null,
        null,
        "Classic Haircut",
        1,
        correctedTotal,
        data.ProfessionalId)]);

  private static SalesInvoiceCorrectionService CreateSalesCorrectionService(AppDbContext db) => new(
    db,
    new SalesService(db, SalesOptions()),
    CreateSessionService(db));

  private sealed class StatementCommandObserver : DbCommandInterceptor
  {
    public bool Enabled { get; set; }
    public List<string> Commands { get; } = [];

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
      DbCommand command,
      CommandEventData eventData,
      InterceptionResult<DbDataReader> result,
      CancellationToken cancellationToken = default)
    {
      if (Enabled) Commands.Add(command.CommandText);
      return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }
  }
}
