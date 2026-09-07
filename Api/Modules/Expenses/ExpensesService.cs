using System.Data;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Business;
using Api.Modules.Finance;
using Api.Modules.User;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Expenses;

public sealed class ExpensesService
{
  private readonly AppDbContext _db;

  public ExpensesService(AppDbContext db)
  {
    _db = db;
  }

  // ---------------------------------------------------------------------------
  // Expense Categories
  // ---------------------------------------------------------------------------

  public async Task<PagedResult<ExpenseCategoryResponse>> GetCategoriesAsync(
    ExpenseCategoryListQuery query,
    CancellationToken ct)
  {
    var q = _db.ExpenseCategories.AsNoTracking()
      .Include(c => c.AccountingAccount)
      .AsQueryable();

    if (!string.IsNullOrWhiteSpace(query.Search))
    {
      var search = query.Search.Trim().ToLower();
      q = q.Where(c => c.Code.ToLower().Contains(search) || c.Name.ToLower().Contains(search));
    }

    if (query.IsActive.HasValue)
    {
      q = q.Where(c => c.IsActive == query.IsActive.Value);
    }

    return await q
      .OrderBy(c => c.Code)
      .Select(c => new ExpenseCategoryResponse(
        c.Id,
        c.Code,
        c.Name,
        c.AccountingAccountId,
        c.AccountingAccount.Code,
        c.AccountingAccount.Name,
        c.IsActive,
        c.Description,
        c.CreatedAtUtc,
        c.UpdatedAtUtc))
      .ToPagedResultAsync(query, ct);
  }

  public async Task<List<ExpenseCategoryOptionResponse>> GetCategoryOptionsAsync(CancellationToken ct)
  {
    return await _db.ExpenseCategories.AsNoTracking()
      .Include(c => c.AccountingAccount)
      .Where(c => c.IsActive)
      .OrderBy(c => c.Code)
      .Select(c => new ExpenseCategoryOptionResponse(
        c.Id,
        c.Code,
        c.Name,
        c.AccountingAccountId,
        c.AccountingAccount.Code,
        c.AccountingAccount.Name))
      .ToListAsync(ct);
  }

  public async Task<ExpenseCategoryResponse> GetCategoryByIdAsync(Guid id, CancellationToken ct)
  {
    var category = await _db.ExpenseCategories.AsNoTracking()
      .Include(c => c.AccountingAccount)
      .SingleOrDefaultAsync(c => c.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Expenses.CategoryNotFound, $"Expense category with id '{id}' was not found.");

    return ToCategoryResponse(category);
  }

  public async Task<ExpenseCategoryResponse> CreateCategoryAsync(ExpenseCategoryRequest request, CancellationToken ct)
  {
    var code = request.Code.Trim();
    if (await _db.ExpenseCategories.AnyAsync(c => c.Code == code, ct))
    {
      throw new ConflictException(ErrorCodes.Expenses.CategoryCodeTaken, $"Expense category code '{code}' is already taken.");
    }

    var account = await ValidateExpenseAccountAsync(request.AccountingAccountId, ct);

    var category = new ExpenseCategoryEntity
    {
      Code = code,
      Name = request.Name.Trim(),
      AccountingAccountId = account.Id,
      IsActive = request.IsActive,
      Description = Trim(request.Description),
      CreatedAtUtc = DateTime.UtcNow,
      UpdatedAtUtc = DateTime.UtcNow
    };

    _db.ExpenseCategories.Add(category);
    await _db.SaveChangesAsync(ct);

    return new ExpenseCategoryResponse(
      category.Id,
      category.Code,
      category.Name,
      category.AccountingAccountId,
      account.Code,
      account.Name,
      category.IsActive,
      category.Description,
      category.CreatedAtUtc,
      category.UpdatedAtUtc);
  }

  public async Task<ExpenseCategoryResponse> UpdateCategoryAsync(Guid id, ExpenseCategoryRequest request, CancellationToken ct)
  {
    var category = await _db.ExpenseCategories
      .Include(c => c.AccountingAccount)
      .SingleOrDefaultAsync(c => c.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Expenses.CategoryNotFound, $"Expense category with id '{id}' was not found.");

    var code = request.Code.Trim();
    if (category.Code != code && await _db.ExpenseCategories.AnyAsync(c => c.Code == code && c.Id != id, ct))
    {
      throw new ConflictException(ErrorCodes.Expenses.CategoryCodeTaken, $"Expense category code '{code}' is already taken.");
    }

    var account = await ValidateExpenseAccountAsync(request.AccountingAccountId, ct);

    category.Code = code;
    category.Name = request.Name.Trim();
    category.AccountingAccountId = account.Id;
    category.IsActive = request.IsActive;
    category.Description = Trim(request.Description);
    category.UpdatedAtUtc = DateTime.UtcNow;

    await _db.SaveChangesAsync(ct);

    return new ExpenseCategoryResponse(
      category.Id,
      category.Code,
      category.Name,
      category.AccountingAccountId,
      account.Code,
      account.Name,
      category.IsActive,
      category.Description,
      category.CreatedAtUtc,
      category.UpdatedAtUtc);
  }

  public async Task DeleteCategoryAsync(Guid id, CancellationToken ct)
  {
    var category = await _db.ExpenseCategories.SingleOrDefaultAsync(c => c.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Expenses.CategoryNotFound, $"Expense category with id '{id}' was not found.");

    var isUsed = await _db.ExpenseLines.IgnoreQueryFilters().AnyAsync(l => l.ExpenseCategoryId == id, ct);
    if (isUsed)
    {
      throw new ConflictException(
        ErrorCodes.Expenses.CategoryInUse,
        $"Expense category '{category.Code}' has historical expense lines and cannot be deleted. Deactivate it instead.");
    }

    _db.ExpenseCategories.Remove(category);
    await _db.SaveChangesAsync(ct);
  }

  // ---------------------------------------------------------------------------
  // Expenses Documents
  // ---------------------------------------------------------------------------

  public async Task<PagedResult<ExpenseListSummaryResponse>> GetAllAsync(
    ExpenseListQuery query,
    CancellationToken ct)
  {
    var q = BuildFilteredQuery(query);

    return await q
      .OrderByDescending(d => d.ExpenseDate)
      .ThenByDescending(d => d.DocumentNumber)
      .Select(d => new ExpenseListSummaryResponse(
        d.Id,
        d.DocumentNumber,
        d.Status,
        d.ExpenseDate,
        d.BranchId,
        d.Branch.Name,
        d.MoneyAccountId,
        d.MoneyAccount.Code,
        d.MoneyAccount.Name,
        d.CurrencyId,
        d.Currency.Code,
        d.ExchangeRate,
        d.ContactId,
        d.Contact != null ? d.Contact.Name : null,
        d.PayeeName,
        d.Reference,
        d.TotalAmount,
        d.BaseTotalAmount,
        d.CreatedByUser.Username,
        d.CreatedAtUtc,
        d.PostedAtUtc))
      .ToPagedResultAsync(query, ct);
  }

  public async Task<ExpenseSummaryResponse> GetSummaryAsync(ExpenseListQuery query, CancellationToken ct)
  {
    var q = BuildFilteredQuery(query);

    var totals = await q.GroupBy(_ => 1)
      .Select(g => new
      {
        Total = g.Sum(x => x.TotalAmount),
        BaseTotal = g.Sum(x => x.BaseTotalAmount),
        Count = g.Count()
      })
      .FirstOrDefaultAsync(ct);

    return new ExpenseSummaryResponse(
      totals?.Total ?? 0m,
      totals?.BaseTotal ?? 0m,
      totals?.Count ?? 0);
  }

  public async Task<ExpenseResponse> GetByIdAsync(Guid id, CancellationToken ct)
  {
    var expense = await _db.ExpenseDocuments.AsNoTracking()
      .Include(d => d.Branch)
      .Include(d => d.MoneyAccount)
      .Include(d => d.Currency)
      .Include(d => d.BaseCurrency)
      .Include(d => d.Contact)
      .Include(d => d.CreatedByUser)
      .Include(d => d.PostedByUser)
      .Include(d => d.Lines).ThenInclude(l => l.ExpenseCategory)
      .Include(d => d.Lines).ThenInclude(l => l.ExpenseAccountingAccount)
      .SingleOrDefaultAsync(d => d.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Expenses.NotFound, $"Expense with id '{id}' was not found.");

    Guid? moneyLedgerEntryId = null;
    if (expense.Status == ExpenseDocumentStatus.Posted)
    {
      moneyLedgerEntryId = await _db.MoneyLedgerEntries.AsNoTracking()
        .Where(m => m.SourceType == MoneyLedgerSourceType.Expense && m.SourceDocumentId == id)
        .Select(m => (Guid?)m.Id)
        .FirstOrDefaultAsync(ct);
    }

    return ToExpenseResponse(expense, moneyLedgerEntryId);
  }

  public async Task<ExpenseResponse> CreateDraftAsync(ExpenseDraftRequest request, Guid userId, CancellationToken ct)
  {
    var validation = await ValidateDraftRequestAsync(request, userId, ct);

    var documentNumber = await NextExpenseNumberAsync(ct);
    var now = DateTime.UtcNow;

    var expense = new ExpenseDocumentEntity
    {
      DocumentNumber = documentNumber,
      Status = ExpenseDocumentStatus.Draft,
      ExpenseDate = request.ExpenseDate,
      BranchId = request.BranchId,
      MoneyAccountId = request.MoneyAccountId,
      CurrencyId = validation.CurrencyId,
      BaseCurrencyId = validation.BaseCurrencyId,
      ExchangeRate = validation.ExchangeRate,
      ContactId = request.ContactId,
      PayeeName = Trim(request.PayeeName),
      Reference = Trim(request.Reference),
      Notes = Trim(request.Notes),
      CreatedByUserId = userId,
      CreatedAtUtc = now,
      UpdatedAtUtc = now
    };

    foreach (var lineReq in request.Lines)
    {
      var amount = Money(lineReq.Amount);
      var baseAmount = Money(amount * validation.ExchangeRate);
      expense.Lines.Add(new ExpenseLineEntity
      {
        ExpenseCategoryId = lineReq.ExpenseCategoryId,
        Description = Trim(lineReq.Description),
        Amount = amount,
        BaseAmount = baseAmount
      });
    }

    expense.TotalAmount = expense.Lines.Sum(l => l.Amount);
    expense.BaseTotalAmount = expense.Lines.Sum(l => l.BaseAmount);

    _db.ExpenseDocuments.Add(expense);
    await _db.SaveChangesAsync(ct);

    return await GetByIdAsync(expense.Id, ct);
  }

  public async Task<ExpenseResponse> UpdateDraftAsync(Guid id, ExpenseDraftRequest request, Guid userId, CancellationToken ct)
  {
    var expense = await _db.ExpenseDocuments
      .Include(d => d.Lines)
      .SingleOrDefaultAsync(d => d.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Expenses.NotFound, $"Expense with id '{id}' was not found.");

    if (expense.Status != ExpenseDocumentStatus.Draft)
    {
      throw new ConflictException(
        ErrorCodes.Expenses.DocumentNotDraft,
        "Posted expenses are immutable and cannot be updated.");
    }

    var validation = await ValidateDraftRequestAsync(request, userId, ct);

    expense.ExpenseDate = request.ExpenseDate;
    expense.BranchId = request.BranchId;
    expense.MoneyAccountId = request.MoneyAccountId;
    expense.CurrencyId = validation.CurrencyId;
    expense.BaseCurrencyId = validation.BaseCurrencyId;
    expense.ExchangeRate = validation.ExchangeRate;
    expense.ContactId = request.ContactId;
    expense.PayeeName = Trim(request.PayeeName);
    expense.Reference = Trim(request.Reference);
    expense.Notes = Trim(request.Notes);
    _db.ExpenseLines.RemoveRange(expense.Lines);

    var newLines = new List<ExpenseLineEntity>();
    foreach (var lineReq in request.Lines)
    {
      var amount = Money(lineReq.Amount);
      var baseAmount = Money(amount * validation.ExchangeRate);
      var line = new ExpenseLineEntity
      {
        ExpenseDocumentId = expense.Id,
        ExpenseCategoryId = lineReq.ExpenseCategoryId,
        Description = Trim(lineReq.Description),
        Amount = amount,
        BaseAmount = baseAmount
      };
      newLines.Add(line);
      _db.ExpenseLines.Add(line);
    }

    expense.TotalAmount = newLines.Sum(l => l.Amount);
    expense.BaseTotalAmount = newLines.Sum(l => l.BaseAmount);
    expense.UpdatedAtUtc = DateTime.UtcNow;

    await _db.SaveChangesAsync(ct);

    return await GetByIdAsync(expense.Id, ct);
  }

  public async Task DeleteDraftAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var expense = await _db.ExpenseDocuments
      .Include(d => d.Lines)
      .SingleOrDefaultAsync(d => d.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Expenses.NotFound, $"Expense with id '{id}' was not found.");

    if (expense.Status != ExpenseDocumentStatus.Draft)
    {
      throw new ConflictException(
        ErrorCodes.Expenses.DocumentNotDraft,
        "Posted expenses cannot be deleted.");
    }

    _db.ExpenseDocuments.Remove(expense);
    await _db.SaveChangesAsync(ct);
  }

  public async Task<ExpenseResponse> PostAsync(Guid id, Guid userId, CancellationToken ct)
  {
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct)
      : null;

    var expense = await _db.ExpenseDocuments
      .Include(d => d.Lines).ThenInclude(l => l.ExpenseCategory)
      .SingleOrDefaultAsync(d => d.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Expenses.NotFound, $"Expense with id '{id}' was not found.");

    if (expense.Status != ExpenseDocumentStatus.Draft)
    {
      throw new ConflictException(
        ErrorCodes.Expenses.DocumentNotDraft,
        "Only draft expenses can be posted.");
    }

    if (expense.Lines.Count == 0)
    {
      throw new BadRequestException(
        ErrorCodes.Expenses.LinesRequired,
        "Expense must have at least one line to be posted.");
    }

    var business = await _db.Businesses.AsNoTracking()
      .SingleOrDefaultAsync(b => b.IsActive && b.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Expenses.BusinessNotConfigured, "Complete Business Setup before recording expenses.");

    var branch = await _db.Branches.AsNoTracking()
      .SingleOrDefaultAsync(b => b.Id == expense.BranchId && b.IsActive, ct)
      ?? throw new BadRequestException(ErrorCodes.Expenses.BranchInvalid, "Select an active branch.");

    var moneyAccount = await _db.MoneyAccounts.AsNoTracking()
      .Include(m => m.AccountingAccount)
      .SingleOrDefaultAsync(m => m.Id == expense.MoneyAccountId, ct)
      ?? throw new BadRequestException(ErrorCodes.Expenses.MoneyAccountInvalid, "Select a valid Money Account.");

    if (!moneyAccount.IsActive)
    {
      throw new BadRequestException(ErrorCodes.Expenses.MoneyAccountInvalid, "Selected Money Account is inactive.");
    }

    if (moneyAccount.BranchId != expense.BranchId)
    {
      throw new BadRequestException(ErrorCodes.Expenses.MoneyAccountBranchMismatch, "Selected Money Account does not belong to the expense branch.");
    }

    if (moneyAccount.CurrencyId != expense.CurrencyId)
    {
      throw new BadRequestException(ErrorCodes.Expenses.MoneyAccountCurrencyMismatch, "Expense currency must match the Money Account currency.");
    }

    if (moneyAccount.AccountingAccount == null || !moneyAccount.AccountingAccount.IsActive || moneyAccount.AccountingAccount.IsGroup)
    {
      throw new BadRequestException(ErrorCodes.Expenses.MoneyAccountInvalid, "Selected Money Account does not have an active, postable GL account.");
    }

    await EnsureMoneyAccountOperateAccessAsync(moneyAccount.Id, userId, ct);

    // Rate validation
    decimal rate;
    if (expense.CurrencyId == business.BaseCurrencyId)
    {
      rate = 1m;
    }
    else
    {
      var currentRate = await ExchangeRateResolver.FindAsync(_db, expense.CurrencyId, business.BaseCurrencyId, expense.ExpenseDate, ct);
      rate = expense.ExchangeRate > 0 ? expense.ExchangeRate : (currentRate ?? 0m);
      if (rate <= 0)
      {
        throw new BadRequestException(ErrorCodes.Expenses.ExchangeRateRequired, "Exchange rate is required for foreign currency expense posting.");
      }
    }
    expense.ExchangeRate = rate;

    // Validate and snapshot categories
    var categoryIds = expense.Lines.Select(l => l.ExpenseCategoryId).Distinct().ToList();
    var categories = await _db.ExpenseCategories.AsNoTracking()
      .Include(c => c.AccountingAccount)
      .Where(c => categoryIds.Contains(c.Id))
      .ToDictionaryAsync(c => c.Id, ct);

    foreach (var line in expense.Lines)
    {
      if (line.Amount <= 0)
      {
        throw new BadRequestException(ErrorCodes.Expenses.LineAmountInvalid, "Expense line amount must be greater than zero.");
      }

      if (!categories.TryGetValue(line.ExpenseCategoryId, out var category) || !category.IsActive)
      {
        throw new BadRequestException(ErrorCodes.Expenses.CategoryInvalid, "Expense line references an inactive or missing category.");
      }

      if (category.AccountingAccount == null || !category.AccountingAccount.IsActive || category.AccountingAccount.IsGroup || category.AccountingAccount.Classification != AccountClassification.Expense)
      {
        throw new BadRequestException(ErrorCodes.Expenses.AccountNotExpense, $"Category '{category.Code}' is not mapped to an active, postable Expense GL account.");
      }

      // Snapshot the GL account onto the line
      line.ExpenseAccountingAccountId = category.AccountingAccountId;
      line.BaseAmount = Money(line.Amount * rate);
    }

    expense.TotalAmount = expense.Lines.Sum(l => l.Amount);
    expense.BaseTotalAmount = expense.Lines.Sum(l => l.BaseAmount);

    var postedAt = DateTime.UtcNow;

    // Create source-owned Accounting Journal
    var journal = new JournalEntryEntity
    {
      EntryDate = expense.ExpenseDate,
      Reference = expense.DocumentNumber,
      Description = $"Expense {expense.DocumentNumber}" + (!string.IsNullOrWhiteSpace(expense.PayeeName) ? $" - {expense.PayeeName}" : ""),
      BranchId = expense.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = postedAt
    };

    // Dr Expense Accounts
    foreach (var line in expense.Lines)
    {
      journal.Lines.Add(new JournalLineEntity
      {
        AccountId = line.ExpenseAccountingAccountId!.Value,
        CurrencyId = expense.CurrencyId,
        ExchangeRate = expense.ExchangeRate,
        OriginalDebitAmount = line.Amount,
        OriginalCreditAmount = 0m,
        DebitBaseAmount = line.BaseAmount,
        CreditBaseAmount = 0m,
        Description = !string.IsNullOrWhiteSpace(line.Description) ? line.Description : line.ExpenseCategory.Name
      });
    }

    // Cr Money Account Dedicated GL
    journal.Lines.Add(new JournalLineEntity
    {
      AccountId = moneyAccount.AccountingAccountId,
      CurrencyId = expense.CurrencyId,
      ExchangeRate = expense.ExchangeRate,
      OriginalDebitAmount = 0m,
      OriginalCreditAmount = expense.TotalAmount,
      DebitBaseAmount = 0m,
      CreditBaseAmount = expense.BaseTotalAmount,
      Description = $"Paid from {moneyAccount.Code}"
    });

    _db.JournalEntries.Add(journal);

    // Create Money Ledger Outflow
    var ledgerEntry = new MoneyLedgerEntryEntity
    {
      MoneyAccountId = moneyAccount.Id,
      MovementDate = expense.ExpenseDate,
      SourceType = MoneyLedgerSourceType.Expense,
      SourceDocumentId = expense.Id,
      DocumentNumber = expense.DocumentNumber,
      Amount = -expense.TotalAmount,
      BaseAmount = -expense.BaseTotalAmount,
      CurrencyId = expense.CurrencyId,
      BaseCurrencyId = business.BaseCurrencyId,
      ExchangeRate = expense.ExchangeRate,
      JournalEntryId = journal.Id,
      PerformedByUserId = userId,
      Notes = expense.Notes ?? expense.Reference,
      PostedAtUtc = postedAt
    };

    _db.MoneyLedgerEntries.Add(ledgerEntry);

    expense.JournalEntry = journal;
    expense.Status = ExpenseDocumentStatus.Posted;
    expense.PostedAtUtc = postedAt;
    expense.PostedByUserId = userId;
    expense.UpdatedAtUtc = postedAt;

    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);

    return await GetByIdAsync(expense.Id, ct);
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private IQueryable<ExpenseDocumentEntity> BuildFilteredQuery(ExpenseListQuery query)
  {
    var q = _db.ExpenseDocuments.AsNoTracking()
      .Include(d => d.Branch)
      .Include(d => d.MoneyAccount)
      .Include(d => d.Currency)
      .Include(d => d.Contact)
      .Include(d => d.CreatedByUser)
      .AsQueryable();

    if (!string.IsNullOrWhiteSpace(query.Search))
    {
      var search = query.Search.Trim().ToLower();
      q = q.Where(d => d.DocumentNumber.ToLower().Contains(search)
        || (d.PayeeName != null && d.PayeeName.ToLower().Contains(search))
        || (d.Reference != null && d.Reference.ToLower().Contains(search))
        || (d.Notes != null && d.Notes.ToLower().Contains(search)));
    }

    if (query.DateFrom.HasValue)
    {
      q = q.Where(d => d.ExpenseDate >= query.DateFrom.Value);
    }

    if (query.DateTo.HasValue)
    {
      q = q.Where(d => d.ExpenseDate <= query.DateTo.Value);
    }

    if (query.Status.HasValue)
    {
      q = q.Where(d => d.Status == query.Status.Value);
    }

    if (query.BranchId.HasValue)
    {
      q = q.Where(d => d.BranchId == query.BranchId.Value);
    }

    if (query.MoneyAccountId.HasValue)
    {
      q = q.Where(d => d.MoneyAccountId == query.MoneyAccountId.Value);
    }

    if (query.ContactId.HasValue)
    {
      q = q.Where(d => d.ContactId == query.ContactId.Value);
    }

    if (query.ExpenseCategoryId.HasValue)
    {
      q = q.Where(d => d.Lines.Any(l => l.ExpenseCategoryId == query.ExpenseCategoryId.Value));
    }

    return q;
  }

  private async Task<DraftValidationResult> ValidateDraftRequestAsync(
    ExpenseDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var business = await _db.Businesses.AsNoTracking()
      .SingleOrDefaultAsync(b => b.IsActive && b.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Expenses.BusinessNotConfigured, "Complete Business Setup before recording expenses.");

    var branch = await _db.Branches.AsNoTracking()
      .SingleOrDefaultAsync(b => b.Id == request.BranchId && b.IsActive, ct)
      ?? throw new BadRequestException(ErrorCodes.Expenses.BranchInvalid, "Select an active branch.");

    var moneyAccount = await _db.MoneyAccounts.AsNoTracking()
      .SingleOrDefaultAsync(m => m.Id == request.MoneyAccountId, ct)
      ?? throw new BadRequestException(ErrorCodes.Expenses.MoneyAccountInvalid, "Select a valid Money Account.");

    if (!moneyAccount.IsActive)
    {
      throw new BadRequestException(ErrorCodes.Expenses.MoneyAccountInvalid, "Selected Money Account is inactive.");
    }

    if (moneyAccount.BranchId != request.BranchId)
    {
      throw new BadRequestException(ErrorCodes.Expenses.MoneyAccountBranchMismatch, "Selected Money Account does not belong to the selected Branch.");
    }

    await EnsureMoneyAccountOperateAccessAsync(moneyAccount.Id, userId, ct);

    if (request.ContactId.HasValue)
    {
      var contact = await _db.Contacts.AsNoTracking().SingleOrDefaultAsync(c => c.Id == request.ContactId.Value, ct);
      if (contact == null || !contact.IsActive)
      {
        throw new BadRequestException(ErrorCodes.Contact.NotFound, "Selected contact is inactive or was not found.");
      }
    }

    if (request.Lines == null || request.Lines.Count == 0)
    {
      throw new BadRequestException(ErrorCodes.Expenses.LinesRequired, "At least one expense line is required.");
    }

    var categoryIds = request.Lines.Select(l => l.ExpenseCategoryId).Distinct().ToList();
    var validCategories = await _db.ExpenseCategories.AsNoTracking()
      .Where(c => categoryIds.Contains(c.Id) && c.IsActive)
      .CountAsync(ct);

    if (validCategories != categoryIds.Count)
    {
      throw new BadRequestException(ErrorCodes.Expenses.CategoryInvalid, "One or more selected expense categories are inactive or not found.");
    }

    foreach (var line in request.Lines)
    {
      if (line.Amount <= 0)
      {
        throw new BadRequestException(ErrorCodes.Expenses.LineAmountInvalid, "Expense line amount must be greater than zero.");
      }
    }

    decimal rate = 1m;
    if (moneyAccount.CurrencyId == business.BaseCurrencyId)
    {
      rate = 1m;
    }
    else
    {
      if (request.ExchangeRate.HasValue && request.ExchangeRate.Value > 0)
      {
        rate = request.ExchangeRate.Value;
      }
      else
      {
        var resolved = await ExchangeRateResolver.FindAsync(_db, moneyAccount.CurrencyId, business.BaseCurrencyId, request.ExpenseDate, ct);
        if (resolved.HasValue && resolved.Value > 0)
        {
          rate = resolved.Value;
        }
        else
        {
          throw new BadRequestException(
            ErrorCodes.Expenses.ExchangeRateRequired,
            "An exchange rate is required for foreign currency expenses.");
        }
      }
    }

    return new DraftValidationResult(moneyAccount.CurrencyId, business.BaseCurrencyId, rate);
  }

  private async Task<AccountEntity> ValidateExpenseAccountAsync(Guid accountingAccountId, CancellationToken ct)
  {
    var account = await _db.Accounts.AsNoTracking()
      .SingleOrDefaultAsync(a => a.Id == accountingAccountId, ct)
      ?? throw new NotFoundException(ErrorCodes.Expenses.AccountNotFound, $"Accounting account with id '{accountingAccountId}' was not found.");

    if (!account.IsActive || account.IsGroup || account.Classification != AccountClassification.Expense)
    {
      throw new BadRequestException(
        ErrorCodes.Expenses.AccountNotExpense,
        "Expense categories must map to an active, postable Expense GL account.");
    }

    return account;
  }

  private async Task EnsureMoneyAccountOperateAccessAsync(Guid moneyAccountId, Guid userId, CancellationToken ct)
  {
    var isSuper = await _db.Users.AsNoTracking().AnyAsync(u => u.Id == userId && (u.Role == UserRole.SuperAdmin || u.Role == UserRole.Owner), ct);
    if (isSuper) return;

    var hasAccess = await _db.MoneyAccountAccess.AsNoTracking().AnyAsync(access =>
      access.MoneyAccountId == moneyAccountId && access.UserId == userId && access.AccessLevel == MoneyAccountAccessLevel.Operate, ct);

    if (!hasAccess)
    {
      throw new ForbiddenException(
        ErrorCodes.Expenses.MoneyAccountAccessDenied,
        "You do not have Operate access to this Money Account.");
    }
  }

  private async Task<string> NextExpenseNumberAsync(CancellationToken ct)
  {
    var last = await _db.ExpenseDocuments.IgnoreQueryFilters().Select(d => d.DocumentNumber)
      .OrderByDescending(n => n)
      .FirstOrDefaultAsync(ct);

    var next = last != null && last.StartsWith("EXP-") && int.TryParse(last[4..], out var value) ? value + 1 : 1;
    return $"EXP-{next:000000}";
  }

  private static ExpenseCategoryResponse ToCategoryResponse(ExpenseCategoryEntity c) => new(
    c.Id,
    c.Code,
    c.Name,
    c.AccountingAccountId,
    c.AccountingAccount.Code,
    c.AccountingAccount.Name,
    c.IsActive,
    c.Description,
    c.CreatedAtUtc,
    c.UpdatedAtUtc);

  private static ExpenseResponse ToExpenseResponse(ExpenseDocumentEntity d, Guid? moneyLedgerEntryId) => new(
    d.Id,
    d.DocumentNumber,
    d.Status,
    d.ExpenseDate,
    d.BranchId,
    d.Branch.Name,
    d.MoneyAccountId,
    d.MoneyAccount.Code,
    d.MoneyAccount.Name,
    d.CurrencyId,
    d.Currency.Code,
    d.BaseCurrencyId,
    d.BaseCurrency.Code,
    d.ExchangeRate,
    d.ContactId,
    d.Contact?.Name,
    d.PayeeName,
    d.Reference,
    d.Notes,
    d.TotalAmount,
    d.BaseTotalAmount,
    d.CreatedByUserId,
    d.CreatedByUser.Username,
    d.CreatedAtUtc,
    d.UpdatedAtUtc,
    d.PostedAtUtc,
    d.PostedByUserId,
    d.PostedByUser?.Username,
    d.JournalEntryId,
    moneyLedgerEntryId,
    d.Lines.Select(l => new ExpenseLineResponse(
      l.Id,
      l.ExpenseCategoryId,
      l.ExpenseCategory.Code,
      l.ExpenseCategory.Name,
      l.Description,
      l.Amount,
      l.BaseAmount,
      l.ExpenseAccountingAccountId,
      l.ExpenseAccountingAccount?.Code,
      l.ExpenseAccountingAccount?.Name)).ToList());

  private static decimal Money(decimal value) => Math.Round(value, 4, MidpointRounding.AwayFromZero);
  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private sealed record DraftValidationResult(Guid CurrencyId, Guid BaseCurrencyId, decimal ExchangeRate);
}
