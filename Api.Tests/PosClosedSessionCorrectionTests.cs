using System.Text.Json;
using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Modules.Pos;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed partial class PosWorkflowTests
{
  [Fact]
  public async Task Posted_pos_correction_regenerates_closed_session_z_report_in_place()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]),
      data.CashierId,
      default);
    (await db.Users.FindAsync(data.CashierId))!.Role = UserRole.Manager;
    await db.SaveChangesAsync();

    var closedReport = await CreateSessionService(db).CloseSessionAsync(
      data.CashierId,
      data.SessionId,
      new([new(data.IqdMoneyAccountId, 24_900), new(data.UsdMoneyAccountId, 0)], "Counted"),
      default);
    var original = await db.PosZReports.AsNoTracking()
      .Include(report => report.PaymentSummaries)
      .Include(report => report.DrawerSummaries)
      .SingleAsync(report => report.Id == closedReport.Id);
    var originalPaymentIds = original.PaymentSummaries.Select(summary => summary.Id).ToHashSet();
    var originalDrawerIds = original.DrawerSummaries.Select(summary => summary.Id).ToHashSet();
    var originalSession = await db.PosSessions.AsNoTracking().SingleAsync(session => session.Id == data.SessionId);
    var originalClose = await db.PosSessionClosingCounts.AsNoTracking()
      .SingleAsync(count => count.PosSessionId == data.SessionId && count.MoneyAccountId == data.IqdMoneyAccountId);

    (await db.Branches.SingleAsync()).Name = "Renamed branch";
    (await db.PosRegisters.SingleAsync(register => register.Id == originalSession.RegisterId)).Name = "Renamed register";
    (await db.Users.SingleAsync(user => user.Id == data.CashierId)).Username = "renamed-cashier";
    await db.SaveChangesAsync();
    db.ChangeTracker.Clear();

    var sales = new SalesService(db, SalesOptions());
    var invoice = await sales.GetInvoiceAsync(sale.SalesInvoiceId, default);
    await CreatePosCorrectionService(db).UpdateAsync(invoice.Id,
      CorrectedServiceRequest(data, invoice, 20_000),
      data.CashierId,
      default);

    var rebuilt = await db.PosZReports.AsNoTracking()
      .Include(report => report.PaymentSummaries)
      .Include(report => report.DrawerSummaries)
      .SingleAsync(report => report.PosSessionId == data.SessionId);
    var session = await db.PosSessions.AsNoTracking().SingleAsync(item => item.Id == data.SessionId);
    var close = await db.PosSessionClosingCounts.AsNoTracking()
      .SingleAsync(count => count.PosSessionId == data.SessionId && count.MoneyAccountId == data.IqdMoneyAccountId);

    Assert.Equal(original.Id, rebuilt.Id);
    Assert.Equal(original.ReportNumber, rebuilt.ReportNumber);
    Assert.NotEqual(original.GeneratedAtUtc, rebuilt.GeneratedAtUtc);
    Assert.Equal(original.BranchName, rebuilt.BranchName);
    Assert.Equal(original.RegisterName, rebuilt.RegisterName);
    Assert.Equal(original.CashierUsername, rebuilt.CashierUsername);
    Assert.Equal(original.ClosedByUsername, rebuilt.ClosedByUsername);
    Assert.Equal(original.OpenedAtUtc, rebuilt.OpenedAtUtc);
    Assert.Equal(original.ClosedAtUtc, rebuilt.ClosedAtUtc);
    Assert.Equal(20_000, rebuilt.GrossSalesBase);
    Assert.Equal(20_000, Assert.Single(rebuilt.PaymentSummaries).NetBaseAmount);
    var drawer = rebuilt.DrawerSummaries.Single(summary => summary.MoneyAccountId == data.IqdMoneyAccountId);
    Assert.Equal(20_000, drawer.ExpectedAmount);
    Assert.Equal(24_900, drawer.CountedAmount);
    Assert.Equal(4_900, drawer.VarianceAmount);
    Assert.DoesNotContain(rebuilt.PaymentSummaries, summary => originalPaymentIds.Contains(summary.Id));
    Assert.DoesNotContain(rebuilt.DrawerSummaries, summary => originalDrawerIds.Contains(summary.Id));

    Assert.Equal(PosSessionStatus.Closed, session.Status);
    Assert.Equal(originalSession.ClosedAtUtc, session.ClosedAtUtc);
    Assert.Equal(originalSession.ClosedByUserId, session.ClosedByUserId);
    Assert.Equal(originalSession.ClosingNotes, session.ClosingNotes);
    Assert.Equal(originalClose.CountedAmount, close.CountedAmount);
    Assert.Equal(originalClose.ExchangeRate, close.ExchangeRate);
    Assert.Equal(20_000, close.ExpectedAmount);
    Assert.Equal(4_900, close.VarianceAmount);

    var audit = await db.ActivityLogs.SingleAsync(log => log.EntityId == invoice.Id && log.Action == "edited");
    using var before = JsonDocument.Parse(audit.BeforeState!);
    using var after = JsonDocument.Parse(audit.AfterState!);
    Assert.Equal(25_000, before.RootElement.GetProperty("pos").GetProperty("session")
      .GetProperty("zReport").GetProperty("grossSalesBase").GetDecimal());
    Assert.Equal(20_000, after.RootElement.GetProperty("pos").GetProperty("session")
      .GetProperty("zReport").GetProperty("grossSalesBase").GetDecimal());
  }

  [Fact]
  public async Task Posted_pos_delete_regenerates_closed_session_z_report_without_the_sale()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]),
      data.CashierId,
      default);
    var originalReport = await CreateSessionService(db).CloseSessionAsync(
      data.CashierId,
      data.SessionId,
      new([new(data.IqdMoneyAccountId, 25_000), new(data.UsdMoneyAccountId, 0)], "Counted"),
      default);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.SalesInvoiceId, default);

    await CreatePosCorrectionService(db).DeleteAsync(invoice.Id,
      new DeletePostedSalesInvoiceRequest("Duplicate sale", invoice.UpdatedAtUtc),
      data.CashierId,
      default);

    var rebuilt = await db.PosZReports.AsNoTracking()
      .Include(report => report.PaymentSummaries)
      .Include(report => report.DrawerSummaries)
      .SingleAsync(report => report.PosSessionId == data.SessionId);
    var session = await db.PosSessions.AsNoTracking().SingleAsync(item => item.Id == data.SessionId);
    Assert.Equal(originalReport.Id, rebuilt.Id);
    Assert.Equal(originalReport.ReportNumber, rebuilt.ReportNumber);
    Assert.Equal(PosSessionStatus.Closed, session.Status);
    Assert.Equal(0, rebuilt.SaleCount);
    Assert.Equal(0, rebuilt.GrossSalesBase);
    Assert.Empty(rebuilt.PaymentSummaries);
    var drawer = rebuilt.DrawerSummaries.Single(summary => summary.MoneyAccountId == data.IqdMoneyAccountId);
    Assert.Equal(0, drawer.ExpectedAmount);
    Assert.Equal(25_000, drawer.CountedAmount);
    Assert.Equal(25_000, drawer.VarianceAmount);
    Assert.NotNull(await db.PosSales.IgnoreQueryFilters().SingleOrDefaultAsync(item => item.Id == sale.Id));
  }

  [Fact]
  public async Task Closed_pos_correction_first_save_only_removes_z_and_invoice_owned_effects()
  {
    var observer = new ClosedSessionCorrectionSaveObserver();
    await using var db = CreateDb(interceptors: observer);
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]),
      data.CashierId,
      default);
    await CreateSessionService(db).CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 25_000), new(data.UsdMoneyAccountId, 0)], null), default);
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.SalesInvoiceId, default);
    observer.Observations.Clear();
    observer.Enabled = true;

    await CreatePosCorrectionService(db).UpdateAsync(invoice.Id,
      CorrectedServiceRequest(data, invoice, 20_000),
      data.CashierId,
      default);

    Assert.Equal(2, observer.Observations.Count);
    var first = observer.Observations[0];
    Assert.Equal(25_000, first.InvoiceTotal);
    Assert.Equal(1, first.DeletedZReports);
    Assert.Equal(0, first.AddedZReports);
    Assert.Equal(3, first.DeletedZSummaries);
    Assert.Equal(0, first.ModifiedClosingCounts);
    Assert.Empty(first.ModifiedSessionProperties);
    Assert.Equal(0, first.AddedActivityLogs);

    var second = observer.Observations[1];
    Assert.Equal(20_000, second.InvoiceTotal);
    Assert.Equal(0, second.DeletedZReports);
    Assert.Equal(1, second.AddedZReports);
    Assert.Equal(1, second.ModifiedClosingCounts);
    Assert.Contains(nameof(PosSessionEntity.UpdatedAtUtc), second.ModifiedSessionProperties);
    Assert.Equal(2, second.AddedActivityLogs); // Sales Invoice and its owned Payment are both audited.
  }

  [Fact]
  public async Task Closed_pos_correction_second_save_failure_restores_original_z_report_and_session()
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
    Guid reportId;
    string reportNumber;
    Guid paymentSummaryId;
    Guid drawerSummaryId;
    DateTime updatedAtUtc;

    await using (var db = new AppDbContext(options, new BranchContext { BranchId = branchId }))
    {
      await db.Database.EnsureCreatedAsync();
      var data = await SeedAsync(db);
      var sale = await CreateService(db).CompleteSaleAsync(
        Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]),
        data.CashierId,
        default);
      var report = await CreateSessionService(db).CloseSessionAsync(data.CashierId, data.SessionId,
        new([new(data.IqdMoneyAccountId, 24_900), new(data.UsdMoneyAccountId, 0)], null), default);
      var stored = await db.PosZReports.AsNoTracking()
        .Include(item => item.PaymentSummaries)
        .Include(item => item.DrawerSummaries)
        .SingleAsync(item => item.Id == report.Id);
      var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.SalesInvoiceId, default);
      invoiceId = invoice.Id;
      reportId = stored.Id;
      reportNumber = stored.ReportNumber;
      paymentSummaryId = Assert.Single(stored.PaymentSummaries).Id;
      drawerSummaryId = stored.DrawerSummaries.Single(item => item.MoneyAccountId == data.IqdMoneyAccountId).Id;
      updatedAtUtc = invoice.UpdatedAtUtc;
      failure.Enabled = true;

      await Assert.ThrowsAsync<InvalidOperationException>(() => CreatePosCorrectionService(db).UpdateAsync(
        invoice.Id,
        CorrectedServiceRequest(data, invoice with
        {
          UpdatedAtUtc = DateTime.SpecifyKind(invoice.UpdatedAtUtc, DateTimeKind.Utc)
        }, 20_000),
        data.CashierId,
        default));
    }

    await using var fresh = new AppDbContext(options, new BranchContext { BranchId = branchId });
    var restoredInvoice = await fresh.SalesInvoices.SingleAsync(item => item.Id == invoiceId);
    var restoredReport = await fresh.PosZReports.AsNoTracking()
      .Include(item => item.PaymentSummaries)
      .Include(item => item.DrawerSummaries)
      .SingleAsync(item => item.Id == reportId);
    Assert.Equal(updatedAtUtc, restoredInvoice.UpdatedAtUtc);
    Assert.Equal(25_000, restoredInvoice.Total);
    Assert.Equal(reportNumber, restoredReport.ReportNumber);
    Assert.Equal(25_000, restoredReport.GrossSalesBase);
    Assert.Equal(paymentSummaryId, Assert.Single(restoredReport.PaymentSummaries).Id);
    Assert.Contains(restoredReport.DrawerSummaries, item => item.Id == drawerSummaryId);
    Assert.False(await fresh.ActivityLogs.AnyAsync(log => log.EntityId == invoiceId && log.Action == "edited"));
  }

  [Fact]
  public async Task Closed_pos_session_with_missing_z_report_is_an_inconsistent_dependency()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]),
      data.CashierId,
      default);
    await CreateSessionService(db).CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 25_000), new(data.UsdMoneyAccountId, 0)], null), default);
    var report = await db.PosZReports.Include(item => item.PaymentSummaries)
      .Include(item => item.DrawerSummaries).SingleAsync(item => item.PosSessionId == data.SessionId);
    db.PosZPaymentSummaries.RemoveRange(report.PaymentSummaries);
    db.PosZDrawerSummaries.RemoveRange(report.DrawerSummaries);
    db.PosZReports.Remove(report);
    await db.SaveChangesAsync();
    db.ChangeTracker.Clear();
    var invoice = await new SalesService(db, SalesOptions()).GetInvoiceAsync(sale.SalesInvoiceId, default);

    var error = await Assert.ThrowsAsync<ConflictException>(() => CreatePosCorrectionService(db).UpdateAsync(
      invoice.Id,
      CorrectedServiceRequest(data, invoice, 20_000),
      data.CashierId,
      default));

    Assert.Equal(ErrorCodes.Sales.InvoiceHasDependentTransaction, error.Code);
  }

  private static UpdatePostedSalesInvoiceRequest CorrectedServiceRequest(
    TestData data,
    SalesInvoiceResponse invoice,
    decimal amount) => new(
      "Correct closed-session sale",
      invoice.UpdatedAtUtc,
      invoice.CustomerId,
      invoice.InvoiceDate,
      data.BranchId,
      invoice.WarehouseId,
      data.IqdCurrencyId,
      null,
      invoice.Notes,
      [new SalesInvoiceLineRequest(
        SalesLineType.Service,
        data.ServiceId,
        null,
        null,
        "Classic Haircut",
        1,
        amount,
        data.ProfessionalId)],
      new SalesInvoicePosSettlementRequest(
        PosPaymentMode.Paid,
        [new PosTenderRequest(data.IqdMoneyAccountId, amount)],
        null));

  private static SalesInvoiceCorrectionService CreatePosCorrectionService(AppDbContext db)
  {
    var sales = new SalesService(db, SalesOptions());
    var finance = new FinanceService(db, Options.Create(new FinanceOptions()));
    var sessions = new PosSessionService(db, finance);
    return new SalesInvoiceCorrectionService(
      db, sales, new PosSettlementService(db, finance, sessions), sessions);
  }

  private sealed class ClosedSessionCorrectionSaveObserver : SaveChangesInterceptor
  {
    public bool Enabled { get; set; }
    public List<ClosedSessionCorrectionSaveObservation> Observations { get; } = [];

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
      DbContextEventData eventData,
      InterceptionResult<int> result,
      CancellationToken cancellationToken = default)
    {
      if (!Enabled) return base.SavingChangesAsync(eventData, result, cancellationToken);
      var context = eventData.Context!;
      var invoice = context.ChangeTracker.Entries<SalesInvoiceEntity>()
        .Single(entry => entry.State == EntityState.Modified);
      Observations.Add(new ClosedSessionCorrectionSaveObservation(
        invoice.Entity.Total,
        context.ChangeTracker.Entries<PosZReportEntity>().Count(entry => entry.State == EntityState.Added),
        context.ChangeTracker.Entries<PosZReportEntity>().Count(entry => entry.State == EntityState.Deleted),
        context.ChangeTracker.Entries<PosZPaymentSummaryEntity>().Count(entry => entry.State == EntityState.Deleted)
          + context.ChangeTracker.Entries<PosZDrawerSummaryEntity>().Count(entry => entry.State == EntityState.Deleted),
        context.ChangeTracker.Entries<PosSessionClosingCountEntity>().Count(entry => entry.State == EntityState.Modified),
        context.ChangeTracker.Entries<PosSessionEntity>()
          .Where(entry => entry.State == EntityState.Modified)
          .SelectMany(entry => entry.Properties.Where(property => property.IsModified)
            .Select(property => property.Metadata.Name)).ToHashSet(),
        context.ChangeTracker.Entries<Api.Modules.Dashboard.ActivityLogEntity>()
          .Count(entry => entry.State == EntityState.Added)));
      return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
  }

  private sealed record ClosedSessionCorrectionSaveObservation(
    decimal InvoiceTotal,
    int AddedZReports,
    int DeletedZReports,
    int DeletedZSummaries,
    int ModifiedClosingCounts,
    HashSet<string> ModifiedSessionProperties,
    int AddedActivityLogs);

  private sealed class FailReplacementZReportSaveInterceptor : SaveChangesInterceptor
  {
    public bool Enabled { get; set; }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
      DbContextEventData eventData,
      InterceptionResult<int> result,
      CancellationToken cancellationToken = default)
    {
      if (Enabled && eventData.Context!.ChangeTracker.Entries<PosZReportEntity>()
        .Any(entry => entry.State == EntityState.Added))
        throw new InvalidOperationException("Forced replacement Z Report failure.");
      return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
  }
}
