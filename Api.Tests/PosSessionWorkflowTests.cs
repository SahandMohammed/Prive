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
  public async Task Cashier_can_close_own_session_without_notes()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);

    var report = await CreateSessionService(db).CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 0), new(data.UsdMoneyAccountId, 0)], null), default);

    Assert.Equal(data.CashierId, report.ClosedByUserId);
    Assert.Null((await db.PosSessions.SingleAsync(session => session.Id == data.SessionId)).ClosingNotes);
  }

  [Fact]
  public async Task Management_force_close_requires_a_trimmed_reason()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await PromoteAsync(db, data.ViewerId);
    var service = CreateSessionService(db);
    var counts = new List<PosClosingCountRequest> { new(data.IqdMoneyAccountId, 0), new(data.UsdMoneyAccountId, 0) };

    var missing = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CloseSessionAsync(data.ViewerId, data.SessionId, new(counts, null), default));
    Assert.Equal(ErrorCodes.Pos.SessionClosingNoteRequired, missing.Code);

    var whitespace = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CloseSessionAsync(data.ViewerId, data.SessionId, new(counts, "   "), default));
    Assert.Equal(ErrorCodes.Pos.SessionClosingNoteRequired, whitespace.Code);
    Assert.Equal(PosSessionStatus.Open, (await db.PosSessions.SingleAsync(session => session.Id == data.SessionId)).Status);

    var report = await service.CloseSessionAsync(data.ViewerId, data.SessionId,
      new(counts, "  Manager verified drawer count  "), default);
    var session = await db.PosSessions.SingleAsync(item => item.Id == data.SessionId);

    Assert.Equal(data.ViewerId, report.ClosedByUserId);
    Assert.Equal("Manager verified drawer count", session.ClosingNotes);
    Assert.Equal(report.Id, (await db.PosZReports.SingleAsync(report => report.PosSessionId == session.Id)).Id);
  }

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
      new([new(data.IqdMoneyAccountId, 24_900), new(data.UsdMoneyAccountId, 0)], "Counted"), default);
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
      new(session.RegisterCode, session.RegisterName, false,
        session.OpeningCounts.Select(count => count.MoneyAccountId).ToList()), default));
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
      data.CashierId, data.SessionId, new([new(data.IqdMoneyAccountId, 0)], null), default));
    Assert.Equal(ErrorCodes.Pos.ClosingCountInvalid, invalidClose.Code);
    await sessions.CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 0), new(data.UsdMoneyAccountId, 0)], null), default);
    var invalidOpen = await Assert.ThrowsAsync<BadRequestException>(() => sessions.OpenSessionAsync(
      data.CashierId, new(session.RegisterId, [new(data.IqdMoneyAccountId, 0), new(data.IqdMoneyAccountId, 0)], null), default));
    Assert.Equal(ErrorCodes.Pos.OpeningCountInvalid, invalidOpen.Code);
    var reopened = await sessions.OpenSessionAsync(data.CashierId,
      new(session.RegisterId, [new(data.IqdMoneyAccountId, 100), new(data.UsdMoneyAccountId, 10)], null), default);
    var x = await sessions.GetXReportAsync(data.CashierId, reopened.Id, default);
    Assert.Equal(100, x.Drawers.Single(row => row.CurrencyId == data.IqdCurrencyId).ExpectedAmount);
    Assert.Equal(13_000, x.Drawers.Single(row => row.CurrencyId == data.UsdCurrencyId).ExpectedBaseAmount);
  }

  [Fact]
  public async Task Register_availability_tracks_open_sessions_across_all_response_shapes()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sessions = CreateSessionService(db);
    var seededSession = await sessions.GetSessionAsync(data.CashierId, data.SessionId, default);

    Assert.True((await sessions.GetRegistersAsync(new(), default)).Items
      .Single(register => register.Id == seededSession.RegisterId).HasOpenSession);
    Assert.True((await sessions.GetRegisterAsync(seededSession.RegisterId, default)).HasOpenSession);

    await sessions.CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 0), new(data.UsdMoneyAccountId, 0)], null), default);
    Assert.False((await sessions.GetRegistersAsync(new(), default)).Items
      .Single(register => register.Id == seededSession.RegisterId).HasOpenSession);
    Assert.False((await sessions.GetRegisterAsync(seededSession.RegisterId, default)).HasOpenSession);

    var spareAccount = new MoneyAccountEntity
    {
      Code = "SPARE-IQD", Name = "Spare IQD", Type = MoneyAccountType.Cashbox,
      BranchId = data.BranchId, CurrencyId = data.IqdCurrencyId,
      AccountingAccount = new() { Code = "1113", Name = "Spare IQD", Classification = Api.Modules.Accounting.AccountClassification.Asset }
    };
    db.MoneyAccounts.Add(spareAccount);
    db.MoneyAccountAccess.Add(new() { MoneyAccount = spareAccount, UserId = data.CashierId, AccessLevel = MoneyAccountAccessLevel.Operate });
    await db.SaveChangesAsync();
    var spare = await sessions.CreateRegisterAsync(new("SPARE", "Spare POS", [spareAccount.Id]), default);
    Assert.False(spare.HasOpenSession);
    var availableUpdate = await sessions.UpdateRegisterAsync(spare.Id,
      new(spare.Code, "Updated Spare POS", true, [spareAccount.Id]), default);
    Assert.False(availableUpdate.HasOpenSession);

    await sessions.OpenSessionAsync(data.CashierId,
      new(spare.Id, [new(spareAccount.Id, 0)], null), default);
    var occupiedUpdate = await sessions.UpdateRegisterAsync(spare.Id,
      new(spare.Code, spare.Name, true, [spareAccount.Id]), default);
    Assert.True(occupiedUpdate.HasOpenSession);
    Assert.True((await sessions.GetRegistersAsync(new(), default)).Items
      .Single(register => register.Id == spare.Id).HasOpenSession);
    Assert.True((await sessions.GetRegisterAsync(spare.Id, default)).HasOpenSession);
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
    Assert.All(registers.Items, register => Assert.True(register.HasOpenSession));
    var singleRegister = await sessions.GetRegisterAsync(registers.Items[0].Id, default);
    Assert.True(singleRegister.HasOpenSession);
    Assert.Equal(registers.Items[0].Id, singleRegister.Id);
    var notFound = await Assert.ThrowsAsync<NotFoundException>(() => sessions.GetRegisterAsync(Guid.NewGuid(), default));
    Assert.Equal(ErrorCodes.Pos.RegisterNotFound, notFound.Code);
    var searched = await sessions.GetRegistersAsync(new() { Search = registers.Items[0].Code }, default);
    Assert.Equal(registers.Items[0].Id, Assert.Single(searched.Items).Id);
    var registerPage = await sessions.GetRegistersAsync(new() { Page = 2, PageSize = 1 }, default);
    Assert.Equal(registers.Items[1].Id, Assert.Single(registerPage.Items).Id);
    var report = await sessions.CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 0), new(data.UsdMoneyAccountId, 0)], null), default);
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
  public async Task Physical_opening_count_snapshots_exact_cashbox_without_financial_posting()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var sessions = CreateSessionService(db);
    var seeded = await sessions.GetSessionAsync(data.CashierId, data.SessionId, default);
    await sessions.CloseSessionAsync(data.CashierId, data.SessionId,
      new([new(data.IqdMoneyAccountId, 0), new(data.UsdMoneyAccountId, 0)], null), default);
    var ledgerCount = await db.MoneyLedgerEntries.CountAsync();
    var journalCount = await db.JournalEntries.CountAsync();
    var accountingBalance = await PosBalanceAsync(db, data.IqdMoneyAccountId);

    var reopened = await sessions.OpenSessionAsync(data.CashierId,
      new(seeded.RegisterId, [new(data.IqdMoneyAccountId, 200_000), new(data.UsdMoneyAccountId, 0)], null), default);

    var snapshot = reopened.OpeningCounts.Single(count => count.MoneyAccountId == data.IqdMoneyAccountId);
    Assert.Equal(200_000, snapshot.Amount);
    Assert.Equal(data.IqdCurrencyId, snapshot.CurrencyId);
    Assert.Equal(ledgerCount, await db.MoneyLedgerEntries.CountAsync());
    Assert.Equal(journalCount, await db.JournalEntries.CountAsync());
    Assert.Equal(accountingBalance, await PosBalanceAsync(db, data.IqdMoneyAccountId));
  }

  [Fact]
  public async Task Register_configuration_rejects_duplicate_currency_and_owned_cashboxes()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var spare = new MoneyAccountEntity
    {
      Code = "SECOND-IQD",
      Name = "Second IQD",
      Type = MoneyAccountType.Cashbox,
      BranchId = data.BranchId,
      CurrencyId = data.IqdCurrencyId,
      AccountingAccount = new()
      {
        Code = "1115",
        Name = "Second IQD",
        Classification = Api.Modules.Accounting.AccountClassification.Asset
      }
    };
    db.MoneyAccounts.Add(spare);
    await db.SaveChangesAsync();
    var sessions = CreateSessionService(db);

    var duplicateCurrency = await Assert.ThrowsAsync<BadRequestException>(() =>
      sessions.CreateRegisterAsync(new("DUP-CURRENCY", "Duplicate Currency", [data.IqdMoneyAccountId, spare.Id]), default));
    Assert.Equal(ErrorCodes.Pos.RegisterCashboxDuplicateCurrency, duplicateCurrency.Code);

    var alreadyOwned = await Assert.ThrowsAsync<ConflictException>(() =>
      sessions.CreateRegisterAsync(new("DUP-ACCOUNT", "Duplicate Account", [data.IqdMoneyAccountId]), default));
    Assert.Equal(ErrorCodes.Pos.CashboxAlreadyAssigned, alreadyOwned.Code);
  }

  [Fact]
  public async Task Pos_references_protect_cashbox_structure_deletion_and_active_use()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var finance = new FinanceService(db, Microsoft.Extensions.Options.Options.Create(new FinanceOptions()));
    var account = await db.MoneyAccounts.AsNoTracking()
      .SingleAsync(item => item.Id == data.IqdMoneyAccountId);

    var structural = await Assert.ThrowsAsync<BadRequestException>(() => finance.UpdateMoneyAccountAsync(
      account.Id,
      new(account.Code, account.Name, MoneyAccountType.Bank, account.BranchId, account.CurrencyId, true),
      data.CashierId,
      default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed, structural.Code);

    var deactivation = await Assert.ThrowsAsync<BadRequestException>(() => finance.UpdateMoneyAccountAsync(
      account.Id,
      new(account.Code, account.Name, account.Type, account.BranchId, account.CurrencyId, false),
      data.CashierId,
      default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed, deactivation.Code);

    var deletion = await Assert.ThrowsAsync<BadRequestException>(() =>
      finance.DeleteMoneyAccountAsync(account.Id, data.CashierId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed, deletion.Code);
  }

  [Fact]
  public void Cashbox_model_has_database_enforced_branch_currency_and_ownership_invariants()
  {
    using var db = CreateDb();
    var register = db.Model.FindEntityType(typeof(PosRegisterEntity))!;
    var session = db.Model.FindEntityType(typeof(PosSessionEntity))!;
    var account = db.Model.FindEntityType(typeof(MoneyAccountEntity))!;
    var mapping = db.Model.FindEntityType(typeof(PosRegisterCashboxEntity))!;
    var opening = db.Model.FindEntityType(typeof(PosSessionOpeningCountEntity))!;
    var closing = db.Model.FindEntityType(typeof(PosSessionClosingCountEntity))!;

    Assert.Contains(register.GetKeys(), key => PropertyNames(key.Properties).SequenceEqual(["Id", "BranchId"]));
    Assert.Contains(session.GetKeys(), key => PropertyNames(key.Properties).SequenceEqual(["Id", "BranchId"]));
    Assert.Contains(account.GetKeys(), key => PropertyNames(key.Properties).SequenceEqual(["Id", "BranchId", "CurrencyId"]));
    Assert.Contains(mapping.GetIndexes(), index => index.GetDatabaseName() == PosRegisterCashboxEntityConfiguration.MoneyAccountUniqueIndexName
      && index.IsUnique && PropertyNames(index.Properties).SequenceEqual(["MoneyAccountId"]));
    Assert.Contains(mapping.GetIndexes(), index => index.GetDatabaseName() == "UX_pos_register_cashboxes_register_currency"
      && index.IsUnique && PropertyNames(index.Properties).SequenceEqual(["PosRegisterId", "CurrencyId"]));
    Assert.Contains(mapping.GetForeignKeys(), foreignKey =>
      PropertyNames(foreignKey.Properties).SequenceEqual(["PosRegisterId", "BranchId"])
      && PropertyNames(foreignKey.PrincipalKey.Properties).SequenceEqual(["Id", "BranchId"]));
    Assert.Contains(mapping.GetForeignKeys(), foreignKey =>
      PropertyNames(foreignKey.Properties).SequenceEqual(["MoneyAccountId", "BranchId", "CurrencyId"])
      && PropertyNames(foreignKey.PrincipalKey.Properties).SequenceEqual(["Id", "BranchId", "CurrencyId"]));
    Assert.All(new[] { opening, closing }, count =>
    {
      Assert.Contains(count.GetForeignKeys(), foreignKey =>
        PropertyNames(foreignKey.Properties).SequenceEqual(["PosSessionId", "BranchId"]));
      Assert.Contains(count.GetForeignKeys(), foreignKey =>
        PropertyNames(foreignKey.Properties).SequenceEqual(["MoneyAccountId", "BranchId", "CurrencyId"]));
    });
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

  private static IEnumerable<string> PropertyNames(IEnumerable<Microsoft.EntityFrameworkCore.Metadata.IReadOnlyProperty> properties) =>
    properties.Select(property => property.Name);

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
    var refund = await Assert.ThrowsAsync<ConflictException>(() => CreateRefundService(db).PostRefundAsync(
      Guid.NewGuid(), new(data.SessionId, PosRefundReason.CustomerComplaint, "Concurrent", [], []),
      data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.RefundConcurrencyConflict, refund.Code);
  }

  private sealed class FailingConnectionInterceptor(string sqlState) : DbConnectionInterceptor
  {
    public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
      DbConnection connection, ConnectionEventData eventData, InterceptionResult result,
      CancellationToken cancellationToken = default) =>
      throw new PostgresException("Concurrent transaction", "ERROR", "ERROR", sqlState);
  }
}
