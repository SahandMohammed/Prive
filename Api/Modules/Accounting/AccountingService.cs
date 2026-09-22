using Api.Infrastructure.Http;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Currency;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Accounting;

public sealed class AccountingService
{
  private readonly AppDbContext _db;

  public AccountingService(AppDbContext db) => _db = db;

  public async Task<PagedResult<AccountResponse>> GetAccountsAsync(AccountListQuery request, CancellationToken ct)
  {
    var query = FilterAccounts(_db.Accounts.AsNoTracking(), request.Search, request.Classification, request.IsActive);
    return await query
      .OrderBy(account => account.Code).ThenBy(account => account.Id)
      .Select(account => ToAccountResponse(account))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<List<AccountResponse>> GetAccountTreeAsync(AccountTreeQuery request, CancellationToken ct)
  {
    var query = FilterAccounts(_db.Accounts.AsNoTracking(), request.Search, request.Classification, request.IsActive);
    if (request.PostingAccountsOnly)
      query = query.Where(account => !account.IsGroup && account.IsActive);

    return await query.OrderBy(account => account.Code).ThenBy(account => account.Id)
      .Select(account => ToAccountResponse(account)).ToListAsync(ct);
  }

  public async Task<AccountResponse> GetAccountAsync(Guid id, CancellationToken ct)
  {
    var account = await _db.Accounts.AsNoTracking().SingleOrDefaultAsync(account => account.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.AccountNotFound, $"Account with id '{id}' was not found.");
    return ToAccountResponse(account);
  }

  public async Task<AccountResponse> CreateAccountAsync(CreateAccountRequest request, CancellationToken ct)
  {
    EnsureClassification(request.Classification);
    var code = NormalizeCode(request.Code);
    if (await _db.Accounts.AnyAsync(account => account.Code == code, ct))
      throw new ConflictException(ErrorCodes.Accounting.AccountCodeTaken, $"Account code '{code}' is already in use.");

    await ValidateParentAsync(request.ParentAccountId, null, ct);
    var account = new AccountEntity();
    Apply(account, request, code);
    _db.Accounts.Add(account);
    await _db.SaveChangesAsync(ct);
    return ToAccountResponse(account);
  }

  public async Task<AccountResponse> UpdateAccountAsync(Guid id, UpdateAccountRequest request, CancellationToken ct)
  {
    EnsureClassification(request.Classification);
    var account = await _db.Accounts.SingleOrDefaultAsync(account => account.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.AccountNotFound, $"Account with id '{id}' was not found.");
    var code = NormalizeCode(request.Code);
    if (code != account.Code && await _db.Accounts.AnyAsync(other => other.Code == code && other.Id != id, ct))
      throw new ConflictException(ErrorCodes.Accounting.AccountCodeTaken, $"Account code '{code}' is already in use.");

    var isMoneyAccountGl = await _db.MoneyAccounts.IgnoreQueryFilters().AnyAsync(ma => ma.AccountingAccountId == id, ct);
    if (isMoneyAccountGl)
    {
      if (code != account.Code)
        throw new BadRequestException(
          ErrorCodes.Accounting.FinanceOwnedAccountProtected,
          "The account code of a Finance-managed Money Account GL cannot be edited directly.");
      if (request.Classification != AccountClassification.Asset)
        throw new BadRequestException(
          ErrorCodes.Accounting.FinanceOwnedAccountProtected,
          "A Finance-managed Money Account GL must remain an Asset account.");
      if (request.IsGroup)
        throw new BadRequestException(
          ErrorCodes.Accounting.FinanceOwnedAccountProtected,
          "A Finance-managed Money Account GL cannot be converted to a group account.");
      if (request.ParentAccountId != account.ParentAccountId)
        throw new BadRequestException(
          ErrorCodes.Accounting.FinanceOwnedAccountProtected,
          "The parent account of a Finance-managed Money Account GL cannot be changed directly.");
      if (!request.IsActive && await _db.MoneyAccounts.IgnoreQueryFilters().AnyAsync(ma => ma.AccountingAccountId == id && ma.IsActive, ct))
        throw new BadRequestException(
          ErrorCodes.Accounting.FinanceOwnedAccountProtected,
          "A Finance-managed Money Account GL cannot be deactivated while its Money Account is active.");
    }

    var hasPostedHistory = await _db.JournalLines.IgnoreQueryFilters()
      .AnyAsync(line => line.AccountId == id && line.JournalEntry.PostedAtUtc != null, ct);
    if (hasPostedHistory && (account.Classification != request.Classification
      || account.ParentAccountId != request.ParentAccountId || account.IsGroup != request.IsGroup))
      throw new BadRequestException(
        ErrorCodes.Accounting.UsedAccountStructuralChangeNotAllowed,
        "An account with posted transactions may only change its code, name, or active status.");

    await ValidateParentAsync(request.ParentAccountId, id, ct);
    Apply(account, request, code);
    await _db.SaveChangesAsync(ct);
    return ToAccountResponse(account);
  }

  public async Task DeleteAccountAsync(Guid id, CancellationToken ct)
  {
    var account = await _db.Accounts.SingleOrDefaultAsync(account => account.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.AccountNotFound, $"Account with id '{id}' was not found.");
    if (await _db.MoneyAccounts.IgnoreQueryFilters().AnyAsync(ma => ma.AccountingAccountId == id, ct))
      throw new BadRequestException(ErrorCodes.Accounting.AccountOwnedByMoneyAccount, "An account linked to a Money Account cannot be deleted directly from Accounting. Manage it from Finance.");
    if (await _db.Accounts.AnyAsync(child => child.ParentAccountId == id, ct))
      throw new BadRequestException(ErrorCodes.Accounting.AccountHasChildren, "An account with child accounts cannot be deleted.");
    if (await _db.JournalLines.IgnoreQueryFilters().AnyAsync(line => line.AccountId == id, ct))
      throw new BadRequestException(ErrorCodes.Accounting.AccountHasHistory, "An account with accounting history cannot be deleted. Deactivate it instead.");

    _db.Accounts.Remove(account);
    await _db.SaveChangesAsync(ct);
  }

  public async Task<PagedResult<JournalEntryResponse>> GetJournalsAsync(JournalListQuery request, CancellationToken ct)
  {
    var query = _db.JournalEntries.AsNoTracking().AsQueryable();
    if (request.FromDate is not null) query = query.Where(journal => journal.EntryDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(journal => journal.EntryDate <= request.ToDate);
    if (request.BranchId is not null) query = query.Where(journal => journal.BranchId == request.BranchId);
    if (request.Status is not null) query = query.Where(journal => journal.Status == request.Status);
    if (request.Type is not null) query = query.Where(journal => journal.Type == request.Type);
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(journal => journal.Description.ToLower().Contains(search)
        || (journal.Reference != null && journal.Reference.ToLower().Contains(search)));
    }

    var normalized = request.Normalize();
    var totalCount = await query.CountAsync(ct);
    var items = await query
      .Include(journal => journal.Branch)
      .Include(journal => journal.SourcePurchaseInvoice)
      .Include(journal => journal.SourceSalesInvoice)
      .ThenInclude(invoice => invoice!.PosSale)
      .Include(journal => journal.SourceMoneyTransfer)
      .Include(journal => journal.SourceSupplierPayment)
      .Include(journal => journal.SourceCustomerReceipt)
      .Include(journal => journal.SourceExpenseDocument)
      .Include(journal => journal.SourcePosRefund)
      .Include(journal => journal.SourcePosDrawerMovement)
      .Include(journal => journal.Lines).ThenInclude(line => line.Account)
      .Include(journal => journal.Lines).ThenInclude(line => line.Currency)
      .OrderByDescending(journal => journal.EntryDate).ThenByDescending(journal => journal.Id)
      .Skip((normalized.Page - 1) * normalized.PageSize).Take(normalized.PageSize)
      .ToListAsync(ct);
    return new PagedResult<JournalEntryResponse>(items.Select(ToJournalResponse).ToList(), totalCount, normalized.Page, normalized.PageSize);
  }

  public async Task<JournalEntryResponse> GetJournalAsync(Guid id, CancellationToken ct)
  {
    var journal = await _db.JournalEntries.AsNoTracking()
      .Include(entry => entry.Branch)
      .Include(entry => entry.SourcePurchaseInvoice)
      .Include(entry => entry.SourceSalesInvoice)
      .ThenInclude(invoice => invoice!.PosSale)
      .Include(entry => entry.SourceMoneyTransfer)
      .Include(entry => entry.SourceSupplierPayment)
      .Include(entry => entry.SourceCustomerReceipt)
      .Include(entry => entry.SourceExpenseDocument)
      .Include(entry => entry.SourcePosRefund)
      .Include(entry => entry.SourcePosDrawerMovement)
      .Include(entry => entry.Lines).ThenInclude(line => line.Account)
      .Include(entry => entry.Lines).ThenInclude(line => line.Currency)
      .SingleOrDefaultAsync(entry => entry.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.JournalNotFound, $"Journal with id '{id}' was not found.");
    return ToJournalResponse(journal);
  }

  public async Task<JournalEntryResponse> CreateJournalAsync(CreateJournalEntryRequest request, CancellationToken ct)
  {
    var journal = new JournalEntryEntity { Status = JournalEntryStatus.Draft };
    await ApplyJournalAsync(journal, request.EntryDate, request.Reference, request.Description, request.BranchId, request.Type, request.Lines, ct);
    _db.JournalEntries.Add(journal);
    await _db.SaveChangesAsync(ct);
    return await GetJournalAsync(journal.Id, ct);
  }

  public async Task<JournalEntryResponse> UpdateJournalAsync(Guid id, UpdateJournalEntryRequest request, CancellationToken ct)
  {
    var journal = await _db.JournalEntries.Include(entry => entry.Lines)
      .SingleOrDefaultAsync(entry => entry.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.JournalNotFound, $"Journal with id '{id}' was not found.");
    EnsureDraft(journal);
    await ApplyJournalAsync(journal, request.EntryDate, request.Reference, request.Description, request.BranchId, request.Type, request.Lines, ct);
    await _db.SaveChangesAsync(ct);
    return await GetJournalAsync(journal.Id, ct);
  }

  public async Task DeleteJournalAsync(Guid id, CancellationToken ct)
  {
    var journal = await _db.JournalEntries.SingleOrDefaultAsync(entry => entry.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.JournalNotFound, $"Journal with id '{id}' was not found.");
    EnsureDraft(journal);
    _db.JournalEntries.Remove(journal);
    await _db.SaveChangesAsync(ct);
  }

  public async Task<JournalEntryResponse> PostJournalAsync(Guid id, CancellationToken ct)
  {
    var journal = await _db.JournalEntries.Include(entry => entry.Branch)
      .Include(entry => entry.Lines).ThenInclude(line => line.Account)
      .Include(entry => entry.Lines).ThenInclude(line => line.Currency)
      .SingleOrDefaultAsync(entry => entry.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.JournalNotFound, $"Journal with id '{id}' was not found.");
    EnsureDraft(journal);
    await ValidatePostableAsync(journal, ct);
    journal.Status = JournalEntryStatus.Posted;
    journal.PostedAtUtc = DateTime.UtcNow;
    await _db.SaveChangesAsync(ct);
    return ToJournalResponse(journal);
  }

  public async Task<JournalEntryResponse> ReverseJournalAsync(Guid id, CancellationToken ct)
  {
    var original = await _db.JournalEntries.Include(entry => entry.Lines)
      .SingleOrDefaultAsync(entry => entry.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.JournalNotFound, $"Journal with id '{id}' was not found.");

    // Source modules own their generated journals. Corrections must flow through
    // the source document so its operational and accounting effects stay aligned.
    if (await _db.PurchaseInvoices.AsNoTracking()
      .AnyAsync(invoice => invoice.JournalEntryId == id, ct))
    {
      throw new BadRequestException(
        ErrorCodes.Purchase.JournalDirectReversalNotAllowed,
        "This journal was generated by a Purchase Invoice and cannot be reversed directly.");
    }

    if (await _db.PosSales.AsNoTracking().AnyAsync(sale => sale.SalesInvoice.JournalEntryId == id, ct))
    {
      throw new BadRequestException(
        ErrorCodes.Pos.JournalDirectReversalNotAllowed,
        "This journal was generated by a POS Sale and cannot be reversed directly.");
    }

    if (await _db.PosRefunds.AsNoTracking().AnyAsync(refund => refund.JournalEntryId == id, ct))
    {
      throw new BadRequestException(
        ErrorCodes.Pos.JournalDirectReversalNotAllowed,
        "This journal was generated by a POS Refund and cannot be reversed directly.");
    }

    if (await _db.SalesInvoices.AsNoTracking().AnyAsync(invoice => invoice.JournalEntryId == id, ct))
    {
      throw new BadRequestException(
        ErrorCodes.Sales.JournalDirectReversalNotAllowed,
        "This journal was generated by a Sales Invoice and cannot be reversed directly.");
    }

    if (await _db.MoneyLedgerEntries.AsNoTracking().AnyAsync(entry => entry.JournalEntryId == id, ct))
    {
      throw new BadRequestException(
        ErrorCodes.Finance.JournalDirectReversalNotAllowed,
        "This journal was generated by Finance and cannot be reversed directly.");
    }

    if (await _db.ExpenseDocuments.AsNoTracking().AnyAsync(expense => expense.JournalEntryId == id, ct))
    {
      throw new BadRequestException(
        ErrorCodes.Expenses.JournalDirectReversalNotAllowed,
        "This journal was generated by an Expense and cannot be reversed directly.");
    }

    if (original.PostedAtUtc is null || original.Status != JournalEntryStatus.Posted)
      throw new BadRequestException(ErrorCodes.Accounting.JournalNotPosted, "Only posted journals can be reversed.");
    if (await _db.JournalEntries.AnyAsync(entry => entry.ReversalOfJournalId == id, ct))
      throw new ConflictException(ErrorCodes.Accounting.JournalAlreadyReversed, "This journal has already been reversed.");

    var reversal = new JournalEntryEntity
    {
      EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
      Reference = string.IsNullOrWhiteSpace(original.Reference) ? null : $"REV-{original.Reference}",
      Description = $"Reversal: {original.Description}",
      BranchId = original.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Reversal,
      PostedAtUtc = DateTime.UtcNow,
      ReversalOfJournalId = original.Id,
      Lines = original.Lines.Select(line => new JournalLineEntity
      {
        AccountId = line.AccountId,
        Description = line.Description,
        CurrencyId = line.CurrencyId,
        ExchangeRate = line.ExchangeRate,
        OriginalDebitAmount = line.OriginalCreditAmount,
        OriginalCreditAmount = line.OriginalDebitAmount,
        DebitBaseAmount = line.CreditBaseAmount,
        CreditBaseAmount = line.DebitBaseAmount
      }).ToList()
    };
    original.Status = JournalEntryStatus.Reversed;
    _db.JournalEntries.Add(reversal);
    await _db.SaveChangesAsync(ct);
    return await GetJournalAsync(reversal.Id, ct);
  }

  public async Task<GeneralLedgerResponse> GetGeneralLedgerAsync(GeneralLedgerQuery request, CancellationToken ct)
  {
    var account = await _db.Accounts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == request.AccountId, ct)
      ?? throw new NotFoundException(ErrorCodes.Accounting.AccountNotFound, $"Account with id '{request.AccountId}' was not found.");
    var query = PostedLines().Where(line => line.AccountId == request.AccountId);
    if (request.BranchId is not null) query = query.Where(line => line.JournalEntry.BranchId == request.BranchId);
    if (request.CurrencyId is not null) query = query.Where(line => line.CurrencyId == request.CurrencyId);

    var openingQuery = query;
    if (request.FromDate is not null) openingQuery = openingQuery.Where(line => line.JournalEntry.EntryDate < request.FromDate);
    else openingQuery = openingQuery.Where(_ => false);
    var opening = await openingQuery.SumAsync(line => line.DebitBaseAmount - line.CreditBaseAmount, ct);

    if (request.FromDate is not null) query = query.Where(line => line.JournalEntry.EntryDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(line => line.JournalEntry.EntryDate <= request.ToDate);
    var rows = await query.OrderBy(line => line.JournalEntry.EntryDate).ThenBy(line => line.JournalEntryId).ThenBy(line => line.Id)
      .Select(line => new
      {
        line.JournalEntryId,
        line.JournalEntry.EntryDate,
        line.JournalEntry.Reference,
        JournalDescription = line.JournalEntry.Description,
        LineDescription = line.Description,
        line.JournalEntry.BranchId,
        BranchCode = line.JournalEntry.Branch.Code,
        BranchName = line.JournalEntry.Branch.Name,
        CurrencyCode = line.Currency.Code,
        line.DebitBaseAmount,
        line.CreditBaseAmount
      }).ToListAsync(ct);
    var runningBalance = opening;
    var lines = rows.Select(row =>
    {
      runningBalance += row.DebitBaseAmount - row.CreditBaseAmount;
      return new GeneralLedgerLineResponse(row.JournalEntryId, row.EntryDate, row.Reference, row.JournalDescription,
        row.LineDescription, row.BranchId, row.BranchCode, row.BranchName, row.CurrencyCode,
        row.DebitBaseAmount, row.CreditBaseAmount, runningBalance);
    }).ToList();
    return new GeneralLedgerResponse(account.Id, account.Code, account.Name, opening, lines);
  }

  public async Task<TrialBalanceResponse> GetTrialBalanceAsync(TrialBalanceQuery request, CancellationToken ct)
  {
    var accounts = _db.Accounts.AsNoTracking().AsQueryable();
    if (request.IsActive is not null) accounts = accounts.Where(account => account.IsActive == request.IsActive);
    var accountRows = await accounts.OrderBy(account => account.Code)
      .Select(account => new { account.Id, account.Code, account.Name, account.Classification }).ToListAsync(ct);

    var lines = PostedLines();
    if (request.BranchId is not null) lines = lines.Where(line => line.JournalEntry.BranchId == request.BranchId);
    if (request.ToDate is not null) lines = lines.Where(line => line.JournalEntry.EntryDate <= request.ToDate);
    var movements = await lines.Select(line => new
      { line.AccountId, line.JournalEntry.EntryDate, line.DebitBaseAmount, line.CreditBaseAmount }).ToListAsync(ct);

    var trialLines = accountRows.Select(account =>
    {
      var opening = request.FromDate is null ? 0m : movements.Where(line => line.AccountId == account.Id && line.EntryDate < request.FromDate)
        .Sum(line => line.DebitBaseAmount - line.CreditBaseAmount);
      var period = movements.Where(line => line.AccountId == account.Id && (request.FromDate is null || line.EntryDate >= request.FromDate));
      var debitMovement = period.Sum(line => line.DebitBaseAmount);
      var creditMovement = period.Sum(line => line.CreditBaseAmount);
      var closing = opening + debitMovement - creditMovement;
      return new TrialBalanceLineResponse(account.Id, account.Code, account.Name, account.Classification,
        Math.Max(opening, 0), Math.Max(-opening, 0), debitMovement, creditMovement,
        Math.Max(closing, 0), Math.Max(-closing, 0));
    }).Where(line => line.OpeningDebit != 0 || line.OpeningCredit != 0 || line.DebitMovement != 0 || line.CreditMovement != 0).ToList();

    return new TrialBalanceResponse(request.FromDate, request.ToDate, trialLines,
      trialLines.Sum(line => line.OpeningDebit), trialLines.Sum(line => line.OpeningCredit),
      trialLines.Sum(line => line.DebitMovement), trialLines.Sum(line => line.CreditMovement),
      trialLines.Sum(line => line.ClosingDebit), trialLines.Sum(line => line.ClosingCredit));
  }

  private async Task ApplyJournalAsync(JournalEntryEntity journal, DateOnly entryDate, string? reference, string description,
    Guid branchId, JournalEntryType type, List<JournalLineRequest> requests, CancellationToken ct)
  {
    if (type is not JournalEntryType.Standard and not JournalEntryType.Opening)
      throw new BadRequestException(ErrorCodes.Accounting.JournalTypeInvalid, "Only standard and opening journals can be created directly.");
    var branch = await _db.Branches.SingleOrDefaultAsync(item => item.Id == branchId && item.IsActive, ct)
      ?? throw new BadRequestException(ErrorCodes.Accounting.BranchInvalid, "Select an active branch for the journal.");
    _ = branch;
    var baseCurrencyId = await _db.Businesses.Where(business => business.IsActive)
      .Select(business => (Guid?)business.BaseCurrencyId).SingleOrDefaultAsync(ct)
      ?? throw new BadRequestException(ErrorCodes.Business.NotConfigured, "Configure the business base currency before creating journals.");
    var accounts = await _db.Accounts.Where(account => requests.Select(line => line.AccountId).Contains(account.Id))
      .ToDictionaryAsync(account => account.Id, ct);
    var currencies = await _db.Currencies.Where(currency => requests.Select(line => line.CurrencyId).Contains(currency.Id))
      .ToDictionaryAsync(currency => currency.Id, ct);
    var lines = requests.Select(request => CreateLine(request, accounts, currencies, baseCurrencyId)).ToList();
    ValidateLines(lines);

    journal.EntryDate = entryDate;
    journal.Reference = TrimOrNull(reference);
    journal.Description = description.Trim();
    journal.BranchId = branchId;
    journal.Type = type;
    _db.JournalLines.RemoveRange(journal.Lines);
    journal.Lines.Clear();
    foreach (var line in lines) journal.Lines.Add(line);
  }

  private static JournalLineEntity CreateLine(JournalLineRequest request, IReadOnlyDictionary<Guid, AccountEntity> accounts,
    IReadOnlyDictionary<Guid, CurrencyEntity> currencies, Guid baseCurrencyId)
  {
    if (!accounts.TryGetValue(request.AccountId, out var account))
      throw new BadRequestException(ErrorCodes.Accounting.AccountInvalid, "Every journal line must reference an existing account.");
    if (!account.IsActive || account.IsGroup)
      throw new BadRequestException(ErrorCodes.Accounting.AccountNotPostable, "Journal lines require active posting accounts.");
    if (!currencies.TryGetValue(request.CurrencyId, out var currency) || !currency.IsActive)
      throw new BadRequestException(ErrorCodes.Accounting.CurrencyInvalid, "Every journal line must reference an active currency.");
    var rate = request.CurrencyId == baseCurrencyId ? 1m : request.ExchangeRate;
    if (rate <= 0) throw new BadRequestException(ErrorCodes.Accounting.ExchangeRateRequired, "A positive exchange rate is required for foreign-currency lines.");
    return new JournalLineEntity
    {
      AccountId = request.AccountId,
      Description = TrimOrNull(request.Description),
      CurrencyId = request.CurrencyId,
      ExchangeRate = rate,
      OriginalDebitAmount = request.OriginalDebitAmount,
      OriginalCreditAmount = request.OriginalCreditAmount,
      DebitBaseAmount = Math.Round(request.OriginalDebitAmount * rate, 4, MidpointRounding.AwayFromZero),
      CreditBaseAmount = Math.Round(request.OriginalCreditAmount * rate, 4, MidpointRounding.AwayFromZero)
    };
  }

  private static void ValidateLines(List<JournalLineEntity> lines)
  {
    if (lines.Count < 2) throw new BadRequestException(ErrorCodes.Accounting.JournalNeedsTwoLines, "A journal must contain at least two lines.");
    foreach (var line in lines)
    {
      if ((line.OriginalDebitAmount <= 0 && line.OriginalCreditAmount <= 0)
        || (line.OriginalDebitAmount > 0 && line.OriginalCreditAmount > 0))
        throw new BadRequestException(ErrorCodes.Accounting.InvalidJournalLine, "Each journal line must contain either a debit or a credit greater than zero.");
    }
  }

  private async Task ValidatePostableAsync(JournalEntryEntity journal, CancellationToken ct)
  {
    if (!journal.Branch.IsActive)
      throw new BadRequestException(ErrorCodes.Accounting.BranchInvalid, "The selected branch is inactive.");
    ValidateLines(journal.Lines.ToList());
    if (journal.Lines.Any(line => !line.Account.IsActive || line.Account.IsGroup))
      throw new BadRequestException(ErrorCodes.Accounting.AccountNotPostable, "All journal lines must use active posting accounts.");
    if (journal.Lines.Any(line => !line.Currency.IsActive))
      throw new BadRequestException(ErrorCodes.Accounting.CurrencyInvalid, "All journal lines must use active currencies.");
    var debit = journal.Lines.Sum(line => line.DebitBaseAmount);
    var credit = journal.Lines.Sum(line => line.CreditBaseAmount);
    if (debit != credit)
      throw new BadRequestException(ErrorCodes.Accounting.JournalUnbalanced, "Total debit and credit in the base currency must be equal before posting.");
    await Task.CompletedTask;
  }

  private async Task ValidateParentAsync(Guid? parentId, Guid? accountId, CancellationToken ct)
  {
    if (parentId is null) return;
    if (parentId == accountId)
      throw new BadRequestException(ErrorCodes.Accounting.AccountParentCycle, "An account cannot be its own parent.");
    var parent = await _db.Accounts.SingleOrDefaultAsync(account => account.Id == parentId, ct)
      ?? throw new BadRequestException(ErrorCodes.Accounting.AccountParentInvalid, "The selected parent account does not exist.");
    if (!parent.IsGroup)
      throw new BadRequestException(ErrorCodes.Accounting.AccountParentInvalid, "Child accounts require a group account as their parent.");
    var current = parent;
    while (current.ParentAccountId is not null)
    {
      if (current.ParentAccountId == accountId)
        throw new BadRequestException(ErrorCodes.Accounting.AccountParentCycle, "Account parent relationships cannot be circular.");
      current = await _db.Accounts.SingleAsync(account => account.Id == current.ParentAccountId, ct);
    }
  }

  private static IQueryable<AccountEntity> FilterAccounts(IQueryable<AccountEntity> query, string? search,
    AccountClassification? classification, bool? isActive)
  {
    if (!string.IsNullOrWhiteSpace(search))
    {
      var value = search.Trim().ToLower();
      query = query.Where(account => account.Code.ToLower().Contains(value) || account.Name.ToLower().Contains(value));
    }
    if (classification is not null) query = query.Where(account => account.Classification == classification);
    if (isActive is not null) query = query.Where(account => account.IsActive == isActive);
    return query;
  }

  private IQueryable<JournalLineEntity> PostedLines() => _db.JournalLines.AsNoTracking()
    .Where(line => line.JournalEntry.PostedAtUtc != null);

  private static void EnsureDraft(JournalEntryEntity journal)
  {
    if (journal.Status != JournalEntryStatus.Draft)
      throw new BadRequestException(ErrorCodes.Accounting.JournalLocked, "Only draft journals can be edited or deleted.");
  }

  private static void EnsureClassification(AccountClassification classification)
  {
    if (!Enum.IsDefined(classification))
      throw new BadRequestException(ErrorCodes.Accounting.AccountClassificationInvalid, "Select a valid accounting classification.");
  }

  private static void Apply(AccountEntity account, CreateAccountRequest request, string code)
  {
    account.Code = code;
    account.Name = request.Name.Trim();
    account.Classification = request.Classification;
    account.ParentAccountId = request.ParentAccountId;
    account.IsGroup = request.IsGroup;
    account.IsActive = request.IsActive;
  }

  private static void Apply(AccountEntity account, UpdateAccountRequest request, string code) => Apply(account,
    new CreateAccountRequest(request.Code, request.Name, request.Classification, request.ParentAccountId, request.IsGroup, request.IsActive), code);

  private static AccountResponse ToAccountResponse(AccountEntity account) => new(
    account.Id, account.Code, account.Name, account.Classification, account.ParentAccountId, account.IsGroup, account.IsActive);

  private static JournalEntryResponse ToJournalResponse(JournalEntryEntity journal) => new(
    journal.Id, journal.EntryDate, journal.Reference, journal.Description, journal.BranchId, journal.Branch.Code, journal.Branch.Name,
    journal.Status, journal.Type, journal.PostedAtUtc, journal.ReversalOfJournalId, journal.SourcePurchaseInvoice?.Id,
    journal.SourceSalesInvoice?.Id, journal.SourceMoneyTransfer?.Id, journal.SourceSupplierPayment?.Id,
    journal.SourceCustomerReceipt?.Id, journal.SourceSalesInvoice?.PosSale?.Id,
    journal.SourceExpenseDocument?.Id, journal.SourcePosRefund?.Id, journal.SourcePosDrawerMovement?.Id,
    journal.Lines.Sum(line => line.DebitBaseAmount), journal.Lines.Sum(line => line.CreditBaseAmount),
    journal.Lines.OrderBy(line => line.Id).Select(ToJournalLineResponse).ToList());

  private static JournalLineResponse ToJournalLineResponse(JournalLineEntity line) => new(line.Id, line.AccountId, line.Account.Code,
    line.Account.Name, line.Description, line.CurrencyId, line.Currency.Code, line.ExchangeRate, line.OriginalDebitAmount,
    line.OriginalCreditAmount, line.DebitBaseAmount, line.CreditBaseAmount);

  private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();
  private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
