using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Expenses;
using Api.Modules.Finance;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class ExpenseWorkflowTests
{
  [Fact]
  public async Task Category_create_valid_and_reject_invalid_accounts()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    // Valid Expense Category
    var validCategory = await service.CreateCategoryAsync(
      new ExpenseCategoryRequest("RENT", "Office Rent", data.RentExpenseGlId, true, "Monthly rent"),
      default);

    Assert.Equal("RENT", validCategory.Code);
    Assert.Equal("Office Rent", validCategory.Name);
    Assert.Equal(data.RentExpenseGlId, validCategory.AccountingAccountId);

    // Reject Asset Account
    var exAsset = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CreateCategoryAsync(new ExpenseCategoryRequest("ASSET_CAT", "Asset Cat", data.MoneyAccountGlId, true), default));
    Assert.Equal(ErrorCodes.Expenses.AccountNotExpense, exAsset.Code);

    // Reject Liability Account
    var exLiab = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CreateCategoryAsync(new ExpenseCategoryRequest("LIAB_CAT", "Liab Cat", data.LiabilityGlId, true), default));
    Assert.Equal(ErrorCodes.Expenses.AccountNotExpense, exLiab.Code);

    // Reject Revenue Account
    var exRev = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CreateCategoryAsync(new ExpenseCategoryRequest("REV_CAT", "Rev Cat", data.RevenueGlId, true), default));
    Assert.Equal(ErrorCodes.Expenses.AccountNotExpense, exRev.Code);

    // Reject Group Account
    var exGroup = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CreateCategoryAsync(new ExpenseCategoryRequest("GRP_CAT", "Group Cat", data.GroupExpenseGlId, true), default));
    Assert.Equal(ErrorCodes.Expenses.AccountNotExpense, exGroup.Code);

    // Reject Inactive Account
    var exInactive = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CreateCategoryAsync(new ExpenseCategoryRequest("INACT_CAT", "Inactive Cat", data.InactiveExpenseGlId, true), default));
    Assert.Equal(ErrorCodes.Expenses.AccountNotExpense, exInactive.Code);
  }

  [Fact]
  public async Task Category_delete_unused_allowed_and_used_category_rejected()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var category = await service.CreateCategoryAsync(
      new ExpenseCategoryRequest("TEMP", "Temporary Cat", data.RentExpenseGlId, true),
      default);

    // Delete unused category is allowed
    await service.DeleteCategoryAsync(category.Id, default);
    Assert.False(await db.ExpenseCategories.AnyAsync(c => c.Id == category.Id));

    // Create another category and use it in an expense
    var usedCategory = await service.CreateCategoryAsync(
      new ExpenseCategoryRequest("USED", "Used Cat", data.CleaningExpenseGlId, true),
      default);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(data.BranchId, DateOnly.FromDateTime(DateTime.UtcNow), data.MoneyAccountId, null, null, "Landlord", "Ref-1", "Notes",
        [new(usedCategory.Id, "Cleaning", 50000)]),
      data.ManagerUserId,
      default);

    // Used in draft line -> reject delete
    var exConflict = await Assert.ThrowsAsync<ConflictException>(() =>
      service.DeleteCategoryAsync(usedCategory.Id, default));
    Assert.Equal(ErrorCodes.Expenses.CategoryInUse, exConflict.Code);
  }

  [Fact]
  public async Task Category_mapping_change_does_not_affect_historical_posted_expense()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var category = await service.CreateCategoryAsync(
      new ExpenseCategoryRequest("MARKETING", "Marketing", data.AdvertisingExpenseGlId, true),
      default);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(data.BranchId, DateOnly.FromDateTime(DateTime.UtcNow), data.MoneyAccountId, null, null, "Meta Ads", null, null,
        [new(category.Id, "Facebook Ads", 100000)]),
      data.ManagerUserId,
      default);

    var posted = await service.PostAsync(draft.Id, data.ManagerUserId, default);

    // Initial posted line snapshot
    Assert.Equal(data.AdvertisingExpenseGlId, Assert.Single(posted.Lines).ExpenseAccountingAccountId);

    // Change category to point to RentExpenseGlId
    await service.UpdateCategoryAsync(category.Id,
      new ExpenseCategoryRequest("MARKETING", "Marketing", data.RentExpenseGlId, true),
      default);

    // Re-query the posted expense -> line must still preserve original advertising GL account
    var reloadExpense = await service.GetByIdAsync(posted.Id, default);
    Assert.Equal(data.AdvertisingExpenseGlId, Assert.Single(reloadExpense.Lines).ExpenseAccountingAccountId);

    var journal = await db.JournalEntries.Include(j => j.Lines).SingleAsync(j => j.Id == reloadExpense.JournalEntryId);
    Assert.Contains(journal.Lines, l => l.AccountId == data.AdvertisingExpenseGlId && l.OriginalDebitAmount == 100000);
    Assert.DoesNotContain(journal.Lines, l => l.AccountId == data.RentExpenseGlId);
  }

  [Fact]
  public async Task Draft_create_edit_and_delete_have_no_financial_or_accounting_effect()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var request = new ExpenseDraftRequest(
      data.BranchId,
      DateOnly.FromDateTime(DateTime.UtcNow),
      data.MoneyAccountId,
      null,
      data.ContactId,
      "Supplier LLC",
      "INV-100",
      "Draft notes",
      [
        new(data.AdvertisingCategoryId, "Promo", 30000),
        new(data.CleaningCategoryId, "Soap", 20000)
      ]);

    var draft = await service.CreateDraftAsync(request, data.ManagerUserId, default);
    Assert.Equal("EXP-000001", draft.DocumentNumber);
    Assert.Equal(ExpenseDocumentStatus.Draft, draft.Status);
    Assert.Equal(50000, draft.TotalAmount);
    Assert.Equal(50000, draft.BaseTotalAmount);
    Assert.Empty(db.MoneyLedgerEntries);
    Assert.Empty(db.JournalEntries);

    // Edit draft
    var updated = await service.UpdateDraftAsync(draft.Id, request with
    {
      Lines = [new(data.AdvertisingCategoryId, "Promo Updated", 40000)]
    }, data.ManagerUserId, default);

    Assert.Equal(40000, updated.TotalAmount);
    Assert.Empty(db.MoneyLedgerEntries);
    Assert.Empty(db.JournalEntries);

    // Delete draft
    await service.DeleteDraftAsync(draft.Id, data.ManagerUserId, default);
    Assert.Empty(db.ExpenseDocuments);
    Assert.Empty(db.ExpenseLines);
    Assert.Empty(db.MoneyLedgerEntries);
    Assert.Empty(db.JournalEntries);
  }

  [Fact]
  public async Task Posting_IQD_expense_creates_money_ledger_outflow_and_dedicated_balanced_journal()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(
        data.BranchId,
        DateOnly.FromDateTime(DateTime.UtcNow),
        data.MoneyAccountId,
        null,
        null,
        "Baghdad Electric",
        "ELEC-2026",
        "August Electricity",
        [new(data.ElectricityCategoryId, "Power bill", 125000)]),
      data.ManagerUserId,
      default);

    var posted = await service.PostAsync(draft.Id, data.ManagerUserId, default);

    Assert.Equal(ExpenseDocumentStatus.Posted, posted.Status);
    Assert.NotNull(posted.PostedAtUtc);
    Assert.Equal(data.ManagerUserId, posted.PostedByUserId);
    Assert.NotNull(posted.JournalEntryId);
    Assert.NotNull(posted.MoneyLedgerEntryId);

    // Money Ledger verification
    var ledger = await db.MoneyLedgerEntries.SingleAsync(m => m.SourceDocumentId == posted.Id);
    Assert.Equal(MoneyLedgerSourceType.Expense, ledger.SourceType);
    Assert.Equal(-125000, ledger.Amount);
    Assert.Equal(-125000, ledger.BaseAmount);
    Assert.Equal(data.MoneyAccountId, ledger.MoneyAccountId);
    Assert.Equal(posted.DocumentNumber, ledger.DocumentNumber);

    // Accounting Journal verification
    var journal = await db.JournalEntries.Include(j => j.Lines).SingleAsync(j => j.Id == posted.JournalEntryId);
    Assert.Equal(JournalEntryStatus.Posted, journal.Status);
    Assert.Equal(data.BranchId, journal.BranchId);

    var drLine = Assert.Single(journal.Lines, l => l.OriginalDebitAmount > 0);
    Assert.Equal(data.ElectricityExpenseGlId, drLine.AccountId);
    Assert.Equal(125000, drLine.OriginalDebitAmount);
    Assert.Equal(125000, drLine.DebitBaseAmount);

    var crLine = Assert.Single(journal.Lines, l => l.OriginalCreditAmount > 0);
    Assert.Equal(data.MoneyAccountGlId, crLine.AccountId);
    Assert.Equal(125000, crLine.OriginalCreditAmount);
    Assert.Equal(125000, crLine.CreditBaseAmount);

    Assert.Equal(journal.Lines.Sum(l => l.DebitBaseAmount), journal.Lines.Sum(l => l.CreditBaseAmount));
  }

  [Fact]
  public async Task Posting_multi_line_expense_creates_multiple_debits_and_single_credit()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(
        data.BranchId,
        DateOnly.FromDateTime(DateTime.UtcNow),
        data.MoneyAccountId,
        null,
        null,
        "Office Supplies & Bills",
        "MULTI-001",
        "Combined maintenance and supplies",
        [
          new(data.ElectricityCategoryId, "Power", 50000),
          new(data.AdvertisingCategoryId, "Pamphlets", 30000),
          new(data.CleaningCategoryId, "Janitorial", 20000)
        ]),
      data.ManagerUserId,
      default);

    var posted = await service.PostAsync(draft.Id, data.ManagerUserId, default);

    Assert.Equal(100000, posted.TotalAmount);
    Assert.Equal(100000, posted.BaseTotalAmount);
    Assert.Equal(3, posted.Lines.Count);

    // One single Money Ledger entry for total outflow
    var ledger = await db.MoneyLedgerEntries.SingleAsync(m => m.SourceDocumentId == posted.Id);
    Assert.Equal(-100000, ledger.Amount);

    // Journal contains 3 Dr lines and 1 Cr line
    var journal = await db.JournalEntries.Include(j => j.Lines).SingleAsync(j => j.Id == posted.JournalEntryId);
    Assert.Equal(4, journal.Lines.Count);

    var debits = journal.Lines.Where(l => l.OriginalDebitAmount > 0).ToList();
    Assert.Equal(3, debits.Count);
    Assert.Equal(100000, debits.Sum(d => d.OriginalDebitAmount));

    var credit = Assert.Single(journal.Lines, l => l.OriginalCreditAmount > 0);
    Assert.Equal(data.MoneyAccountGlId, credit.AccountId);
    Assert.Equal(100000, credit.OriginalCreditAmount);
  }

  [Fact]
  public async Task Posting_foreign_currency_expense_resolves_historical_rate_and_preserves_currency_facts()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(
        data.BranchId,
        DateOnly.FromDateTime(DateTime.UtcNow),
        data.ForeignMoneyAccountId,
        1300m,
        null,
        "Google Ads",
        "GGL-AUG",
        "Search ads",
        [new(data.AdvertisingCategoryId, "Cloud search ads", 100m)]),
      data.ManagerUserId,
      default);

    Assert.Equal(100m, draft.TotalAmount);
    Assert.Equal(130000m, draft.BaseTotalAmount);

    var posted = await service.PostAsync(draft.Id, data.ManagerUserId, default);

    Assert.Equal(100m, posted.TotalAmount);
    Assert.Equal(130000m, posted.BaseTotalAmount);

    var ledger = await db.MoneyLedgerEntries.SingleAsync(m => m.SourceDocumentId == posted.Id);
    Assert.Equal(-100m, ledger.Amount);
    Assert.Equal(-130000m, ledger.BaseAmount);
    Assert.Equal(data.UsdCurrencyId, ledger.CurrencyId);
    Assert.Equal(1300m, ledger.ExchangeRate);

    var journal = await db.JournalEntries.Include(j => j.Lines).SingleAsync(j => j.Id == posted.JournalEntryId);
    var dr = Assert.Single(journal.Lines, l => l.DebitBaseAmount > 0);
    Assert.Equal(100m, dr.OriginalDebitAmount);
    Assert.Equal(130000m, dr.DebitBaseAmount);
    Assert.Equal(data.UsdCurrencyId, dr.CurrencyId);
    Assert.Equal(1300m, dr.ExchangeRate);

    var cr = Assert.Single(journal.Lines, l => l.CreditBaseAmount > 0);
    Assert.Equal(100m, cr.OriginalCreditAmount);
    Assert.Equal(130000m, cr.CreditBaseAmount);
    Assert.Equal(data.ForeignMoneyAccountGlId, cr.AccountId);

    // If exchange rates change in the future, posted expense remains untouched
    db.ExchangeRates.Add(new ExchangeRateEntity
    {
      FromCurrencyId = data.UsdCurrencyId,
      ToCurrencyId = data.IqdCurrencyId,
      Rate = 1450m,
      EffectiveAtUtc = DateTime.UtcNow.AddDays(1),
      CreatedByUserId = data.ManagerUserId
    });
    await db.SaveChangesAsync();

    var reloaded = await service.GetByIdAsync(posted.Id, default);
    Assert.Equal(100m, reloaded.TotalAmount);
    Assert.Equal(130000m, reloaded.BaseTotalAmount);
    Assert.Equal(1300m, reloaded.ExchangeRate);
  }

  [Fact]
  public async Task Posting_rejects_inactive_money_account_and_branch_mismatch()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    // Other Branch Money Account
    var otherBranch = new BranchEntity
    {
      Code = "BRANCH_2",
      Name = "Branch Two",
      Address = "B",
      City = "C",
      Region = "R",
      Country = "IQ",
      IsMainBranch = false
    };
    var otherMoneyAccount = new MoneyAccountEntity
    {
      Code = "CASH-B2",
      Name = "Cash Branch 2",
      Type = MoneyAccountType.Cashbox,
      Branch = otherBranch,
      CurrencyId = data.IqdCurrencyId,
      AccountingAccountId = data.MoneyAccountGlId
    };
    db.AddRange(otherBranch, otherMoneyAccount);
    db.MoneyAccountAccess.Add(new MoneyAccountAccessEntity
    {
      MoneyAccountId = otherMoneyAccount.Id,
      UserId = data.ManagerUserId,
      AccessLevel = MoneyAccountAccessLevel.Operate
    });
    await db.SaveChangesAsync();

    // Draft with branch mismatch
    var exBranchMismatch = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CreateDraftAsync(
        new ExpenseDraftRequest(
          data.BranchId,
          DateOnly.FromDateTime(DateTime.UtcNow),
          otherMoneyAccount.Id,
          null, null, null, null, null,
          [new(data.CleaningCategoryId, "Cleaning", 10000)]),
        data.ManagerUserId,
        default));
    Assert.Equal(ErrorCodes.Expenses.MoneyAccountBranchMismatch, exBranchMismatch.Code);

    // Inactive Money Account
    var inactiveAccount = new MoneyAccountEntity
    {
      Code = "CASH-INACT",
      Name = "Inactive Cash",
      Type = MoneyAccountType.Cashbox,
      BranchId = data.BranchId,
      CurrencyId = data.IqdCurrencyId,
      AccountingAccountId = data.MoneyAccountGlId,
      IsActive = false
    };
    db.MoneyAccounts.Add(inactiveAccount);
    db.MoneyAccountAccess.Add(new MoneyAccountAccessEntity
    {
      MoneyAccountId = inactiveAccount.Id,
      UserId = data.ManagerUserId,
      AccessLevel = MoneyAccountAccessLevel.Operate
    });
    await db.SaveChangesAsync();

    var exInactive = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.CreateDraftAsync(
        new ExpenseDraftRequest(
          data.BranchId,
          DateOnly.FromDateTime(DateTime.UtcNow),
          inactiveAccount.Id,
          null, null, null, null, null,
          [new(data.CleaningCategoryId, "Cleaning", 10000)]),
        data.ManagerUserId,
        default));
    Assert.Equal(ErrorCodes.Expenses.MoneyAccountInvalid, exInactive.Code);
  }

  [Fact]
  public async Task Posting_enforces_money_account_operate_permission()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    // User without Operate access
    var exNoAccess = await Assert.ThrowsAsync<ForbiddenException>(() =>
      service.CreateDraftAsync(
        new ExpenseDraftRequest(
          data.BranchId,
          DateOnly.FromDateTime(DateTime.UtcNow),
          data.MoneyAccountId,
          null, null, null, null, null,
          [new(data.CleaningCategoryId, "Cleaning", 10000)]),
        data.ViewerUserId,
        default));
    Assert.Equal(ErrorCodes.Expenses.MoneyAccountAccessDenied, exNoAccess.Code);
  }

  [Fact]
  public async Task Posting_is_atomic_on_failure()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(
        data.BranchId,
        DateOnly.FromDateTime(DateTime.UtcNow),
        data.MoneyAccountId,
        null, null, null, null, null,
        [new(data.CleaningCategoryId, "Cleaning", 25000)]),
      data.ManagerUserId,
      default);

    // Deactivate the category prior to posting to trigger a failure
    var category = await db.ExpenseCategories.FindAsync(data.CleaningCategoryId);
    category!.IsActive = false;
    await db.SaveChangesAsync();

    var exFail = await Assert.ThrowsAsync<BadRequestException>(() =>
      service.PostAsync(draft.Id, data.ManagerUserId, default));
    Assert.Equal(ErrorCodes.Expenses.CategoryInvalid, exFail.Code);

    // Ensure status remains Draft, no ledger entry, no journal
    var reloaded = await db.ExpenseDocuments.FindAsync(draft.Id);
    Assert.Equal(ExpenseDocumentStatus.Draft, reloaded!.Status);
    Assert.Empty(db.MoneyLedgerEntries);
    Assert.Empty(db.JournalEntries);
  }

  [Fact]
  public async Task Reconciliation_money_ledger_decrease_equals_cashbox_gl_decrease()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(
        data.BranchId,
        DateOnly.FromDateTime(DateTime.UtcNow),
        data.MoneyAccountId,
        null, null, null, null, null,
        [
          new(data.AdvertisingCategoryId, "Ad", 60000),
          new(data.CleaningCategoryId, "Clean", 40000)
        ]),
      data.ManagerUserId,
      default);

    await service.PostAsync(draft.Id, data.ManagerUserId, default);

    var totalLedgerOutflow = await db.MoneyLedgerEntries
      .Where(m => m.MoneyAccountId == data.MoneyAccountId)
      .SumAsync(m => m.Amount);

    var totalGlCredit = await db.JournalLines
      .Where(j => j.AccountId == data.MoneyAccountGlId)
      .SumAsync(j => j.OriginalCreditAmount);

    Assert.Equal(-100000, totalLedgerOutflow);
    Assert.Equal(100000, totalGlCredit);
    Assert.Equal(Math.Abs(totalLedgerOutflow), totalGlCredit);
  }

  [Fact]
  public async Task Posted_expense_is_immutable_and_cannot_be_deleted_or_edited()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(
        data.BranchId,
        DateOnly.FromDateTime(DateTime.UtcNow),
        data.MoneyAccountId,
        null, null, null, null, null,
        [new(data.AdvertisingCategoryId, "Ad", 50000)]),
      data.ManagerUserId,
      default);

    var posted = await service.PostAsync(draft.Id, data.ManagerUserId, default);

    // Cannot edit posted expense
    var exEdit = await Assert.ThrowsAsync<ConflictException>(() =>
      service.UpdateDraftAsync(posted.Id,
        new ExpenseDraftRequest(data.BranchId, DateOnly.FromDateTime(DateTime.UtcNow), data.MoneyAccountId, null, null, null, null, null,
          [new(data.AdvertisingCategoryId, "New Ad", 60000)]),
        data.ManagerUserId,
        default));
    Assert.Equal(ErrorCodes.Expenses.DocumentNotDraft, exEdit.Code);

    // Cannot delete posted expense
    var exDelete = await Assert.ThrowsAsync<ConflictException>(() =>
      service.DeleteDraftAsync(posted.Id, data.ManagerUserId, default));
    Assert.Equal(ErrorCodes.Expenses.DocumentNotDraft, exDelete.Code);
  }

  [Fact]
  public async Task Expense_journals_are_source_owned_and_cannot_be_directly_reversed_in_accounting()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ExpensesService(db);

    var draft = await service.CreateDraftAsync(
      new ExpenseDraftRequest(
        data.BranchId,
        DateOnly.FromDateTime(DateTime.UtcNow),
        data.MoneyAccountId,
        null, null, null, null, null,
        [new(data.AdvertisingCategoryId, "Ad", 50000)]),
      data.ManagerUserId,
      default);

    var posted = await service.PostAsync(draft.Id, data.ManagerUserId, default);
    Assert.NotNull(posted.JournalEntryId);

    var accountingService = new AccountingService(db);
    var exRev = await Assert.ThrowsAsync<BadRequestException>(() =>
      accountingService.ReverseJournalAsync(posted.JournalEntryId!.Value, default));

    Assert.True(
      exRev.Code == ErrorCodes.Expenses.JournalDirectReversalNotAllowed ||
      exRev.Code == ErrorCodes.Finance.JournalDirectReversalNotAllowed);
  }

  // ---------------------------------------------------------------------------
  // Helpers & Test Data
  // ---------------------------------------------------------------------------

  private static AppDbContext CreateDb(string? databaseName = null)
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString()).Options;
    return new AppDbContext(options);
  }

  private static async Task<TestData> SeedAsync(AppDbContext db)
  {
    var manager = new UserEntity { Username = "manager", PasswordHash = "test", Role = UserRole.Manager };
    var viewer = new UserEntity { Username = "viewer", PasswordHash = "test", Role = UserRole.Cashier };
    var iqd = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD", DecimalPlaces = 0 };
    var usd = new CurrencyEntity { Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2 };

    var business = new BusinessEntity
    {
      Name = "Prive Salon", PrimaryPhoneNumber = "123", Address = "A", City = "Baghdad", Region = "Baghdad", Country = "IQ",
      BaseCurrency = iqd, IsSetupCompleted = true
    };
    var branch = new BranchEntity
    {
      Code = "PRIVE_MAIN", Name = "Prive Main", Address = "Mansour", City = "Baghdad", Region = "Baghdad", Country = "IQ", IsMainBranch = true
    };

    var contact = new ContactEntity { Name = "General Landlord", IsSupplier = false, IsCustomer = false };

    // GL Accounts
    var moneyGl = new AccountEntity { Code = "13411101", Name = "Main Cashbox IQD GL", Classification = AccountClassification.Asset };
    var foreignMoneyGl = new AccountEntity { Code = "13411201", Name = "Main Cashbox USD GL", Classification = AccountClassification.Asset };
    var liabGl = new AccountEntity { Code = "23214", Name = "Accounts Payable", Classification = AccountClassification.Liability };
    var revGl = new AccountEntity { Code = "4211", Name = "Sales Revenue", Classification = AccountClassification.Revenue };

    // Expense GL Accounts
    var rentGl = new AccountEntity { Code = "33412", Name = "Rent Expense", Classification = AccountClassification.Expense };
    var advGl = new AccountEntity { Code = "33161", Name = "Advertising Expense", Classification = AccountClassification.Expense };
    var elecGl = new AccountEntity { Code = "3272", Name = "Electricity Expense", Classification = AccountClassification.Expense };
    var cleanGl = new AccountEntity { Code = "3399", Name = "Cleaning Expense", Classification = AccountClassification.Expense };
    var groupExpGl = new AccountEntity { Code = "33", Name = "Services Expenses Group", Classification = AccountClassification.Expense, IsGroup = true };
    var inactExpGl = new AccountEntity { Code = "3362", Name = "Inactive Insurance Expense", Classification = AccountClassification.Expense, IsActive = false };

    var moneyAccount = new MoneyAccountEntity
    {
      Code = "CASH-IQD-MAIN",
      Name = "Main Cashbox IQD",
      Type = MoneyAccountType.Cashbox,
      Branch = branch,
      Currency = iqd,
      AccountingAccount = moneyGl
    };

    var foreignMoneyAccount = new MoneyAccountEntity
    {
      Code = "CASH-USD-MAIN",
      Name = "Main Cashbox USD",
      Type = MoneyAccountType.Cashbox,
      Branch = branch,
      Currency = usd,
      AccountingAccount = foreignMoneyGl
    };

    // Pre-seeded Categories
    var advCat = new ExpenseCategoryEntity { Code = "ADV", Name = "Marketing & Advertising", AccountingAccount = advGl };
    var cleanCat = new ExpenseCategoryEntity { Code = "CLN", Name = "Cleaning & Maintenance", AccountingAccount = cleanGl };
    var elecCat = new ExpenseCategoryEntity { Code = "ELEC", Name = "Electricity & Utilities", AccountingAccount = elecGl };

    // FX Rate
    var fxRate = new ExchangeRateEntity
    {
      FromCurrency = usd,
      ToCurrency = iqd,
      Rate = 1300m,
      EffectiveAtUtc = DateTime.UtcNow.AddDays(-10),
      CreatedByUser = manager
    };

    db.AddRange(manager, viewer, iqd, usd, business, branch, contact, moneyGl, foreignMoneyGl, liabGl, revGl,
      rentGl, advGl, elecGl, cleanGl, groupExpGl, inactExpGl, moneyAccount, foreignMoneyAccount,
      advCat, cleanCat, elecCat, fxRate);

    await db.SaveChangesAsync();

    // Access assignments
    db.MoneyAccountAccess.AddRange(
      new MoneyAccountAccessEntity { MoneyAccountId = moneyAccount.Id, UserId = manager.Id, AccessLevel = MoneyAccountAccessLevel.Operate },
      new MoneyAccountAccessEntity { MoneyAccountId = moneyAccount.Id, UserId = viewer.Id, AccessLevel = MoneyAccountAccessLevel.View },
      new MoneyAccountAccessEntity { MoneyAccountId = foreignMoneyAccount.Id, UserId = manager.Id, AccessLevel = MoneyAccountAccessLevel.Operate });

    await db.SaveChangesAsync();

    return new TestData(
      manager.Id,
      viewer.Id,
      branch.Id,
      iqd.Id,
      usd.Id,
      contact.Id,
      moneyAccount.Id,
      foreignMoneyAccount.Id,
      moneyGl.Id,
      foreignMoneyGl.Id,
      liabGl.Id,
      revGl.Id,
      rentGl.Id,
      advGl.Id,
      elecGl.Id,
      cleanGl.Id,
      groupExpGl.Id,
      inactExpGl.Id,
      advCat.Id,
      cleanCat.Id,
      elecCat.Id);
  }

  private sealed record TestData(
    Guid ManagerUserId,
    Guid ViewerUserId,
    Guid BranchId,
    Guid IqdCurrencyId,
    Guid UsdCurrencyId,
    Guid ContactId,
    Guid MoneyAccountId,
    Guid ForeignMoneyAccountId,
    Guid MoneyAccountGlId,
    Guid ForeignMoneyAccountGlId,
    Guid LiabilityGlId,
    Guid RevenueGlId,
    Guid RentExpenseGlId,
    Guid AdvertisingExpenseGlId,
    Guid ElectricityExpenseGlId,
    Guid CleaningExpenseGlId,
    Guid GroupExpenseGlId,
    Guid InactiveExpenseGlId,
    Guid AdvertisingCategoryId,
    Guid CleaningCategoryId,
    Guid ElectricityCategoryId);
}
