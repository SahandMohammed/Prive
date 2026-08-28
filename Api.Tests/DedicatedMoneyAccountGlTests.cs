using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Purchase;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed class DedicatedMoneyAccountGlTests
{
  [Fact]
  public async Task UAS_parent_resolution_matrix_assigns_correct_parent_and_creates_dedicated_gl()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    // 1. Cashbox + Main Branch + Base Currency -> 134111
    var mainCashIqd = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-MAIN-IQD", "Main Cashbox", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    var gl1 = await db.Accounts.SingleAsync(a => a.Id == mainCashIqd.AccountingAccountId);
    Assert.Equal("13411101", gl1.Code);
    Assert.Equal("Main Cashbox IQD", gl1.Name);
    Assert.Equal(AccountClassification.Asset, gl1.Classification);
    Assert.False(gl1.IsGroup);
    Assert.True(gl1.IsActive);
    Assert.Equal(fixture.UasCashMainIqdId, gl1.ParentAccountId);

    // 2. Cashbox + Main Branch + Foreign Currency -> 134112
    var mainCashUsd = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-MAIN-USD", "Main USD Cashbox", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.UsdCurrencyId, true), fixture.ManagerId, default);

    var gl2 = await db.Accounts.SingleAsync(a => a.Id == mainCashUsd.AccountingAccountId);
    Assert.Equal("13411201", gl2.Code);
    Assert.Equal("Main USD Cashbox USD", gl2.Name);
    Assert.Equal(fixture.UasCashMainUsdId, gl2.ParentAccountId);

    // 3. Cashbox + Sub Branch + Base Currency -> 134121
    var subCashIqd = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-SUB-IQD", "Sub Branch Cashbox", MoneyAccountType.Cashbox,
      fixture.SubBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    var gl3 = await db.Accounts.SingleAsync(a => a.Id == subCashIqd.AccountingAccountId);
    Assert.Equal("13412101", gl3.Code);
    Assert.Equal("Sub Branch Cashbox IQD", gl3.Name);
    Assert.Equal(fixture.UasCashSubIqdId, gl3.ParentAccountId);

    // 4. Cashbox + Sub Branch + Foreign Currency -> 134122
    var subCashUsd = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-SUB-USD", "Sub Branch USD Cashbox", MoneyAccountType.Cashbox,
      fixture.SubBranchId, fixture.UsdCurrencyId, true), fixture.ManagerId, default);

    var gl4 = await db.Accounts.SingleAsync(a => a.Id == subCashUsd.AccountingAccountId);
    Assert.Equal("13412201", gl4.Code);
    Assert.Equal("Sub Branch USD Cashbox USD", gl4.Name);
    Assert.Equal(fixture.UasCashSubUsdId, gl4.ParentAccountId);

    // 5. Bank + Base Currency -> 13421
    var bankIqd = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "BANK-TBI-IQD", "TBI Bank", MoneyAccountType.Bank,
      fixture.MainBranchId, fixture.IqdCurrencyId, true, BankName: "Trade Bank", AccountNumberOrIban: "IQ001"), fixture.ManagerId, default);

    var gl5 = await db.Accounts.SingleAsync(a => a.Id == bankIqd.AccountingAccountId);
    Assert.Equal("1342101", gl5.Code);
    Assert.Equal("TBI Bank IQD", gl5.Name);
    Assert.Equal(fixture.UasBankIqdId, gl5.ParentAccountId);

    // 6. Bank + Foreign Currency -> 13422
    var bankUsd = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "BANK-TBI-USD", "TBI USD Bank", MoneyAccountType.Bank,
      fixture.MainBranchId, fixture.UsdCurrencyId, true, BankName: "Trade Bank", AccountNumberOrIban: "IQ002"), fixture.ManagerId, default);

    var gl6 = await db.Accounts.SingleAsync(a => a.Id == bankUsd.AccountingAccountId);
    Assert.Equal("1342201", gl6.Code);
    Assert.Equal("TBI USD Bank USD", gl6.Name);
    Assert.Equal(fixture.UasBankUsdId, gl6.ParentAccountId);
  }

  [Fact]
  public async Task Sequential_numbering_monotonically_increments_and_does_not_collide()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    var box1 = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "BOX-1", "Front Desk 1", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    var box2 = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "BOX-2", "Front Desk 2", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);
    await GrantOperateAsync(finance, box2.Id, fixture.ManagerId);

    var box3 = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "BOX-3", "Front Desk 3", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    Assert.Equal("13411101", (await db.Accounts.FindAsync(box1.AccountingAccountId))!.Code);
    Assert.Equal("13411102", (await db.Accounts.FindAsync(box2.AccountingAccountId))!.Code);
    Assert.Equal("13411103", (await db.Accounts.FindAsync(box3.AccountingAccountId))!.Code);

    // Delete box2 - next created box should be 13411104, never reusing deleted 02 if 03 exists
    await finance.DeleteMoneyAccountAsync(box2.Id, fixture.ManagerId, default);

    var box4 = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "BOX-4", "Front Desk 4", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    Assert.Equal("13411104", (await db.Accounts.FindAsync(box4.AccountingAccountId))!.Code);
  }

  [Fact]
  public async Task Name_change_synchronizes_gl_display_name_without_changing_gl_code()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    var account = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-DESK", "Reception Desk", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    var gl = await db.Accounts.FindAsync(account.AccountingAccountId);
    Assert.Equal("13411101", gl!.Code);
    Assert.Equal("Reception Desk IQD", gl.Name);

    // Update Name to "VIP Cashbox"
    await finance.UpdateMoneyAccountAsync(account.Id, new MoneyAccountRequest(
      "CASH-DESK", "VIP Cashbox", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    db.ChangeTracker.Clear();
    var updatedGl = await db.Accounts.FindAsync(account.AccountingAccountId);
    Assert.Equal("13411101", updatedGl!.Code); // GL code remains unchanged
    Assert.Equal("VIP Cashbox IQD", updatedGl.Name); // GL name updated
  }

  [Fact]
  public async Task Accounting_service_protects_finance_owned_gl_from_unauthorized_changes()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);
    var accounting = CreateAccountingService(db);

    var account = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-LOCK", "Locked Cashbox", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    var glId = account.AccountingAccountId;

    // 1. Direct delete from Accounting -> AccountOwnedByMoneyAccount
    var delEx = await Assert.ThrowsAsync<BadRequestException>(() => accounting.DeleteAccountAsync(glId, default));
    Assert.Equal(ErrorCodes.Accounting.AccountOwnedByMoneyAccount, delEx.Code);

    // 2. Direct code change -> FinanceOwnedAccountProtected
    var codeEx = await Assert.ThrowsAsync<BadRequestException>(() => accounting.UpdateAccountAsync(glId,
      new UpdateAccountRequest("999999", "Locked Cashbox IQD", AccountClassification.Asset, fixture.UasCashMainIqdId, false, true), default));
    Assert.Equal(ErrorCodes.Accounting.FinanceOwnedAccountProtected, codeEx.Code);

    // 3. Direct reclassification away from Asset -> FinanceOwnedAccountProtected
    var classEx = await Assert.ThrowsAsync<BadRequestException>(() => accounting.UpdateAccountAsync(glId,
      new UpdateAccountRequest("13411101", "Locked Cashbox IQD", AccountClassification.Liability, fixture.UasCashMainIqdId, false, true), default));
    Assert.Equal(ErrorCodes.Accounting.FinanceOwnedAccountProtected, classEx.Code);

    // 4. Direct conversion to Group -> FinanceOwnedAccountProtected
    var groupEx = await Assert.ThrowsAsync<BadRequestException>(() => accounting.UpdateAccountAsync(glId,
      new UpdateAccountRequest("13411101", "Locked Cashbox IQD", AccountClassification.Asset, fixture.UasCashMainIqdId, true, true), default));
    Assert.Equal(ErrorCodes.Accounting.FinanceOwnedAccountProtected, groupEx.Code);

    // 5. Direct parent change -> FinanceOwnedAccountProtected
    var parentEx = await Assert.ThrowsAsync<BadRequestException>(() => accounting.UpdateAccountAsync(glId,
      new UpdateAccountRequest("13411101", "Locked Cashbox IQD", AccountClassification.Asset, fixture.UasBankIqdId, false, true), default));
    Assert.Equal(ErrorCodes.Accounting.FinanceOwnedAccountProtected, parentEx.Code);

    // 6. Direct deactivation while MoneyAccount is active -> FinanceOwnedAccountProtected
    var activeEx = await Assert.ThrowsAsync<BadRequestException>(() => accounting.UpdateAccountAsync(glId,
      new UpdateAccountRequest("13411101", "Locked Cashbox IQD", AccountClassification.Asset, fixture.UasCashMainIqdId, false, false), default));
    Assert.Equal(ErrorCodes.Accounting.FinanceOwnedAccountProtected, activeEx.Code);
  }

  [Fact]
  public async Task Money_account_with_financial_history_blocks_structural_changes_and_deletion()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    var account = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-OPS", "Ops Cashbox", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);
    await GrantOperateAsync(finance, account.Id, fixture.ManagerId);

    // Add opening balance
    await finance.PostOpeningMoneyBalanceAsync(account.Id, new OpeningMoneyBalanceRequest(
      DateOnly.FromDateTime(DateTime.UtcNow), 500_000, null, "Opening"), fixture.ManagerId, default);

    // Attempting to change Branch -> MoneyAccountStructuralChangeNotAllowed
    var branchEx = await Assert.ThrowsAsync<BadRequestException>(() => finance.UpdateMoneyAccountAsync(account.Id,
      new MoneyAccountRequest("CASH-OPS", "Ops Cashbox", MoneyAccountType.Cashbox,
        fixture.SubBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed, branchEx.Code);

    // Attempting to change Currency -> MoneyAccountStructuralChangeNotAllowed
    var currEx = await Assert.ThrowsAsync<BadRequestException>(() => finance.UpdateMoneyAccountAsync(account.Id,
      new MoneyAccountRequest("CASH-OPS", "Ops Cashbox", MoneyAccountType.Cashbox,
        fixture.MainBranchId, fixture.UsdCurrencyId, true), fixture.ManagerId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed, currEx.Code);

    // Attempting to change Type -> MoneyAccountStructuralChangeNotAllowed
    var typeEx = await Assert.ThrowsAsync<BadRequestException>(() => finance.UpdateMoneyAccountAsync(account.Id,
      new MoneyAccountRequest("CASH-OPS", "Ops Cashbox", MoneyAccountType.Bank,
        fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed, typeEx.Code);

    // Attempting to delete Money Account with history -> MoneyAccountStructuralChangeNotAllowed
    var delEx = await Assert.ThrowsAsync<BadRequestException>(() => finance.DeleteMoneyAccountAsync(account.Id, fixture.ManagerId, default));
    Assert.Equal(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed, delEx.Code);

    // Deactivating is allowed
    var deactivated = await finance.UpdateMoneyAccountAsync(account.Id,
      new MoneyAccountRequest("CASH-OPS", "Ops Cashbox", MoneyAccountType.Cashbox,
        fixture.MainBranchId, fixture.IqdCurrencyId, false), fixture.ManagerId, default);
    Assert.False(deactivated.IsActive);
  }

  [Fact]
  public async Task Money_account_without_history_can_be_safely_deleted_with_its_dedicated_gl()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    var account = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "UNUSED", "Unused Cashbox", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);
    await GrantOperateAsync(finance, account.Id, fixture.ManagerId);

    var glId = account.AccountingAccountId;
    Assert.True(await db.Accounts.AnyAsync(a => a.Id == glId));

    await finance.DeleteMoneyAccountAsync(account.Id, fixture.ManagerId, default);

    Assert.False(await db.MoneyAccounts.AnyAsync(m => m.Id == account.Id));
    Assert.False(await db.Accounts.AnyAsync(a => a.Id == glId));
  }

  [Fact]
  public async Task Money_transfers_post_debits_and_credits_to_dedicated_gl_accounts()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    var cash = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "SRC-CASH", "Source Cash", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);
    await GrantOperateAsync(finance, cash.Id, fixture.ManagerId);

    var bank = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "DST-BANK", "Dest Bank", MoneyAccountType.Bank,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);
    await GrantOperateAsync(finance, bank.Id, fixture.ManagerId);

    await finance.PostOpeningMoneyBalanceAsync(cash.Id, new OpeningMoneyBalanceRequest(
      DateOnly.FromDateTime(DateTime.UtcNow), 1_000_000, null, "Opening"), fixture.ManagerId, default);

    var draft = await finance.CreateMoneyTransferAsync(new MoneyTransferDraftRequest(
      DateOnly.FromDateTime(DateTime.UtcNow), cash.Id, bank.Id, 400_000, "Bank deposit"), fixture.ManagerId, default);

    var posted = await finance.PostMoneyTransferAsync(draft.Id, fixture.ManagerId, default);
    Assert.NotNull(posted.PostedAtUtc);

    var journalLines = await db.JournalLines
      .Where(l => l.JournalEntryId == posted.JournalEntryId)
      .ToListAsync();

    Assert.Equal(2, journalLines.Count);

    var debit = journalLines.Single(l => l.DebitBaseAmount == 400_000);
    var credit = journalLines.Single(l => l.CreditBaseAmount == 400_000);

    // Debit goes to dedicated Bank GL, Credit goes to dedicated Cash GL
    Assert.Equal(bank.AccountingAccountId, debit.AccountId);
    Assert.Equal(cash.AccountingAccountId, credit.AccountId);
  }

  [Fact]
  public async Task Comprehensive_reconciliation_verifies_money_ledger_equals_dedicated_gl_balance()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    var cashbox = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "POS-CASH", "Front Desk Cash", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);
    await GrantOperateAsync(finance, cashbox.Id, fixture.ManagerId);

    var bank = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "MAIN-BANK", "Main Bank", MoneyAccountType.Bank,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);
    await GrantOperateAsync(finance, bank.Id, fixture.ManagerId);

    // 1. Opening balance: +1,000,000
    await finance.PostOpeningMoneyBalanceAsync(cashbox.Id, new OpeningMoneyBalanceRequest(
      DateOnly.FromDateTime(DateTime.UtcNow), 1_000_000, null, "Opening"), fixture.ManagerId, default);

    // 2. Transfer to bank: -300,000
    var transfer = await finance.CreateMoneyTransferAsync(new MoneyTransferDraftRequest(
      DateOnly.FromDateTime(DateTime.UtcNow), cashbox.Id, bank.Id, 300_000, "Transfer"), fixture.ManagerId, default);
    await finance.PostMoneyTransferAsync(transfer.Id, fixture.ManagerId, default);

    // Expected balance = 1,000,000 - 300,000 = 700,000
    var fetchedCashbox = await finance.GetMoneyAccountAsync(cashbox.Id, fixture.ManagerId, default);
    Assert.Equal(700_000, fetchedCashbox.Balance);

    var ledgerEntries = await db.MoneyLedgerEntries.Where(e => e.MoneyAccountId == cashbox.Id).ToListAsync();
    var ledgerSum = ledgerEntries.Sum(e => e.Amount);
    Assert.Equal(700_000, ledgerSum);

    var glLines = await db.JournalLines.Where(l => l.AccountId == cashbox.AccountingAccountId).ToListAsync();
    var glNetDebit = glLines.Sum(l => l.DebitBaseAmount - l.CreditBaseAmount);
    Assert.Equal(700_000, glNetDebit);

    // Money Ledger Balance EXACTLY equals Dedicated GL Account Net Balance!
    Assert.Equal(ledgerSum, glNetDebit);
  }

  [Fact]
  public async Task Foreign_currency_money_account_records_usd_and_posts_base_iqd_to_dedicated_usd_gl()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    var usdCash = await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "USD-CASH", "USD Drawer", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.UsdCurrencyId, true), fixture.ManagerId, default);
    await GrantOperateAsync(finance, usdCash.Id, fixture.ManagerId);

    // Opening balance: $2,000 USD at rate 1,500 IQD/USD = 3,000,000 IQD base
    var opening = await finance.PostOpeningMoneyBalanceAsync(usdCash.Id, new OpeningMoneyBalanceRequest(
      DateOnly.FromDateTime(DateTime.UtcNow), 2_000, 1_500, "USD Opening"), fixture.ManagerId, default);

    Assert.Equal(2_000, opening.Amount);
    Assert.Equal(1_500, opening.ExchangeRate);
    Assert.Equal(3_000_000, opening.BaseAmount);

    var glLines = await db.JournalLines.Where(l => l.AccountId == usdCash.AccountingAccountId).ToListAsync();
    Assert.Single(glLines);
    Assert.Equal(3_000_000, glLines[0].DebitBaseAmount);
  }

  [Fact]
  public async Task Duplicate_operational_code_rejects_and_does_not_create_orphan_gl()
  {
    await using var db = CreateDb();
    var fixture = await SeedFixtureAsync(db);
    var finance = CreateFinanceService(db);

    await finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-SAME", "First Cashbox", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default);

    var glCountBefore = await db.Accounts.CountAsync();

    // Duplicate code CASH-SAME
    var conflict = await Assert.ThrowsAsync<ConflictException>(() => finance.CreateMoneyAccountAsync(new MoneyAccountRequest(
      "CASH-SAME", "Second Cashbox", MoneyAccountType.Cashbox,
      fixture.MainBranchId, fixture.IqdCurrencyId, true), fixture.ManagerId, default));

    Assert.Equal(ErrorCodes.Finance.MoneyAccountCodeTaken, conflict.Code);

    // Ensure no orphan GL was left behind
    var glCountAfter = await db.Accounts.CountAsync();
    Assert.Equal(glCountBefore, glCountAfter);
  }

  // --- Fixture Setup ---

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
    return new AppDbContext(options);
  }

  private static FinanceService CreateFinanceService(AppDbContext db) => new(db, Options.Create(new FinanceOptions
  {
    AccountsPayableAccountCode = "23214",
    OpeningBalanceEquityAccountCode = "261"
  }));

  private static AccountingService CreateAccountingService(AppDbContext db) => new(db);

  private static Task GrantOperateAsync(FinanceService finance, Guid accountId, Guid userId) =>
    finance.ReplaceMoneyAccountAccessAsync(accountId, new ReplaceMoneyAccountAccessRequest(
      [new(userId, MoneyAccountAccessLevel.Operate)]), default);

  private sealed record FixtureData(
    Guid ManagerId,
    Guid MainBranchId,
    Guid SubBranchId,
    Guid IqdCurrencyId,
    Guid UsdCurrencyId,
    Guid UasCashMainIqdId,
    Guid UasCashMainUsdId,
    Guid UasCashSubIqdId,
    Guid UasCashSubUsdId,
    Guid UasBankIqdId,
    Guid UasBankUsdId);

  private static async Task<FixtureData> SeedFixtureAsync(AppDbContext db)
  {
    var manager = new UserEntity { Username = "admin", PasswordHash = "hash", Role = UserRole.Manager };
    var iqd = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD", DecimalPlaces = 0 };
    var usd = new CurrencyEntity { Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2 };

    var business = new BusinessEntity
    {
      Name = "Prive Salon", PrimaryPhoneNumber = "07700000000", Address = "Mansour", City = "Baghdad",
      Region = "Baghdad", Country = "IQ", BaseCurrency = iqd, IsSetupCompleted = true
    };

    var mainBranch = new BranchEntity
    {
      Code = "MAIN", Name = "Main Branch", Address = "Mansour", City = "Baghdad",
      Region = "Baghdad", Country = "IQ", IsMainBranch = true
    };

    var subBranch = new BranchEntity
    {
      Code = "KARRADA", Name = "Karrada Branch", Address = "Karrada", City = "Baghdad",
      Region = "Baghdad", Country = "IQ", IsMainBranch = false
    };

    // Iraqi UAS Cash & Bank Classification Group Accounts
    var uas13 = new AccountEntity { Code = "13", Name = "الموجودات المتداولة", Classification = AccountClassification.Asset, IsGroup = true };
    var uas134 = new AccountEntity { Code = "134", Name = "النقود", Classification = AccountClassification.Asset, ParentAccount = uas13, IsGroup = true };
    var uas1341 = new AccountEntity { Code = "1341", Name = "نقدية بالصندوق", Classification = AccountClassification.Asset, ParentAccount = uas134, IsGroup = true };
    var uas13411 = new AccountEntity { Code = "13411", Name = "نقدية لدى صندوق المركز", Classification = AccountClassification.Asset, ParentAccount = uas1341, IsGroup = true };
    var uas134111 = new AccountEntity { Code = "134111", Name = "نقدية لدى صندوق المركز بالعملة المحلية", Classification = AccountClassification.Asset, ParentAccount = uas13411, IsGroup = true };
    var uas134112 = new AccountEntity { Code = "134112", Name = "نقدية لدى صندوق المركز بالعملة الأجنبية", Classification = AccountClassification.Asset, ParentAccount = uas13411, IsGroup = true };
    var uas13412 = new AccountEntity { Code = "13412", Name = "نقدية لدى صندوق الفروع", Classification = AccountClassification.Asset, ParentAccount = uas1341, IsGroup = true };
    var uas134121 = new AccountEntity { Code = "134121", Name = "نقدية لدى صندوق الفروع بالعملة المحلية", Classification = AccountClassification.Asset, ParentAccount = uas13412, IsGroup = true };
    var uas134122 = new AccountEntity { Code = "134122", Name = "نقدية لدى صندوق الفروع بالعملة الأجنبية", Classification = AccountClassification.Asset, ParentAccount = uas13412, IsGroup = true };
    var uas1342 = new AccountEntity { Code = "1342", Name = "نقدية لدى المصارف", Classification = AccountClassification.Asset, ParentAccount = uas134, IsGroup = true };
    var uas13421 = new AccountEntity { Code = "13421", Name = "نقدية لدى المصارف بالعملة المحلية", Classification = AccountClassification.Asset, ParentAccount = uas1342, IsGroup = true };
    var uas13422 = new AccountEntity { Code = "13422", Name = "نقدية لدى المصارف بالعملة الأجنبية", Classification = AccountClassification.Asset, ParentAccount = uas1342, IsGroup = true };

    var equity = new AccountEntity { Code = "261", Name = "رأس المال المدفوع", Classification = AccountClassification.Equity };
    var ap = new AccountEntity { Code = "23214", Name = "موردو النشاط الجاري", Classification = AccountClassification.Liability };

    db.AddRange(manager, iqd, usd, business, mainBranch, subBranch,
      uas13, uas134, uas1341, uas13411, uas134111, uas134112, uas13412, uas134121, uas134122, uas1342, uas13421, uas13422,
      equity, ap);
    await db.SaveChangesAsync();

    return new FixtureData(
      manager.Id,
      mainBranch.Id,
      subBranch.Id,
      iqd.Id,
      usd.Id,
      uas134111.Id,
      uas134112.Id,
      uas134121.Id,
      uas134122.Id,
      uas13421.Id,
      uas13422.Id);
  }
}
