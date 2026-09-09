using System.Data.Common;
using Api.Infrastructure.Http;
using Api.Modules.Branch;
using Api.Modules.Finance;
using Api.Modules.Pos;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;

namespace Api.Tests;

public sealed partial class PosWorkflowTests
{
  [Fact]
  public async Task Closing_reconciles_cash_preserves_snapshots_and_prevents_further_checkout()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sessions = CreateSessionService(db);
    var branch = await db.Branches.SingleAsync();
    var account = await db.MoneyAccounts.SingleAsync(item => item.Id == data.IqdMoneyAccountId);
    branch.Name = new string('B', 200);
    account.Name = new string('A', 200);
    await db.SaveChangesAsync();
    var sale = await CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 30_000)],
        change: new(data.IqdMoneyAccountId, 5_000)), data.CashierId, default);
    Assert.Equal(data.SessionId, sale.PosSessionId);

    db.ChangeTracker.Clear();
    var x = await sessions.GetXReportAsync(data.CashierId, data.SessionId, default);
    Assert.Empty(db.ChangeTracker.Entries());
    Assert.Equal(1, x.SaleCount);
    Assert.Equal(25_000, x.GrossSalesBase);
    Assert.Equal(25_000, x.Drawers.Single(row => row.CurrencyId == data.IqdCurrencyId).ExpectedAmount);
    var ledgerCount = await db.MoneyLedgerEntries.CountAsync();
    var journalCount = await db.JournalEntries.CountAsync();

    var report = await sessions.CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdCurrencyId, 24_900), new(data.UsdCurrencyId, 0)], "Counted"), default);
    Assert.Equal(-100, report.Drawers.Single(row => row.CurrencyId == data.IqdCurrencyId).VarianceAmount);
    Assert.Equal(-100, report.Drawers.Single(row => row.CurrencyId == data.IqdCurrencyId).VarianceBaseAmount);
    Assert.Equal(new string('B', 200), report.BranchName);
    Assert.Equal(new string('A', 200), Assert.Single(report.Payments).MoneyAccountName);
    Assert.Equal(ledgerCount, await db.MoneyLedgerEntries.CountAsync());
    Assert.Equal(journalCount, await db.JournalEntries.CountAsync());
    Assert.Null(await sessions.GetActiveSessionAsync(data.CashierId, default));

    (await db.Branches.SingleAsync()).Name = "Renamed branch";
    (await db.MoneyAccounts.SingleAsync(item => item.Id == data.IqdMoneyAccountId)).Name = "Renamed account";
    await db.SaveChangesAsync();
    var historical = await sessions.GetZReportAsync(data.CashierId, report.Id, default);
    Assert.Equal(report.BranchName, historical.BranchName);
    Assert.Equal(report.Payments[0].MoneyAccountName, historical.Payments[0].MoneyAccountName);
    await Assert.ThrowsAsync<ConflictException>(() => sessions.CloseSessionAsync(data.CashierId,
      data.SessionId, new([], null), default));
    var closed = await Assert.ThrowsAsync<ConflictException>(() => CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.SessionClosed, closed.Code);
    Assert.Single(await db.PosZReports.ToListAsync());
  }

  [Fact]
  public async Task Sessions_enforce_ownership_open_registers_and_complete_currency_counts()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sessions = CreateSessionService(db);
    var session = await sessions.GetSessionAsync(data.CashierId, data.SessionId, default);
    await Assert.ThrowsAsync<ConflictException>(() => sessions.OpenSessionAsync(data.CashierId,
      new(session.RegisterId, [], null), default));
    await Assert.ThrowsAsync<ConflictException>(() => sessions.UpdateRegisterAsync(session.RegisterId,
      new(session.RegisterCode, session.RegisterName, false), default));
    await Assert.ThrowsAsync<ForbiddenException>(() => sessions.GetXReportAsync(data.ViewerId, data.SessionId, default));
    await Assert.ThrowsAsync<ForbiddenException>(() => sessions.CloseSessionAsync(data.ViewerId,
      data.SessionId, new([], null), default));
    await Assert.ThrowsAsync<ForbiddenException>(() => CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]), data.ViewerId, default));
    var missingSession = await Assert.ThrowsAsync<BadRequestException>(() => CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]) with { PosSessionId = Guid.Empty },
      data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.SessionRequired, missingSession.Code);

    var invalidClose = await Assert.ThrowsAsync<BadRequestException>(() => sessions.CloseSessionAsync(
      data.CashierId, data.SessionId, new([new(data.IqdCurrencyId, 0)], null), default));
    Assert.Equal(ErrorCodes.Pos.ClosingCountInvalid, invalidClose.Code);
    await sessions.CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdCurrencyId, 0), new(data.UsdCurrencyId, 0)], null), default);
    var invalidOpen = await Assert.ThrowsAsync<BadRequestException>(() => sessions.OpenSessionAsync(
      data.CashierId, new(session.RegisterId, [new(data.IqdCurrencyId, 0), new(data.IqdCurrencyId, 0)], null), default));
    Assert.Equal(ErrorCodes.Pos.OpeningCountInvalid, invalidOpen.Code);
    var reopened = await sessions.OpenSessionAsync(data.CashierId,
      new(session.RegisterId, [new(data.IqdCurrencyId, 100), new(data.UsdCurrencyId, 10)], null), default);
    var x = await sessions.GetXReportAsync(data.CashierId, reopened.Id, default);
    Assert.Equal(100, x.Drawers.Single(row => row.CurrencyId == data.IqdCurrencyId).ExpectedAmount);
    Assert.Equal(13_000, x.Drawers.Single(row => row.CurrencyId == data.UsdCurrencyId).ExpectedBaseAmount);
  }

  [Fact]
  public async Task Session_and_report_history_normalize_paging_and_scope_cashier_access()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sessions = CreateSessionService(db);
    var own = await sessions.GetSessionsAsync(data.CashierId, new() { Page = -1, PageSize = 1000 }, default);
    Assert.Equal(1, own.Page);
    Assert.Equal(100, own.PageSize);
    Assert.Equal(data.SessionId, Assert.Single(own.Items).Id);
    var registers = await sessions.GetRegistersAsync(new() { Page = -1, PageSize = 1000 }, default);
    Assert.Equal(1, registers.Page);
    Assert.Equal(100, registers.PageSize);
    Assert.Equal(3, registers.Items.Count);
    var singleRegister = await sessions.GetRegisterAsync(registers.Items[0].Id, default);
    Assert.Equal(registers.Items[0].Id, singleRegister.Id);
    var notFound = await Assert.ThrowsAsync<NotFoundException>(() => sessions.GetRegisterAsync(Guid.NewGuid(), default));
    Assert.Equal(ErrorCodes.Pos.RegisterNotFound, notFound.Code);
    var searched = await sessions.GetRegistersAsync(new() { Search = registers.Items[0].Code }, default);
    Assert.Equal(registers.Items[0].Id, Assert.Single(searched.Items).Id);
    var registerPage = await sessions.GetRegistersAsync(new() { Page = 2, PageSize = 1 }, default);
    Assert.Equal(registers.Items[1].Id, Assert.Single(registerPage.Items).Id);
    var report = await sessions.CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdCurrencyId, 0), new(data.UsdCurrencyId, 0)], null), default);
    var reports = await sessions.GetZReportsAsync(data.CashierId, new() { Page = 0, PageSize = 0 }, default);
    Assert.Equal(1, reports.Page);
    Assert.Equal(20, reports.PageSize);
    Assert.Equal(report.Id, Assert.Single(reports.Items).Id);
    Assert.Empty((await sessions.GetZReportsAsync(data.ViewerId, new(), default)).Items);
    await Assert.ThrowsAsync<ForbiddenException>(() => sessions.GetZReportAsync(data.ViewerId, report.Id, default));

    (await db.Users.SingleAsync(user => user.Id == data.CashierId)).Role = UserRole.Manager;
    await db.SaveChangesAsync();
    var first = await sessions.GetSessionsAsync(data.CashierId, new() { PageSize = 1 }, default);
    var second = await sessions.GetSessionsAsync(data.CashierId, new() { Page = 2, PageSize = 1 }, default);
    Assert.Equal(3, first.TotalCount);
    Assert.NotEqual(Assert.Single(first.Items).Id, Assert.Single(second.Items).Id);
    var hugePage = await sessions.GetSessionsAsync(data.CashierId, new() { Page = int.MaxValue, PageSize = 100 }, default);
    Assert.Empty(hugePage.Items);
  }

  [Fact]
  public void Z_report_columns_accept_the_full_source_name_lengths()
  {
    using var db = CreateDb();
    Assert.Equal(db.Model.FindEntityType(typeof(BranchEntity))!.FindProperty("Name")!.GetMaxLength(),
      db.Model.FindEntityType(typeof(PosZReportEntity))!.FindProperty("BranchName")!.GetMaxLength());
    Assert.Equal(db.Model.FindEntityType(typeof(MoneyAccountEntity))!.FindProperty("Name")!.GetMaxLength(),
      db.Model.FindEntityType(typeof(PosZPaymentSummaryEntity))!.FindProperty("MoneyAccountName")!.GetMaxLength());
  }

  [Theory]
  [InlineData(PostgresErrorCodes.SerializationFailure)]
  [InlineData(PostgresErrorCodes.DeadlockDetected)]
  public async Task Transaction_failures_before_saving_return_POS_conflicts(string sqlState)
  {
    await using var seededDb = CreateDb();
    var data = await SeedAsync(seededDb);
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseNpgsql("Host=localhost;Database=unused;Username=unused")
      .AddInterceptors(new FailingConnectionInterceptor(sqlState)).Options;
    await using var db = new AppDbContext(options, new BranchContext { BranchId = data.BranchId });
    var close = await Assert.ThrowsAsync<ConflictException>(() => CreateSessionService(db).CloseSessionAsync(
      data.CashierId, data.SessionId, new([], null), default));
    Assert.Equal(ErrorCodes.Pos.SessionCloseConflict, close.Code);
    var checkout = await Assert.ThrowsAsync<ConflictException>(() => CreateService(db).CompleteSaleAsync(
      Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]), data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.ConcurrentCheckout, checkout.Code);
  }

  private sealed class FailingConnectionInterceptor(string sqlState) : DbConnectionInterceptor
  {
    public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
      DbConnection connection, ConnectionEventData eventData, InterceptionResult result,
      CancellationToken cancellationToken = default) =>
      throw new PostgresException("Concurrent transaction", "ERROR", "ERROR", sqlState);
  }
}
