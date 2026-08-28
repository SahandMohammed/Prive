using System.Data;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Business;
using Api.Modules.Purchase;
using Api.Modules.Sales;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Modules.Finance;

public sealed class FinanceService
{
  private readonly AppDbContext _db;
  private readonly FinanceOptions _options;

  public FinanceService(AppDbContext db, IOptions<FinanceOptions> options)
  {
    _db = db;
    _options = options.Value;
  }

  public async Task<PagedResult<MoneyAccountResponse>> GetMoneyAccountsAsync(
    MoneyAccountListQuery request,
    Guid userId,
    bool management,
    CancellationToken ct)
  {
    var query = _db.MoneyAccounts.AsNoTracking().AsQueryable();
    if (!management) query = query.Where(account => account.AccessAssignments.Any(access => access.UserId == userId));
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(account => account.Code.ToLower().Contains(search) || account.Name.ToLower().Contains(search));
    }
    if (request.Type is not null) query = query.Where(account => account.Type == request.Type);
    if (request.BranchId is not null) query = query.Where(account => account.BranchId == request.BranchId);
    if (request.CurrencyId is not null) query = query.Where(account => account.CurrencyId == request.CurrencyId);
    if (request.IsActive is not null) query = query.Where(account => account.IsActive == request.IsActive);

    return await query.OrderBy(account => account.Code).ThenBy(account => account.Id)
      .Select(account => new MoneyAccountResponse(
        account.Id, account.Code, account.Name, account.Type,
        account.BranchId, account.Branch.Code, account.Branch.Name,
        account.CurrencyId, account.Currency.Code,
        account.AccountingAccountId, account.AccountingAccount.Code, account.AccountingAccount.Name,
        account.LedgerEntries.Sum(entry => (decimal?)entry.Amount) ?? 0,
        account.IsActive, account.Notes, account.BankName, account.AccountNumberOrIban,
        account.AccessAssignments.Where(access => access.UserId == userId)
          .Select(access => (MoneyAccountAccessLevel?)access.AccessLevel).FirstOrDefault(),
        account.CreatedAtUtc, account.UpdatedAtUtc))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<MoneyAccountResponse> GetMoneyAccountAsync(Guid id, Guid userId, CancellationToken ct)
  {
    await EnsureAccessAsync(id, userId, MoneyAccountAccessLevel.View, ct);
    return await MoneyAccountResponseQuery(userId, id).SingleOrDefaultAsync(ct)
      ?? throw MoneyAccountNotFound();
  }

  public async Task<MoneyAccountResponse> CreateMoneyAccountAsync(MoneyAccountRequest request, Guid userId, CancellationToken ct)
  {
    ValidateMoneyAccountType(request.Type);
    var code = NormalizeCode(request.Code);
    if (await _db.MoneyAccounts.AnyAsync(account => account.Code == code, ct))
      throw new ConflictException(ErrorCodes.Finance.MoneyAccountCodeTaken, $"Money Account code '{code}' is already in use.");

    if (!await _db.Branches.AnyAsync(branch => branch.Id == request.BranchId && branch.IsActive, ct))
      throw new BadRequestException(ErrorCodes.Finance.BranchInvalid, "Select an active branch.");
    var currency = await _db.Currencies.SingleOrDefaultAsync(c => c.Id == request.CurrencyId && c.IsActive, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.CurrencyInvalid, "Select an active currency.");

    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct)
      : null;

    var parentAccount = await ResolveUasParentAsync(request.Type, request.BranchId, request.CurrencyId, ct);

    if (_db.Database.IsRelational())
    {
      await _db.Database.ExecuteSqlRawAsync(
        "SELECT \"Id\" FROM accounts WHERE \"Id\" = {0} FOR UPDATE",
        parentAccount.Id);
    }

    var glCode = await GenerateNextGlCodeAsync(parentAccount, ct);
    var glName = $"{request.Name.Trim()} {currency.Code}";

    var glAccount = new AccountEntity
    {
      Code = glCode,
      Name = glName,
      Classification = AccountClassification.Asset,
      ParentAccountId = parentAccount.Id,
      IsGroup = false,
      IsActive = true
    };
    _db.Accounts.Add(glAccount);

    var account = new MoneyAccountEntity
    {
      Code = code,
      Name = request.Name.Trim(),
      Type = request.Type,
      BranchId = request.BranchId,
      CurrencyId = request.CurrencyId,
      AccountingAccount = glAccount,
      IsActive = request.IsActive,
      Notes = Trim(request.Notes),
      BankName = request.Type == MoneyAccountType.Bank ? Trim(request.BankName) : null,
      AccountNumberOrIban = request.Type == MoneyAccountType.Bank ? Trim(request.AccountNumberOrIban) : null
    };
    _db.MoneyAccounts.Add(account);
    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);
    return await GetManagedMoneyAccountAsync(account.Id, userId, ct);
  }

  public async Task<MoneyAccountResponse> UpdateMoneyAccountAsync(Guid id, MoneyAccountRequest request, Guid userId, CancellationToken ct)
  {
    ValidateMoneyAccountType(request.Type);
    var account = await _db.MoneyAccounts
      .Include(item => item.AccountingAccount)
      .Include(item => item.Currency)
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw MoneyAccountNotFound();
    var code = NormalizeCode(request.Code);
    if (code != account.Code && await _db.MoneyAccounts.AnyAsync(item => item.Code == code && item.Id != id, ct))
      throw new ConflictException(ErrorCodes.Finance.MoneyAccountCodeTaken, $"Money Account code '{code}' is already in use.");

    var hasHistory = await _db.MoneyLedgerEntries.AnyAsync(entry => entry.MoneyAccountId == id, ct);
    if (hasHistory && (account.BranchId != request.BranchId || account.CurrencyId != request.CurrencyId
      || account.Type != request.Type))
      throw new BadRequestException(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed,
        "A Money Account with posted movements cannot change its branch, currency, or type.");

    if (!await _db.Branches.AnyAsync(branch => branch.Id == request.BranchId && branch.IsActive, ct))
      throw new BadRequestException(ErrorCodes.Finance.BranchInvalid, "Select an active branch.");
    var currency = await _db.Currencies.SingleOrDefaultAsync(c => c.Id == request.CurrencyId && c.IsActive, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.CurrencyInvalid, "Select an active currency.");

    if (!hasHistory && (account.BranchId != request.BranchId || account.CurrencyId != request.CurrencyId || account.Type != request.Type))
    {
      var newParent = await ResolveUasParentAsync(request.Type, request.BranchId, request.CurrencyId, ct);
      if (newParent.Id != account.AccountingAccount.ParentAccountId)
      {
        var newGlCode = await GenerateNextGlCodeAsync(newParent, ct);
        account.AccountingAccount.ParentAccountId = newParent.Id;
        account.AccountingAccount.Code = newGlCode;
      }
      account.BranchId = request.BranchId;
      account.CurrencyId = request.CurrencyId;
      account.Type = request.Type;
    }

    account.Code = code;
    account.Name = request.Name.Trim();
    account.AccountingAccount.Name = $"{request.Name.Trim()} {currency.Code}";
    account.IsActive = request.IsActive;
    account.Notes = Trim(request.Notes);
    account.BankName = request.Type == MoneyAccountType.Bank ? Trim(request.BankName) : null;
    account.AccountNumberOrIban = request.Type == MoneyAccountType.Bank ? Trim(request.AccountNumberOrIban) : null;
    account.UpdatedAtUtc = DateTime.UtcNow;
    await _db.SaveChangesAsync(ct);
    return await GetManagedMoneyAccountAsync(id, userId, ct);
  }

  public async Task DeleteMoneyAccountAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var account = await _db.MoneyAccounts
      .Include(item => item.AccountingAccount)
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw MoneyAccountNotFound();

    await EnsureAccessAsync(id, userId, MoneyAccountAccessLevel.Operate, ct);

    var hasLedger = await _db.MoneyLedgerEntries.AnyAsync(entry => entry.MoneyAccountId == id, ct);
    var hasTransfers = await _db.MoneyTransfers.AnyAsync(t => t.SourceMoneyAccountId == id || t.DestinationMoneyAccountId == id, ct);
    var hasSupplierPayments = await _db.SupplierPayments.AnyAsync(p => p.MoneyAccountId == id, ct);
    var hasCustomerReceipts = await _db.CustomerReceipts.AnyAsync(r => r.MoneyAccountId == id, ct);
    var hasPosTenders = await _db.PosTenders.AnyAsync(t => t.MoneyAccountId == id, ct);
    var hasPosChanges = await _db.PosChanges.AnyAsync(c => c.MoneyAccountId == id, ct);

    if (hasLedger || hasTransfers || hasSupplierPayments || hasCustomerReceipts || hasPosTenders || hasPosChanges)
      throw new BadRequestException(ErrorCodes.Finance.MoneyAccountStructuralChangeNotAllowed,
        "A Money Account with financial history cannot be deleted. Deactivate it instead.");

    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct)
      : null;

    var glAccountId = account.AccountingAccountId;
    var glAccount = account.AccountingAccount;

    var accessList = await _db.MoneyAccountAccess.Where(a => a.MoneyAccountId == id).ToListAsync(ct);
    _db.MoneyAccountAccess.RemoveRange(accessList);
    _db.MoneyAccounts.Remove(account);

    var hasJournalLines = await _db.JournalLines.AnyAsync(line => line.AccountId == glAccountId, ct);
    var hasChildAccounts = await _db.Accounts.AnyAsync(child => child.ParentAccountId == glAccountId, ct);
    var isReferencedByOther = await _db.MoneyAccounts.AnyAsync(other => other.AccountingAccountId == glAccountId && other.Id != id, ct);

    if (!hasJournalLines && !hasChildAccounts && !isReferencedByOther && glAccount is not null)
    {
      _db.Accounts.Remove(glAccount);
    }

    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);
  }

  public async Task<List<MoneyAccountAccessResponse>> GetMoneyAccountAccessAsync(Guid id, CancellationToken ct)
  {
    if (!await _db.MoneyAccounts.AnyAsync(account => account.Id == id, ct)) throw MoneyAccountNotFound();
    return await _db.MoneyAccountAccess.AsNoTracking().Where(access => access.MoneyAccountId == id)
      .OrderBy(access => access.User.Username)
      .Select(access => new MoneyAccountAccessResponse(access.UserId, access.User.Username, access.AccessLevel))
      .ToListAsync(ct);
  }

  public async Task<List<MoneyAccountAccessResponse>> ReplaceMoneyAccountAccessAsync(
    Guid id,
    ReplaceMoneyAccountAccessRequest request,
    CancellationToken ct)
  {
    if (!await _db.MoneyAccounts.AnyAsync(account => account.Id == id, ct)) throw MoneyAccountNotFound();
    if (request.Assignments.Select(assignment => assignment.UserId).Distinct().Count() != request.Assignments.Count)
      throw new BadRequestException(ErrorCodes.Finance.AccessAssignmentDuplicate, "A user may be assigned to a Money Account only once.");
    if (request.Assignments.Any(assignment => !Enum.IsDefined(assignment.AccessLevel)))
      throw new BadRequestException(ErrorCodes.Finance.AccessLevelInvalid, "Select View or Operate access.");
    var userIds = request.Assignments.Select(assignment => assignment.UserId).ToList();
    var validUsers = await _db.Users.CountAsync(user => userIds.Contains(user.Id) && user.IsActive, ct);
    if (validUsers != userIds.Count)
      throw new BadRequestException(ErrorCodes.Finance.AccessUserInvalid, "Every assignment must reference an active user.");

    var existing = await _db.MoneyAccountAccess.Where(access => access.MoneyAccountId == id).ToListAsync(ct);
    _db.MoneyAccountAccess.RemoveRange(existing);
    _db.MoneyAccountAccess.AddRange(request.Assignments.Select(assignment => new MoneyAccountAccessEntity
    {
      MoneyAccountId = id,
      UserId = assignment.UserId,
      AccessLevel = assignment.AccessLevel
    }));
    await _db.SaveChangesAsync(ct);
    return await GetMoneyAccountAccessAsync(id, ct);
  }

  public async Task<MoneyLedgerEntryResponse> PostOpeningMoneyBalanceAsync(
    Guid moneyAccountId,
    OpeningMoneyBalanceRequest request,
    Guid userId,
    CancellationToken ct)
  {
    await EnsureAccessAsync(moneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    var account = await _db.MoneyAccounts.Include(item => item.AccountingAccount)
      .SingleOrDefaultAsync(item => item.Id == moneyAccountId, ct) ?? throw MoneyAccountNotFound();
    EnsureActive(account);
    if (await _db.MoneyLedgerEntries.AnyAsync(entry => entry.MoneyAccountId == moneyAccountId, ct))
      throw new ConflictException(ErrorCodes.Finance.OpeningBalanceAlreadyRecorded,
        "An opening balance can only be posted before any Money Ledger activity exists.");

    var business = await GetBusinessAsync(ct);
    var rate = ResolveExplicitRate(account.CurrencyId, business.BaseCurrencyId, request.ExchangeRate);
    var baseAmount = Money(request.Amount * rate);
    var equityAccount = await GetPostingAccountAsync(
      _options.OpeningBalanceEquityAccountCode, AccountClassification.Equity, "opening balance equity", ct);
    var postedAt = DateTime.UtcNow;
    var journal = new JournalEntryEntity
    {
      EntryDate = request.Date,
      Reference = $"OPEN-{account.Code}",
      Description = $"Opening money balance for {account.Name}",
      BranchId = account.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Opening,
      PostedAtUtc = postedAt,
      Lines =
      {
        JournalLine(account.AccountingAccountId, account.CurrencyId, rate, request.Amount, 0, baseAmount, 0, "Opening money balance"),
        JournalLine(equityAccount.Id, account.CurrencyId, rate, 0, request.Amount, 0, baseAmount, "Opening balance equity")
      }
    };
    var ledger = LedgerEntry(account, request.Date, MoneyLedgerSourceType.OpeningBalance, account.Id,
      $"OPEN-{account.Code}", request.Amount, baseAmount, business.BaseCurrencyId, rate, journal.Id, userId, request.Notes, postedAt);
    _db.JournalEntries.Add(journal);
    _db.MoneyLedgerEntries.Add(ledger);
    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);
    var created = await LedgerEntryQuery().SingleAsync(entry => entry.Id == ledger.Id, ct);
    return ToLedgerResponse(created);
  }

  public async Task<PagedResult<MoneyLedgerEntryResponse>> GetMoneyLedgerAsync(
    MoneyLedgerQuery request,
    Guid userId,
    CancellationToken ct)
  {
    var query = LedgerResponseSource(userId);
    if (request.MoneyAccountId is not null) query = query.Where(entry => entry.MoneyAccountId == request.MoneyAccountId);
    if (request.BranchId is not null) query = query.Where(entry => entry.MoneyAccount.BranchId == request.BranchId);
    if (request.CurrencyId is not null) query = query.Where(entry => entry.CurrencyId == request.CurrencyId);
    if (request.FromDate is not null) query = query.Where(entry => entry.MovementDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(entry => entry.MovementDate <= request.ToDate);
    if (request.SourceType is not null) query = query.Where(entry => entry.SourceType == request.SourceType);
    if (!string.IsNullOrWhiteSpace(request.DocumentNumber))
    {
      var document = request.DocumentNumber.Trim().ToLower();
      query = query.Where(entry => entry.DocumentNumber.ToLower().Contains(document));
    }
    var normalized = request.Normalize();
    var count = await query.CountAsync(ct);
    var items = await query.OrderByDescending(entry => entry.MovementDate).ThenByDescending(entry => entry.PostedAtUtc)
      .ThenByDescending(entry => entry.Id).Skip((normalized.Page - 1) * normalized.PageSize)
      .Take(normalized.PageSize).ToListAsync(ct);
    return new PagedResult<MoneyLedgerEntryResponse>(items.Select(ToLedgerResponse).ToList(),
      count, normalized.Page, normalized.PageSize);
  }

  public async Task<PagedResult<ExchangeRateResponse>> GetExchangeRatesAsync(ExchangeRateListQuery request, CancellationToken ct)
  {
    var query = _db.ExchangeRates.AsNoTracking().AsQueryable();
    if (request.FromCurrencyId is not null) query = query.Where(rate => rate.FromCurrencyId == request.FromCurrencyId);
    if (request.ToCurrencyId is not null) query = query.Where(rate => rate.ToCurrencyId == request.ToCurrencyId);
    if (request.IsActive is not null) query = query.Where(rate => rate.IsActive == request.IsActive);
    return await query.OrderByDescending(rate => rate.EffectiveAtUtc).ThenByDescending(rate => rate.Id)
      .Select(rate => new ExchangeRateResponse(rate.Id, rate.FromCurrencyId, rate.FromCurrency.Code,
        rate.ToCurrencyId, rate.ToCurrency.Code, rate.Rate, rate.EffectiveAtUtc, rate.IsActive,
        rate.CreatedByUserId, rate.CreatedByUser.Username, rate.CreatedAtUtc))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<EffectiveExchangeRateResponse> GetEffectiveExchangeRateAsync(
    Guid currencyId,
    DateOnly date,
    CancellationToken ct)
  {
    var business = await GetBusinessAsync(ct);
    if (!await _db.Currencies.AsNoTracking().AnyAsync(currency => currency.Id == currencyId && currency.IsActive, ct))
      throw new BadRequestException(ErrorCodes.Finance.CurrencyInvalid, "Select an active currency.");

    var rate = await ExchangeRateResolver.FindAsync(_db, currencyId, business.BaseCurrencyId, date, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.ExchangeRateRequired,
        "Add an active exchange rate from the invoice currency to the Business base currency for the selected date.");
    return new EffectiveExchangeRateResponse(currencyId, business.BaseCurrencyId, date, rate);
  }

  public async Task<ExchangeRateResponse> CreateExchangeRateAsync(CreateExchangeRateRequest request, Guid userId, CancellationToken ct)
  {
    if (request.FromCurrencyId == request.ToCurrencyId)
      throw new BadRequestException(ErrorCodes.Finance.ExchangeRatePairInvalid, "Exchange Rate currencies must be different.");
    var currencyIds = new[] { request.FromCurrencyId, request.ToCurrencyId };
    if (await _db.Currencies.CountAsync(currency => currencyIds.Contains(currency.Id) && currency.IsActive, ct) != 2)
      throw new BadRequestException(ErrorCodes.Finance.CurrencyInvalid, "Exchange Rates require two active currencies.");
    var effectiveAt = request.EffectiveAtUtc.Kind == DateTimeKind.Unspecified
      ? DateTime.SpecifyKind(request.EffectiveAtUtc, DateTimeKind.Utc)
      : request.EffectiveAtUtc.ToUniversalTime();
    if (await _db.ExchangeRates.AnyAsync(rate => rate.FromCurrencyId == request.FromCurrencyId
      && rate.ToCurrencyId == request.ToCurrencyId && rate.EffectiveAtUtc == effectiveAt, ct))
      throw new ConflictException(ErrorCodes.Finance.ExchangeRateConflict, "An Exchange Rate already exists for this pair and effective time.");
    var rate = new ExchangeRateEntity
    {
      FromCurrencyId = request.FromCurrencyId,
      ToCurrencyId = request.ToCurrencyId,
      Rate = request.Rate,
      EffectiveAtUtc = effectiveAt,
      CreatedByUserId = userId
    };
    _db.ExchangeRates.Add(rate);
    await _db.SaveChangesAsync(ct);
    return await ExchangeRateResponseQuery(rate.Id).SingleAsync(ct);
  }

  public async Task<ExchangeRateResponse> DeactivateExchangeRateAsync(Guid id, CancellationToken ct)
  {
    var rate = await _db.ExchangeRates.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Finance.ExchangeRateNotFound, "Exchange Rate not found.");
    rate.IsActive = false;
    await _db.SaveChangesAsync(ct);
    return await ExchangeRateResponseQuery(id).SingleAsync(ct);
  }

  public async Task<PagedResult<MoneyTransferResponse>> GetMoneyTransfersAsync(
    MoneyTransferListQuery request,
    Guid userId,
    CancellationToken ct)
  {
    var query = _db.MoneyTransfers.AsNoTracking()
      .Where(transfer => transfer.SourceMoneyAccount.AccessAssignments.Any(access => access.UserId == userId)
        && transfer.DestinationMoneyAccount.AccessAssignments.Any(access => access.UserId == userId));
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(transfer => transfer.DocumentNumber.ToLower().Contains(search)
        || transfer.SourceMoneyAccount.Name.ToLower().Contains(search)
        || transfer.DestinationMoneyAccount.Name.ToLower().Contains(search));
    }
    if (request.MoneyAccountId is not null) query = query.Where(transfer =>
      transfer.SourceMoneyAccountId == request.MoneyAccountId || transfer.DestinationMoneyAccountId == request.MoneyAccountId);
    if (request.CurrencyId is not null) query = query.Where(transfer => transfer.CurrencyId == request.CurrencyId);
    if (request.FromDate is not null) query = query.Where(transfer => transfer.TransferDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(transfer => transfer.TransferDate <= request.ToDate);
    if (request.Status is not null) query = query.Where(transfer => transfer.Status == request.Status);
    var normalized = request.Normalize();
    var count = await query.CountAsync(ct);
    var items = await query.OrderByDescending(transfer => transfer.TransferDate).ThenByDescending(transfer => transfer.DocumentNumber)
      .Skip((normalized.Page - 1) * normalized.PageSize).Take(normalized.PageSize)
      .Include(transfer => transfer.SourceMoneyAccount).Include(transfer => transfer.DestinationMoneyAccount)
      .Include(transfer => transfer.Currency).Include(transfer => transfer.BaseCurrency)
      .Include(transfer => transfer.CreatedByUser).ToListAsync(ct);
    return new PagedResult<MoneyTransferResponse>(items.Select(ToMoneyTransferResponse).ToList(),
      count, normalized.Page, normalized.PageSize);
  }

  public async Task<MoneyTransferResponse> GetMoneyTransferAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var transfer = await _db.MoneyTransfers.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw MoneyTransferNotFound();
    await EnsureAccessAsync(transfer.SourceMoneyAccountId, userId, MoneyAccountAccessLevel.View, ct);
    await EnsureAccessAsync(transfer.DestinationMoneyAccountId, userId, MoneyAccountAccessLevel.View, ct);
    var detailed = await MoneyTransferQuery().SingleAsync(item => item.Id == id, ct);
    return ToMoneyTransferResponse(detailed);
  }

  public async Task<MoneyTransferResponse> CreateMoneyTransferAsync(
    MoneyTransferDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var validation = await ValidateTransferAsync(request, userId, ct);
    var transfer = new MoneyTransferEntity
    {
      DocumentNumber = await NextTransferNumberAsync(ct),
      CreatedByUserId = userId
    };
    ApplyTransfer(transfer, request, validation);
    _db.MoneyTransfers.Add(transfer);
    await SaveDocumentAsync(ErrorCodes.Finance.TransferDocumentNumberConflict,
      "Could not allocate a unique Money Transfer number. Try again.", ct);
    return await GetMoneyTransferAsync(transfer.Id, userId, ct);
  }

  public async Task<MoneyTransferResponse> UpdateMoneyTransferAsync(
    Guid id,
    MoneyTransferDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var transfer = await _db.MoneyTransfers.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw MoneyTransferNotFound();
    EnsureDraft(transfer.Status, "Money Transfer");
    await EnsureAccessAsync(transfer.SourceMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    await EnsureAccessAsync(transfer.DestinationMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    var validation = await ValidateTransferAsync(request, userId, ct);
    ApplyTransfer(transfer, request, validation);
    transfer.UpdatedAtUtc = DateTime.UtcNow;
    await SaveDocumentMutationAsync(ct);
    return await GetMoneyTransferAsync(id, userId, ct);
  }

  public async Task DeleteMoneyTransferAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var transfer = await _db.MoneyTransfers.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw MoneyTransferNotFound();
    EnsureDraft(transfer.Status, "Money Transfer");
    await EnsureAccessAsync(transfer.SourceMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    await EnsureAccessAsync(transfer.DestinationMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    _db.MoneyTransfers.Remove(transfer);
    await SaveDocumentMutationAsync(ct);
  }

  public async Task<MoneyTransferResponse> PostMoneyTransferAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var transfer = await _db.MoneyTransfers.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw MoneyTransferNotFound();
    EnsureDraft(transfer.Status, "Money Transfer");
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    await EnsureAccessAsync(transfer.SourceMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    await EnsureAccessAsync(transfer.DestinationMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);

    var accountIds = new[] { transfer.SourceMoneyAccountId, transfer.DestinationMoneyAccountId };
    var accounts = await _db.MoneyAccounts.Include(account => account.AccountingAccount)
      .Where(account => accountIds.Contains(account.Id)).ToDictionaryAsync(account => account.Id, ct);
    if (accounts.Count != 2) throw new BadRequestException(ErrorCodes.Finance.MoneyAccountInvalid, "Both Money Accounts must exist.");
    var source = accounts[transfer.SourceMoneyAccountId];
    var destination = accounts[transfer.DestinationMoneyAccountId];
    EnsureActive(source);
    EnsureActive(destination);
    ValidateTransferAccounts(source, destination);
    var sourceBalance = await BalanceAsync(source.Id, ct);
    if (sourceBalance < transfer.Amount)
      throw new BadRequestException(ErrorCodes.Finance.InsufficientBalance,
        $"Money Account '{source.Code}' has insufficient balance for this transfer.");

    var postedAt = DateTime.UtcNow;
    var journal = new JournalEntryEntity
    {
      EntryDate = transfer.TransferDate,
      Reference = transfer.DocumentNumber,
      Description = $"Money transfer {transfer.DocumentNumber}",
      BranchId = source.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = postedAt,
      Lines =
      {
        JournalLine(destination.AccountingAccountId, transfer.CurrencyId, transfer.ExchangeRate,
          transfer.Amount, 0, transfer.BaseAmount, 0, $"Transfer from {source.Code}"),
        JournalLine(source.AccountingAccountId, transfer.CurrencyId, transfer.ExchangeRate,
          0, transfer.Amount, 0, transfer.BaseAmount, $"Transfer to {destination.Code}")
      }
    };
    transfer.JournalEntry = journal;
    transfer.Status = FinanceDocumentStatus.Posted;
    transfer.PostedAtUtc = postedAt;
    transfer.UpdatedAtUtc = postedAt;
    _db.JournalEntries.Add(journal);
    _db.MoneyLedgerEntries.AddRange(
      LedgerEntry(source, transfer.TransferDate, MoneyLedgerSourceType.MoneyTransfer, transfer.Id,
        transfer.DocumentNumber, -transfer.Amount, -transfer.BaseAmount, transfer.BaseCurrencyId,
        transfer.ExchangeRate, journal.Id, userId, transfer.Notes, postedAt),
      LedgerEntry(destination, transfer.TransferDate, MoneyLedgerSourceType.MoneyTransfer, transfer.Id,
        transfer.DocumentNumber, transfer.Amount, transfer.BaseAmount, transfer.BaseCurrencyId,
        transfer.ExchangeRate, journal.Id, userId, transfer.Notes, postedAt));
    await SaveDocumentMutationAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);
    return await GetMoneyTransferAsync(id, userId, ct);
  }

  public async Task<PagedResult<SupplierPaymentResponse>> GetSupplierPaymentsAsync(
    SupplierPaymentListQuery request,
    Guid userId,
    CancellationToken ct)
  {
    var query = SupplierPaymentSource().Where(payment =>
      payment.MoneyAccount.AccessAssignments.Any(access => access.UserId == userId));
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(payment => payment.DocumentNumber.ToLower().Contains(search)
        || payment.Supplier.Name.ToLower().Contains(search));
    }
    if (request.SupplierId is not null) query = query.Where(payment => payment.SupplierId == request.SupplierId);
    if (request.MoneyAccountId is not null) query = query.Where(payment => payment.MoneyAccountId == request.MoneyAccountId);
    if (request.CurrencyId is not null) query = query.Where(payment => payment.CurrencyId == request.CurrencyId);
    if (request.FromDate is not null) query = query.Where(payment => payment.PaymentDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(payment => payment.PaymentDate <= request.ToDate);
    if (request.Status is not null) query = query.Where(payment => payment.Status == request.Status);
    var normalized = request.Normalize();
    var count = await query.CountAsync(ct);
    var items = await query.OrderByDescending(payment => payment.PaymentDate).ThenByDescending(payment => payment.DocumentNumber)
      .Skip((normalized.Page - 1) * normalized.PageSize).Take(normalized.PageSize).ToListAsync(ct);
    return new PagedResult<SupplierPaymentResponse>(items.Select(ToSupplierPaymentResponse).ToList(),
      count, normalized.Page, normalized.PageSize);
  }

  public async Task<SupplierPaymentResponse> GetSupplierPaymentAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var payment = await SupplierPaymentSource().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw SupplierPaymentNotFound();
    await EnsureAccessAsync(payment.MoneyAccountId, userId, MoneyAccountAccessLevel.View, ct);
    return ToSupplierPaymentResponse(payment);
  }

  public async Task<SupplierPaymentResponse> CreateSupplierPaymentAsync(
    SupplierPaymentDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var validation = await ValidateSupplierPaymentAsync(request, userId, ct);
    var payment = new SupplierPaymentEntity
    {
      DocumentNumber = await NextSupplierPaymentNumberAsync(ct),
      CreatedByUserId = userId
    };
    ApplySupplierPayment(payment, request, validation);
    ReplaceAllocations(payment, request.Allocations, validation.Invoices);
    _db.SupplierPayments.Add(payment);
    await SaveDocumentAsync(ErrorCodes.Finance.SupplierPaymentDocumentNumberConflict,
      "Could not allocate a unique Supplier Payment number. Try again.", ct);
    return await GetSupplierPaymentAsync(payment.Id, userId, ct);
  }

  public async Task<SupplierPaymentResponse> UpdateSupplierPaymentAsync(
    Guid id,
    SupplierPaymentDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var payment = await _db.SupplierPayments.Include(item => item.Allocations)
      .SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw SupplierPaymentNotFound();
    EnsureDraft(payment.Status, "Supplier Payment");
    await EnsureAccessAsync(payment.MoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    var validation = await ValidateSupplierPaymentAsync(request, userId, ct);
    ApplySupplierPayment(payment, request, validation);
    ReplaceAllocations(payment, request.Allocations, validation.Invoices);
    payment.UpdatedAtUtc = DateTime.UtcNow;
    await SaveDocumentMutationAsync(ct);
    return await GetSupplierPaymentAsync(id, userId, ct);
  }

  public async Task DeleteSupplierPaymentAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var payment = await _db.SupplierPayments.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw SupplierPaymentNotFound();
    EnsureDraft(payment.Status, "Supplier Payment");
    await EnsureAccessAsync(payment.MoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    _db.SupplierPayments.Remove(payment);
    await SaveDocumentMutationAsync(ct);
  }

  public async Task<SupplierPaymentResponse> PostSupplierPaymentAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var payment = await _db.SupplierPayments.Include(item => item.Allocations)
      .SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw SupplierPaymentNotFound();
    EnsureDraft(payment.Status, "Supplier Payment");
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    await EnsureAccessAsync(payment.MoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    var request = new SupplierPaymentDraftRequest(payment.SupplierId, payment.PaymentDate, payment.MoneyAccountId,
      payment.ExchangeRate, payment.TotalAmount, payment.Notes,
      payment.Allocations.Select(allocation => new SupplierPaymentAllocationRequest(
        allocation.PurchaseInvoiceId, allocation.Amount)).ToList());
    var validation = await ValidateSupplierPaymentAsync(request, userId, ct);
    var balance = await BalanceAsync(payment.MoneyAccountId, ct);
    if (balance < payment.TotalAmount)
      throw new BadRequestException(ErrorCodes.Finance.InsufficientBalance,
        $"Money Account '{validation.Account.Code}' has insufficient balance for this Supplier Payment.");
    var payableAccount = await GetPostingAccountAsync(
      _options.AccountsPayableAccountCode, AccountClassification.Liability, "accounts payable", ct);

    var postedAt = DateTime.UtcNow;
    var journal = new JournalEntryEntity
    {
      EntryDate = payment.PaymentDate,
      Reference = payment.DocumentNumber,
      Description = $"Supplier payment {payment.DocumentNumber}",
      BranchId = validation.Account.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = postedAt,
      Lines =
      {
        JournalLine(payableAccount.Id, payment.CurrencyId, payment.ExchangeRate,
          payment.TotalAmount, 0, payment.BaseTotalAmount, 0, $"Payable settled for {validation.SupplierName}"),
        JournalLine(validation.Account.AccountingAccountId, payment.CurrencyId, payment.ExchangeRate,
          0, payment.TotalAmount, 0, payment.BaseTotalAmount, $"Paid from {validation.Account.Code}")
      }
    };
    payment.JournalEntry = journal;
    payment.Status = FinanceDocumentStatus.Posted;
    payment.PostedAtUtc = postedAt;
    payment.UpdatedAtUtc = postedAt;
    foreach (var allocation in payment.Allocations)
      allocation.BaseAmount = Money(allocation.Amount * payment.ExchangeRate);
    _db.JournalEntries.Add(journal);
    _db.MoneyLedgerEntries.Add(LedgerEntry(validation.Account, payment.PaymentDate,
      MoneyLedgerSourceType.SupplierPayment, payment.Id, payment.DocumentNumber,
      -payment.TotalAmount, -payment.BaseTotalAmount, payment.BaseCurrencyId, payment.ExchangeRate,
      journal.Id, userId, payment.Notes, postedAt));
    await SaveDocumentMutationAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);
    return await GetSupplierPaymentAsync(id, userId, ct);
  }

  public async Task<List<OutstandingPurchaseInvoiceResponse>> GetOutstandingPurchaseInvoicesAsync(
    Guid supplierId,
    Guid? currencyId,
    CancellationToken ct)
  {
    var query = _db.PurchaseInvoices.AsNoTracking()
      .Where(invoice => invoice.SupplierId == supplierId && invoice.Status == PurchaseInvoiceStatus.Posted);
    if (currencyId is not null) query = query.Where(invoice => invoice.CurrencyId == currencyId);
    var rows = await query.OrderBy(invoice => invoice.InvoiceDate).ThenBy(invoice => invoice.DocumentNumber)
      .Select(invoice => new OutstandingPurchaseInvoiceResponse(
        invoice.Id, invoice.DocumentNumber, invoice.InvoiceDate, invoice.SupplierId, invoice.Supplier.Name,
        invoice.CurrencyId, invoice.Currency.Code, invoice.ExchangeRate, invoice.Total,
        _db.SupplierPaymentAllocations.Where(allocation => allocation.PurchaseInvoiceId == invoice.Id
          && allocation.SupplierPayment.Status == FinanceDocumentStatus.Posted)
          .Sum(allocation => (decimal?)allocation.Amount) ?? 0,
        invoice.Total - (_db.SupplierPaymentAllocations.Where(allocation => allocation.PurchaseInvoiceId == invoice.Id
          && allocation.SupplierPayment.Status == FinanceDocumentStatus.Posted)
          .Sum(allocation => (decimal?)allocation.Amount) ?? 0)))
      .ToListAsync(ct);
    return rows.Where(invoice => invoice.OutstandingAmount > 0).ToList();
  }

  public Task<List<FinanceSupplierResponse>> GetSuppliersAsync(CancellationToken ct) =>
    _db.Contacts.AsNoTracking().Where(contact => contact.IsActive && contact.IsSupplier)
      .OrderBy(contact => contact.Name).ThenBy(contact => contact.Id)
      .Select(contact => new FinanceSupplierResponse(contact.Id, contact.Name)).ToListAsync(ct);

  public async Task<PagedResult<CustomerReceiptListResponse>> GetCustomerReceiptsAsync(
    CustomerReceiptListQuery request,
    Guid userId,
    CancellationToken ct)
  {
    var query = _db.CustomerReceipts.AsNoTracking().Where(receipt =>
      receipt.MoneyAccount.AccessAssignments.Any(access => access.UserId == userId));
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(receipt => receipt.DocumentNumber.ToLower().Contains(search)
        || receipt.Customer.Name.ToLower().Contains(search));
    }
    if (request.CustomerId is not null) query = query.Where(receipt => receipt.CustomerId == request.CustomerId);
    if (request.BranchId is not null) query = query.Where(receipt => receipt.MoneyAccount.BranchId == request.BranchId);
    if (request.MoneyAccountId is not null) query = query.Where(receipt => receipt.MoneyAccountId == request.MoneyAccountId);
    if (request.CurrencyId is not null) query = query.Where(receipt => receipt.CurrencyId == request.CurrencyId);
    if (request.FromDate is not null) query = query.Where(receipt => receipt.ReceiptDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(receipt => receipt.ReceiptDate <= request.ToDate);
    if (request.Status is not null) query = query.Where(receipt => receipt.Status == request.Status);

    return await query.OrderByDescending(receipt => receipt.ReceiptDate)
      .ThenByDescending(receipt => receipt.DocumentNumber)
      .Select(receipt => new CustomerReceiptListResponse(
        receipt.Id, receipt.DocumentNumber, receipt.CustomerId, receipt.Customer.Name, receipt.ReceiptDate,
        receipt.MoneyAccountId, receipt.MoneyAccount.Code, receipt.MoneyAccount.Name,
        receipt.MoneyAccount.BranchId, receipt.MoneyAccount.Branch.Name,
        receipt.CurrencyId, receipt.Currency.Code, receipt.TotalAmount, receipt.Status,
        receipt.CreatedByUserId, receipt.CreatedByUser.Username))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<CustomerReceiptResponse> GetCustomerReceiptAsync(
    Guid id,
    Guid userId,
    CancellationToken ct)
  {
    var receipt = await CustomerReceiptSource().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw CustomerReceiptNotFound();
    await EnsureAccessAsync(receipt.MoneyAccountId, userId, MoneyAccountAccessLevel.View, ct);
    var ledgerId = await _db.MoneyLedgerEntries.AsNoTracking()
      .Where(entry => entry.SourceType == MoneyLedgerSourceType.CustomerReceipt
        && entry.SourceDocumentId == receipt.Id)
      .Select(entry => (Guid?)entry.Id)
      .SingleOrDefaultAsync(ct);
    return ToCustomerReceiptResponse(receipt, ledgerId);
  }

  public async Task<CustomerReceiptResponse> CreateCustomerReceiptAsync(
    CustomerReceiptDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var validation = await ValidateCustomerReceiptAsync(request, userId, ct);
    var receipt = new CustomerReceiptEntity
    {
      DocumentNumber = await NextCustomerReceiptNumberAsync(ct),
      CreatedByUserId = userId
    };
    ApplyCustomerReceipt(receipt, request, validation);
    ReplaceCustomerReceiptAllocations(receipt, request.Allocations, validation.Invoices);
    _db.CustomerReceipts.Add(receipt);
    await SaveDocumentAsync(ErrorCodes.Finance.CustomerReceiptDocumentNumberConflict,
      "Could not allocate a unique Customer Receipt number. Try again.", ct);
    return await GetCustomerReceiptAsync(receipt.Id, userId, ct);
  }

  public async Task<CustomerReceiptResponse> UpdateCustomerReceiptAsync(
    Guid id,
    CustomerReceiptDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var receipt = await _db.CustomerReceipts.Include(item => item.Allocations)
      .SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw CustomerReceiptNotFound();
    EnsureDraft(receipt.Status, "Customer Receipt");
    await EnsureAccessAsync(receipt.MoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    var validation = await ValidateCustomerReceiptAsync(request, userId, ct);
    ApplyCustomerReceipt(receipt, request, validation);
    ReplaceCustomerReceiptAllocations(receipt, request.Allocations, validation.Invoices);
    receipt.UpdatedAtUtc = DateTime.UtcNow;
    await SaveDocumentMutationAsync(ct);
    return await GetCustomerReceiptAsync(id, userId, ct);
  }

  public async Task DeleteCustomerReceiptAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var receipt = await _db.CustomerReceipts.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw CustomerReceiptNotFound();
    EnsureDraft(receipt.Status, "Customer Receipt");
    await EnsureAccessAsync(receipt.MoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    _db.CustomerReceipts.Remove(receipt);
    await SaveDocumentMutationAsync(ct);
  }

  public async Task<CustomerReceiptResponse> PostCustomerReceiptAsync(
    Guid id,
    Guid userId,
    CancellationToken ct)
  {
    var receipt = await _db.CustomerReceipts.Include(item => item.Allocations)
      .SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw CustomerReceiptNotFound();
    EnsureDraft(receipt.Status, "Customer Receipt");
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;

    var request = new CustomerReceiptDraftRequest(
      receipt.CustomerId,
      receipt.ReceiptDate,
      receipt.MoneyAccountId,
      receipt.ExchangeRate,
      receipt.TotalAmount,
      receipt.Notes,
      receipt.Allocations.Select(allocation => new CustomerReceiptAllocationRequest(
        allocation.SalesInvoiceId, allocation.Amount)).ToList());
    var validation = await ValidateCustomerReceiptAsync(request, userId, ct);
    var receivableAccount = await GetPostingAccountAsync(
      _options.AccountsReceivableAccountCode, AccountClassification.Asset, "accounts receivable", ct);
    var postedAt = DateTime.UtcNow;
    var journal = new JournalEntryEntity
    {
      EntryDate = receipt.ReceiptDate,
      Reference = receipt.DocumentNumber,
      Description = $"Customer receipt {receipt.DocumentNumber}",
      BranchId = validation.Account.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = postedAt,
      Lines =
      {
        JournalLine(validation.Account.AccountingAccountId, receipt.CurrencyId, receipt.ExchangeRate,
          receipt.TotalAmount, 0, receipt.BaseTotalAmount, 0, $"Received into {validation.Account.Code}"),
        JournalLine(receivableAccount.Id, receipt.CurrencyId, receipt.ExchangeRate,
          0, receipt.TotalAmount, 0, receipt.BaseTotalAmount, $"Receivable settled for {validation.CustomerName}")
      }
    };
    receipt.JournalEntry = journal;
    receipt.Status = FinanceDocumentStatus.Posted;
    receipt.PostedAtUtc = postedAt;
    receipt.UpdatedAtUtc = postedAt;
    foreach (var allocation in receipt.Allocations)
      allocation.BaseAmount = Money(allocation.Amount * receipt.ExchangeRate);
    _db.JournalEntries.Add(journal);
    _db.MoneyLedgerEntries.Add(LedgerEntry(validation.Account, receipt.ReceiptDate,
      MoneyLedgerSourceType.CustomerReceipt, receipt.Id, receipt.DocumentNumber,
      receipt.TotalAmount, receipt.BaseTotalAmount, receipt.BaseCurrencyId, receipt.ExchangeRate,
      journal.Id, userId, receipt.Notes, postedAt));
    await SaveDocumentMutationAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);
    return await GetCustomerReceiptAsync(id, userId, ct);
  }

  public async Task<List<OutstandingSalesInvoiceResponse>> GetOutstandingSalesInvoicesAsync(
    Guid customerId,
    Guid? currencyId,
    CancellationToken ct)
  {
    var query = _db.SalesInvoices.AsNoTracking()
      .Where(invoice => invoice.CustomerId == customerId && invoice.Status == SalesInvoiceStatus.Posted
        && invoice.PosSale == null);
    if (currencyId is not null) query = query.Where(invoice => invoice.CurrencyId == currencyId);
    var rows = await query.OrderBy(invoice => invoice.InvoiceDate).ThenBy(invoice => invoice.DocumentNumber)
      .Select(invoice => new OutstandingSalesInvoiceResponse(
        invoice.Id, invoice.DocumentNumber, invoice.InvoiceDate, invoice.CustomerId!.Value, invoice.Customer!.Name,
        invoice.CurrencyId, invoice.Currency.Code, invoice.ExchangeRate, invoice.Total,
        _db.CustomerReceiptAllocations.Where(allocation => allocation.SalesInvoiceId == invoice.Id
          && allocation.CustomerReceipt.Status == FinanceDocumentStatus.Posted)
          .Sum(allocation => (decimal?)allocation.Amount) ?? 0,
        invoice.Total - (_db.CustomerReceiptAllocations.Where(allocation => allocation.SalesInvoiceId == invoice.Id
          && allocation.CustomerReceipt.Status == FinanceDocumentStatus.Posted)
          .Sum(allocation => (decimal?)allocation.Amount) ?? 0)))
      .ToListAsync(ct);
    return rows.Where(invoice => invoice.OutstandingAmount > 0).ToList();
  }

  public Task<List<FinanceCustomerResponse>> GetCustomersAsync(CancellationToken ct) =>
    _db.Contacts.AsNoTracking().Where(contact => contact.IsActive && contact.IsCustomer)
      .OrderBy(contact => contact.Name).ThenBy(contact => contact.Id)
      .Select(contact => new FinanceCustomerResponse(contact.Id, contact.Name)).ToListAsync(ct);

  private async Task<TransferValidation> ValidateTransferAsync(
    MoneyTransferDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    if (request.SourceMoneyAccountId == request.DestinationMoneyAccountId)
      throw new BadRequestException(ErrorCodes.Finance.TransferSameAccount, "Source and destination Money Accounts must be different.");
    await EnsureAccessAsync(request.SourceMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    await EnsureAccessAsync(request.DestinationMoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    var ids = new[] { request.SourceMoneyAccountId, request.DestinationMoneyAccountId };
    var accounts = await _db.MoneyAccounts.AsNoTracking().Include(account => account.AccountingAccount)
      .Where(account => ids.Contains(account.Id))
      .ToDictionaryAsync(account => account.Id, ct);
    if (accounts.Count != 2) throw new BadRequestException(ErrorCodes.Finance.MoneyAccountInvalid, "Both Money Accounts must exist.");
    var source = accounts[request.SourceMoneyAccountId];
    var destination = accounts[request.DestinationMoneyAccountId];
    EnsureActive(source);
    EnsureActive(destination);
    ValidateTransferAccounts(source, destination);
    var business = await GetBusinessAsync(ct);
    var rate = await ResolveCurrentRateAsync(source.CurrencyId, business.BaseCurrencyId, request.TransferDate, ct);
    return new TransferValidation(source.CurrencyId, business.BaseCurrencyId, rate, Money(request.Amount * rate));
  }

  private async Task<SupplierPaymentValidation> ValidateSupplierPaymentAsync(
    SupplierPaymentDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    if (request.Allocations.Count == 0)
      throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationsRequired, "Allocate the payment to at least one Purchase Invoice.");
    if (request.Allocations.Select(allocation => allocation.PurchaseInvoiceId).Distinct().Count() != request.Allocations.Count)
      throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationDuplicate, "A Purchase Invoice may be allocated only once per payment.");
    if (request.Allocations.Any(allocation => allocation.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationInvalid, "Allocation amounts must be greater than zero.");
    if (Money(request.Allocations.Sum(allocation => allocation.Amount)) != Money(request.TotalAmount))
      throw new BadRequestException(ErrorCodes.Finance.PaymentMustBeFullyAllocated,
        "The Supplier Payment total must be fully allocated to Purchase Invoices.");

    await EnsureAccessAsync(request.MoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    var account = await _db.MoneyAccounts.AsNoTracking().Include(item => item.AccountingAccount)
      .SingleOrDefaultAsync(item => item.Id == request.MoneyAccountId, ct) ?? throw MoneyAccountNotFound();
    EnsureActive(account);
    var supplier = await _db.Contacts.AsNoTracking()
      .SingleOrDefaultAsync(contact => contact.Id == request.SupplierId && contact.IsActive && contact.IsSupplier, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.SupplierInvalid, "Select an active supplier contact.");
    var business = await GetBusinessAsync(ct);
    var rate = ResolveExplicitRate(account.CurrencyId, business.BaseCurrencyId, request.ExchangeRate);
    var invoiceIds = request.Allocations.Select(allocation => allocation.PurchaseInvoiceId).ToList();
    var invoices = await _db.PurchaseInvoices.AsNoTracking()
      .Where(invoice => invoiceIds.Contains(invoice.Id)).ToDictionaryAsync(invoice => invoice.Id, ct);
    if (invoices.Count != invoiceIds.Count || invoices.Values.Any(invoice => invoice.Status != PurchaseInvoiceStatus.Posted))
      throw new BadRequestException(ErrorCodes.Finance.PurchaseInvoiceInvalid, "Every allocation must reference a posted Purchase Invoice.");
    if (invoices.Values.Any(invoice => invoice.SupplierId != request.SupplierId))
      throw new BadRequestException(ErrorCodes.Finance.PaymentSupplierMismatch, "All allocated Purchase Invoices must belong to the selected supplier.");
    if (invoices.Values.Any(invoice => invoice.CurrencyId != account.CurrencyId))
      throw new BadRequestException(ErrorCodes.Finance.PaymentCurrencyMismatch,
        "The Money Account and every allocated Purchase Invoice must use the same currency.");
    if (invoices.Values.Any(invoice => invoice.ExchangeRate != rate))
      throw new BadRequestException(ErrorCodes.Finance.PaymentExchangeRateMismatch,
        "Foreign-currency payments currently require the same historical exchange rate as every allocated Purchase Invoice.");

    var postedAllocations = await _db.SupplierPaymentAllocations.AsNoTracking()
      .Where(allocation => invoiceIds.Contains(allocation.PurchaseInvoiceId)
        && allocation.SupplierPayment.Status == FinanceDocumentStatus.Posted)
      .GroupBy(allocation => allocation.PurchaseInvoiceId)
      .Select(group => new { PurchaseInvoiceId = group.Key, Amount = group.Sum(allocation => allocation.Amount) })
      .ToDictionaryAsync(item => item.PurchaseInvoiceId, item => item.Amount, ct);
    foreach (var allocation in request.Allocations)
    {
      var paid = postedAllocations.GetValueOrDefault(allocation.PurchaseInvoiceId);
      var outstanding = invoices[allocation.PurchaseInvoiceId].Total - paid;
      if (allocation.Amount > outstanding)
        throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationExceedsOutstanding,
          $"Allocation for Purchase Invoice '{invoices[allocation.PurchaseInvoiceId].DocumentNumber}' exceeds its outstanding amount.");
    }
    return new SupplierPaymentValidation(account, supplier.Name, business.BaseCurrencyId, rate, invoices);
  }

  private async Task<CustomerReceiptValidation> ValidateCustomerReceiptAsync(
    CustomerReceiptDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    if (request.Allocations.Count == 0)
      throw new BadRequestException(ErrorCodes.Finance.ReceiptAllocationsRequired,
        "Allocate the receipt to at least one Sales Invoice.");
    if (request.Allocations.Select(allocation => allocation.SalesInvoiceId).Distinct().Count() != request.Allocations.Count)
      throw new BadRequestException(ErrorCodes.Finance.ReceiptAllocationDuplicate,
        "A Sales Invoice may be allocated only once per receipt.");
    if (request.Allocations.Any(allocation => allocation.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Finance.ReceiptAllocationInvalid,
        "Allocation amounts must be greater than zero.");
    if (Money(request.Allocations.Sum(allocation => allocation.Amount)) != Money(request.TotalAmount))
      throw new BadRequestException(ErrorCodes.Finance.ReceiptMustBeFullyAllocated,
        "The Customer Receipt total must be fully allocated to Sales Invoices.");

    await EnsureAccessAsync(request.MoneyAccountId, userId, MoneyAccountAccessLevel.Operate, ct);
    var account = await _db.MoneyAccounts.AsNoTracking().Include(item => item.AccountingAccount)
      .SingleOrDefaultAsync(item => item.Id == request.MoneyAccountId, ct) ?? throw MoneyAccountNotFound();
    EnsureActive(account);
    var customer = await _db.Contacts.AsNoTracking()
      .SingleOrDefaultAsync(contact => contact.Id == request.CustomerId && contact.IsActive && contact.IsCustomer, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.CustomerInvalid, "Select an active customer contact.");
    var business = await GetBusinessAsync(ct);
    var rate = ResolveExplicitRate(account.CurrencyId, business.BaseCurrencyId, request.ExchangeRate);
    var invoiceIds = request.Allocations.Select(allocation => allocation.SalesInvoiceId).ToList();
    var invoices = await _db.SalesInvoices.AsNoTracking()
      .Where(invoice => invoiceIds.Contains(invoice.Id) && invoice.PosSale == null)
      .ToDictionaryAsync(invoice => invoice.Id, ct);
    if (invoices.Count != invoiceIds.Count || invoices.Values.Any(invoice => invoice.Status != SalesInvoiceStatus.Posted))
      throw new BadRequestException(ErrorCodes.Finance.SalesInvoiceInvalid,
        "Every allocation must reference a posted Sales Invoice.");
    if (invoices.Values.Any(invoice => invoice.CustomerId != request.CustomerId))
      throw new BadRequestException(ErrorCodes.Finance.ReceiptCustomerMismatch,
        "All allocated Sales Invoices must belong to the selected customer.");
    if (invoices.Values.Any(invoice => invoice.CurrencyId != account.CurrencyId))
      throw new BadRequestException(ErrorCodes.Finance.ReceiptCurrencyMismatch,
        "The Money Account and every allocated Sales Invoice must use the same currency.");
    if (invoices.Values.Any(invoice => invoice.ExchangeRate != rate))
      throw new BadRequestException(ErrorCodes.Finance.ReceiptExchangeRateMismatch,
        "Foreign-currency receipts currently require the same historical exchange rate as every allocated Sales Invoice.");

    var postedAllocations = await _db.CustomerReceiptAllocations.AsNoTracking()
      .Where(allocation => invoiceIds.Contains(allocation.SalesInvoiceId)
        && allocation.CustomerReceipt.Status == FinanceDocumentStatus.Posted)
      .GroupBy(allocation => allocation.SalesInvoiceId)
      .Select(group => new { SalesInvoiceId = group.Key, Amount = group.Sum(allocation => allocation.Amount) })
      .ToDictionaryAsync(item => item.SalesInvoiceId, item => item.Amount, ct);
    foreach (var allocation in request.Allocations)
    {
      var received = postedAllocations.GetValueOrDefault(allocation.SalesInvoiceId);
      var outstanding = invoices[allocation.SalesInvoiceId].Total - received;
      if (allocation.Amount > outstanding)
        throw new BadRequestException(ErrorCodes.Finance.ReceiptAllocationExceedsOutstanding,
          $"Allocation for Sales Invoice '{invoices[allocation.SalesInvoiceId].DocumentNumber}' exceeds its outstanding amount.");
    }
    return new CustomerReceiptValidation(account, customer.Name, business.BaseCurrencyId, rate, invoices);
  }

  private async Task<AccountEntity> ResolveUasParentAsync(
    MoneyAccountType type,
    Guid branchId,
    Guid currencyId,
    CancellationToken ct)
  {
    var business = await GetBusinessAsync(ct);
    string uasCode;

    if (type == MoneyAccountType.Cashbox)
    {
      var branch = await _db.Branches.AsNoTracking().SingleOrDefaultAsync(b => b.Id == branchId && b.IsActive, ct)
        ?? throw new BadRequestException(ErrorCodes.Finance.BranchInvalid, "Select an active branch.");
      var isMain = branch.IsMainBranch;
      var isBase = currencyId == business.BaseCurrencyId;

      uasCode = (isMain, isBase) switch
      {
        (true, true) => "134111",
        (true, false) => "134112",
        (false, true) => "134121",
        (false, false) => "134122"
      };
    }
    else if (type == MoneyAccountType.Bank)
    {
      var isBase = currencyId == business.BaseCurrencyId;
      uasCode = isBase ? "13421" : "13422";
    }
    else
    {
      throw new BadRequestException(ErrorCodes.Finance.MoneyAccountTypeInvalid, "Select Cashbox or Bank.");
    }

    var parent = await _db.Accounts.SingleOrDefaultAsync(
      a => a.Code == uasCode && a.IsActive && a.IsGroup && a.Classification == AccountClassification.Asset, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.AccountMappingInvalid,
        $"Iraqi UAS parent account '{uasCode}' was not found or is not an active group Asset account.");

    return parent;
  }

  private async Task<string> GenerateNextGlCodeAsync(AccountEntity parentAccount, CancellationToken ct)
  {
    var existingCodes = await _db.Accounts
      .Where(a => a.Code.StartsWith(parentAccount.Code) && a.Code.Length > parentAccount.Code.Length)
      .Select(a => a.Code)
      .ToListAsync(ct);

    var maxSeq = 0;
    foreach (var existingCode in existingCodes)
    {
      var suffix = existingCode[parentAccount.Code.Length..];
      if (int.TryParse(suffix, out var seq) && seq > maxSeq)
      {
        maxSeq = seq;
      }
    }

    var nextSeq = maxSeq + 1;
    return $"{parentAccount.Code}{nextSeq:D2}";
  }

  internal async Task EnsureAccessAsync(
    Guid moneyAccountId,
    Guid userId,
    MoneyAccountAccessLevel required,
    CancellationToken ct)
  {
    var hasAccess = await _db.MoneyAccountAccess.AsNoTracking().AnyAsync(access =>
      access.MoneyAccountId == moneyAccountId && access.UserId == userId
      && (required == MoneyAccountAccessLevel.View || access.AccessLevel == MoneyAccountAccessLevel.Operate), ct);
    if (!hasAccess)
      throw new ForbiddenException(ErrorCodes.Finance.MoneyAccountAccessDenied,
        "You do not have the required access to this Money Account.");
  }

  private async Task<BusinessEntity> GetBusinessAsync(CancellationToken ct) =>
    await _db.Businesses.AsNoTracking().SingleOrDefaultAsync(business => business.IsActive && business.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.BusinessNotConfigured,
        "Complete Business Setup before using Finance.");

  internal Task<decimal> ResolveCurrentRateAsync(
    Guid currencyId,
    Guid baseCurrencyId,
    DateOnly date,
    CancellationToken ct)
  {
    var endOfDate = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
    return ResolveCurrentRateAsync(currencyId, baseCurrencyId, endOfDate, ct);
  }

  internal async Task<decimal> ResolveCurrentRateAsync(
    Guid currencyId,
    Guid baseCurrencyId,
    DateTime effectiveAtUtc,
    CancellationToken ct)
  {
    return await ExchangeRateResolver.FindAsync(_db, currencyId, baseCurrencyId, effectiveAtUtc, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.ExchangeRateRequired,
        "Add an active exchange rate from the Money Account currency to the Business base currency.");
  }

  private static decimal ResolveExplicitRate(Guid currencyId, Guid baseCurrencyId, decimal? requestedRate)
  {
    if (currencyId == baseCurrencyId) return 1m;
    if (requestedRate is null || requestedRate <= 0)
      throw new BadRequestException(ErrorCodes.Finance.ExchangeRateRequired,
        "Enter a positive exchange rate for the foreign-currency operation.");
    return requestedRate.Value;
  }

  private async Task<AccountEntity> GetPostingAccountAsync(
    string code,
    AccountClassification classification,
    string purpose,
    CancellationToken ct)
  {
    var account = await _db.Accounts.SingleOrDefaultAsync(item => item.Code == code, ct);
    if (account is null || !account.IsActive || account.IsGroup || account.Classification != classification)
      throw new BadRequestException(ErrorCodes.Finance.AccountMappingInvalid,
        $"Configure an active posting account for {purpose}.");
    return account;
  }

  internal async Task<decimal> BalanceAsync(Guid moneyAccountId, CancellationToken ct) =>
    await _db.MoneyLedgerEntries.Where(entry => entry.MoneyAccountId == moneyAccountId)
      .SumAsync(entry => (decimal?)entry.Amount, ct) ?? 0m;

  private async Task<string> NextTransferNumberAsync(CancellationToken ct)
  {
    var last = await _db.MoneyTransfers.Select(transfer => transfer.DocumentNumber)
      .OrderByDescending(number => number).FirstOrDefaultAsync(ct);
    var next = last is not null && last.StartsWith("TRF-FIN-") && int.TryParse(last[8..], out var value) ? value + 1 : 1;
    return $"TRF-FIN-{next:000000}";
  }

  private async Task<string> NextSupplierPaymentNumberAsync(CancellationToken ct)
  {
    var last = await _db.SupplierPayments.Select(payment => payment.DocumentNumber)
      .OrderByDescending(number => number).FirstOrDefaultAsync(ct);
    var next = last is not null && last.StartsWith("PAY-SUP-") && int.TryParse(last[8..], out var value) ? value + 1 : 1;
    return $"PAY-SUP-{next:000000}";
  }

  private async Task<string> NextCustomerReceiptNumberAsync(CancellationToken ct)
  {
    var last = await _db.CustomerReceipts.Select(receipt => receipt.DocumentNumber)
      .OrderByDescending(number => number).FirstOrDefaultAsync(ct);
    var next = last is not null && last.StartsWith("REC-") && int.TryParse(last[4..], out var value) ? value + 1 : 1;
    return $"REC-{next:000000}";
  }

  private async Task SaveDocumentAsync(string code, string message, CancellationToken ct)
  {
    try { await _db.SaveChangesAsync(ct); }
    catch (DbUpdateException) { throw new ConflictException(code, message); }
  }

  private async Task SaveDocumentMutationAsync(CancellationToken ct)
  {
    try { await _db.SaveChangesAsync(ct); }
    catch (DbUpdateConcurrencyException)
    {
      throw new ConflictException(ErrorCodes.Finance.DocumentNotDraft,
        "This Finance document is no longer a draft.");
    }
    catch (DbUpdateException)
    {
      throw new ConflictException(ErrorCodes.Common.ConcurrentOperation,
        "The Finance posting conflicted with another operation. Refresh and try again.");
    }
  }

  private IQueryable<MoneyAccountResponse> MoneyAccountResponseQuery(Guid userId, Guid? id = null)
  {
    var query = _db.MoneyAccounts.AsNoTracking().AsQueryable();
    if (id.HasValue)
      query = query.Where(account => account.Id == id.Value);

    return query.Select(account => new MoneyAccountResponse(
      account.Id, account.Code, account.Name, account.Type,
      account.BranchId, account.Branch.Code, account.Branch.Name,
      account.CurrencyId, account.Currency.Code,
      account.AccountingAccountId, account.AccountingAccount.Code, account.AccountingAccount.Name,
      account.LedgerEntries.Sum(entry => (decimal?)entry.Amount) ?? 0,
      account.IsActive, account.Notes, account.BankName, account.AccountNumberOrIban,
      account.AccessAssignments.Where(access => access.UserId == userId)
        .Select(access => (MoneyAccountAccessLevel?)access.AccessLevel).FirstOrDefault(),
      account.CreatedAtUtc, account.UpdatedAtUtc));
  }

  private async Task<MoneyAccountResponse> GetManagedMoneyAccountAsync(Guid id, Guid userId, CancellationToken ct) =>
    await MoneyAccountResponseQuery(userId, id).SingleOrDefaultAsync(ct) ?? throw MoneyAccountNotFound();

  private IQueryable<MoneyLedgerEntryEntity> LedgerResponseSource(Guid userId) =>
    LedgerEntryQuery()
      .Where(entry => entry.MoneyAccount.AccessAssignments.Any(access => access.UserId == userId));

  private IQueryable<MoneyLedgerEntryEntity> LedgerEntryQuery() => _db.MoneyLedgerEntries.AsNoTracking()
    .Include(entry => entry.MoneyAccount).ThenInclude(account => account.Branch)
    .Include(entry => entry.Currency)
    .Include(entry => entry.BaseCurrency)
    .Include(entry => entry.PerformedByUser);

  private static MoneyLedgerEntryResponse ToLedgerResponse(MoneyLedgerEntryEntity entry) => new(
    entry.Id, entry.MovementDate, entry.MoneyAccountId, entry.MoneyAccount.Code, entry.MoneyAccount.Name,
    entry.MoneyAccount.BranchId, entry.MoneyAccount.Branch.Name, entry.CurrencyId, entry.Currency.Code,
    entry.BaseCurrencyId, entry.BaseCurrency.Code, entry.SourceType, entry.SourceDocumentId,
    entry.DocumentNumber, entry.Amount > 0 ? entry.Amount : 0, entry.Amount < 0 ? -entry.Amount : 0,
    entry.Amount, entry.BaseAmount, entry.ExchangeRate, entry.JournalEntryId,
    entry.PerformedByUserId, entry.PerformedByUser.Username, entry.Notes, entry.PostedAtUtc);

  private IQueryable<ExchangeRateResponse> ExchangeRateResponseQuery(Guid? id = null)
  {
    var query = _db.ExchangeRates.AsNoTracking().AsQueryable();
    if (id.HasValue)
      query = query.Where(rate => rate.Id == id.Value);

    return query.Select(rate => new ExchangeRateResponse(
      rate.Id, rate.FromCurrencyId, rate.FromCurrency.Code, rate.ToCurrencyId, rate.ToCurrency.Code,
      rate.Rate, rate.EffectiveAtUtc, rate.IsActive, rate.CreatedByUserId,
      rate.CreatedByUser.Username, rate.CreatedAtUtc));
  }

  private IQueryable<MoneyTransferEntity> MoneyTransferQuery() => _db.MoneyTransfers.AsNoTracking()
    .Include(transfer => transfer.SourceMoneyAccount)
    .Include(transfer => transfer.DestinationMoneyAccount)
    .Include(transfer => transfer.Currency)
    .Include(transfer => transfer.BaseCurrency)
    .Include(transfer => transfer.CreatedByUser);

  private static MoneyTransferResponse ToMoneyTransferResponse(MoneyTransferEntity transfer) => new(
    transfer.Id, transfer.DocumentNumber, transfer.TransferDate,
    transfer.SourceMoneyAccountId, transfer.SourceMoneyAccount.Code, transfer.SourceMoneyAccount.Name,
    transfer.DestinationMoneyAccountId, transfer.DestinationMoneyAccount.Code, transfer.DestinationMoneyAccount.Name,
    transfer.CurrencyId, transfer.Currency.Code, transfer.BaseCurrencyId, transfer.BaseCurrency.Code,
    transfer.Amount, transfer.ExchangeRate, transfer.BaseAmount, transfer.Status, transfer.Notes,
    transfer.CreatedByUserId, transfer.CreatedByUser.Username, transfer.CreatedAtUtc, transfer.UpdatedAtUtc,
    transfer.PostedAtUtc, transfer.JournalEntryId);

  private IQueryable<SupplierPaymentEntity> SupplierPaymentSource() => _db.SupplierPayments.AsNoTracking()
    .Include(payment => payment.Supplier)
    .Include(payment => payment.MoneyAccount)
    .Include(payment => payment.Currency)
    .Include(payment => payment.BaseCurrency)
    .Include(payment => payment.CreatedByUser)
    .Include(payment => payment.Allocations).ThenInclude(allocation => allocation.PurchaseInvoice);

  private static SupplierPaymentResponse ToSupplierPaymentResponse(SupplierPaymentEntity payment) => new(
    payment.Id, payment.DocumentNumber, payment.SupplierId, payment.Supplier.Name, payment.PaymentDate,
    payment.MoneyAccountId, payment.MoneyAccount.Code, payment.MoneyAccount.Name,
    payment.CurrencyId, payment.Currency.Code, payment.BaseCurrencyId, payment.BaseCurrency.Code,
    payment.ExchangeRate, payment.TotalAmount, payment.BaseTotalAmount, payment.Status, payment.Notes,
    payment.CreatedByUserId, payment.CreatedByUser.Username, payment.CreatedAtUtc, payment.UpdatedAtUtc,
    payment.PostedAtUtc, payment.JournalEntryId,
    payment.Allocations.OrderBy(allocation => allocation.PurchaseInvoice.DocumentNumber)
      .Select(allocation => new SupplierPaymentAllocationResponse(allocation.Id, allocation.PurchaseInvoiceId,
        allocation.PurchaseInvoice.DocumentNumber, allocation.Amount, allocation.BaseAmount)).ToList());

  private IQueryable<CustomerReceiptEntity> CustomerReceiptSource() => _db.CustomerReceipts.AsNoTracking()
    .Include(receipt => receipt.Customer)
    .Include(receipt => receipt.MoneyAccount).ThenInclude(account => account.Branch)
    .Include(receipt => receipt.Currency)
    .Include(receipt => receipt.BaseCurrency)
    .Include(receipt => receipt.CreatedByUser)
    .Include(receipt => receipt.Allocations).ThenInclude(allocation => allocation.SalesInvoice);

  private static CustomerReceiptResponse ToCustomerReceiptResponse(
    CustomerReceiptEntity receipt,
    Guid? moneyLedgerEntryId) => new(
    receipt.Id, receipt.DocumentNumber, receipt.CustomerId, receipt.Customer.Name, receipt.ReceiptDate,
    receipt.MoneyAccountId, receipt.MoneyAccount.Code, receipt.MoneyAccount.Name,
    receipt.MoneyAccount.BranchId, receipt.MoneyAccount.Branch.Name,
    receipt.CurrencyId, receipt.Currency.Code, receipt.BaseCurrencyId, receipt.BaseCurrency.Code,
    receipt.ExchangeRate, receipt.TotalAmount, receipt.BaseTotalAmount, receipt.Status, receipt.Notes,
    receipt.CreatedByUserId, receipt.CreatedByUser.Username, receipt.CreatedAtUtc, receipt.UpdatedAtUtc,
    receipt.PostedAtUtc, receipt.JournalEntryId, moneyLedgerEntryId,
    receipt.Allocations.OrderBy(allocation => allocation.SalesInvoice.DocumentNumber)
      .Select(allocation => new CustomerReceiptAllocationResponse(
        allocation.Id, allocation.SalesInvoiceId, allocation.SalesInvoice.DocumentNumber,
        allocation.SalesInvoice.InvoiceDate, allocation.SalesInvoice.Total,
        allocation.Amount, allocation.BaseAmount)).ToList());

  private void ReplaceAllocations(
    SupplierPaymentEntity payment,
    List<SupplierPaymentAllocationRequest> requests,
    IReadOnlyDictionary<Guid, PurchaseInvoiceEntity> invoices)
  {
    foreach (var existing in payment.Allocations.ToList()) _db.SupplierPaymentAllocations.Remove(existing);
    payment.Allocations.Clear();
    foreach (var request in requests)
    {
      var allocation = new SupplierPaymentAllocationEntity
      {
        PurchaseInvoiceId = request.PurchaseInvoiceId,
        Amount = Money(request.Amount),
        BaseAmount = Money(request.Amount * invoices[request.PurchaseInvoiceId].ExchangeRate)
      };
      payment.Allocations.Add(allocation);
    }
  }

  private void ReplaceCustomerReceiptAllocations(
    CustomerReceiptEntity receipt,
    List<CustomerReceiptAllocationRequest> requests,
    IReadOnlyDictionary<Guid, SalesInvoiceEntity> invoices)
  {
    var retained = new HashSet<CustomerReceiptAllocationEntity>();
    foreach (var request in requests)
    {
      var allocation = receipt.Allocations.SingleOrDefault(existing =>
        existing.SalesInvoiceId == request.SalesInvoiceId && !retained.Contains(existing));
      allocation ??= receipt.Allocations.FirstOrDefault(existing => !retained.Contains(existing));
      if (allocation is null)
      {
        allocation = new CustomerReceiptAllocationEntity();
        receipt.Allocations.Add(allocation);
      }
      allocation.SalesInvoiceId = request.SalesInvoiceId;
      allocation.Amount = Money(request.Amount);
      allocation.BaseAmount = Money(request.Amount * invoices[request.SalesInvoiceId].ExchangeRate);
      retained.Add(allocation);
    }
    foreach (var removed in receipt.Allocations.Where(allocation => !retained.Contains(allocation)).ToList())
      _db.CustomerReceiptAllocations.Remove(removed);
  }

  private static void ApplyTransfer(
    MoneyTransferEntity transfer,
    MoneyTransferDraftRequest request,
    TransferValidation validation)
  {
    transfer.TransferDate = request.TransferDate;
    transfer.SourceMoneyAccountId = request.SourceMoneyAccountId;
    transfer.DestinationMoneyAccountId = request.DestinationMoneyAccountId;
    transfer.CurrencyId = validation.CurrencyId;
    transfer.BaseCurrencyId = validation.BaseCurrencyId;
    transfer.Amount = Money(request.Amount);
    transfer.ExchangeRate = validation.ExchangeRate;
    transfer.BaseAmount = validation.BaseAmount;
    transfer.Notes = Trim(request.Notes);
  }

  private static void ApplySupplierPayment(
    SupplierPaymentEntity payment,
    SupplierPaymentDraftRequest request,
    SupplierPaymentValidation validation)
  {
    payment.SupplierId = request.SupplierId;
    payment.PaymentDate = request.PaymentDate;
    payment.MoneyAccountId = request.MoneyAccountId;
    payment.CurrencyId = validation.Account.CurrencyId;
    payment.BaseCurrencyId = validation.BaseCurrencyId;
    payment.ExchangeRate = validation.ExchangeRate;
    payment.TotalAmount = Money(request.TotalAmount);
    payment.BaseTotalAmount = Money(request.TotalAmount * validation.ExchangeRate);
    payment.Notes = Trim(request.Notes);
  }

  private static void ApplyCustomerReceipt(
    CustomerReceiptEntity receipt,
    CustomerReceiptDraftRequest request,
    CustomerReceiptValidation validation)
  {
    receipt.CustomerId = request.CustomerId;
    receipt.ReceiptDate = request.ReceiptDate;
    receipt.MoneyAccountId = request.MoneyAccountId;
    receipt.CurrencyId = validation.Account.CurrencyId;
    receipt.BaseCurrencyId = validation.BaseCurrencyId;
    receipt.ExchangeRate = validation.ExchangeRate;
    receipt.TotalAmount = Money(request.TotalAmount);
    receipt.BaseTotalAmount = Money(request.TotalAmount * validation.ExchangeRate);
    receipt.Notes = Trim(request.Notes);
  }

  private static JournalLineEntity JournalLine(
    Guid accountId,
    Guid currencyId,
    decimal rate,
    decimal originalDebit,
    decimal originalCredit,
    decimal debitBase,
    decimal creditBase,
    string description) => new()
    {
      AccountId = accountId,
      CurrencyId = currencyId,
      ExchangeRate = rate,
      OriginalDebitAmount = originalDebit,
      OriginalCreditAmount = originalCredit,
      DebitBaseAmount = debitBase,
      CreditBaseAmount = creditBase,
      Description = description
    };

  internal static MoneyLedgerEntryEntity LedgerEntry(
    MoneyAccountEntity account,
    DateOnly date,
    MoneyLedgerSourceType sourceType,
    Guid sourceDocumentId,
    string documentNumber,
    decimal amount,
    decimal baseAmount,
    Guid baseCurrencyId,
    decimal rate,
    Guid journalId,
    Guid userId,
    string? notes,
    DateTime postedAt) => new()
    {
      MoneyAccountId = account.Id,
      MovementDate = date,
      SourceType = sourceType,
      SourceDocumentId = sourceDocumentId,
      DocumentNumber = documentNumber,
      Amount = amount,
      BaseAmount = baseAmount,
      CurrencyId = account.CurrencyId,
      BaseCurrencyId = baseCurrencyId,
      ExchangeRate = rate,
      JournalEntryId = journalId,
      PerformedByUserId = userId,
      Notes = Trim(notes),
      PostedAtUtc = postedAt
    };

  private static void ValidateTransferAccounts(MoneyAccountEntity source, MoneyAccountEntity destination)
  {
    if (source.CurrencyId != destination.CurrencyId)
      throw new BadRequestException(ErrorCodes.Finance.TransferCurrencyMismatch,
        "Normal Money Transfers require source and destination accounts in the same currency.");
    if (source.BranchId != destination.BranchId)
      throw new BadRequestException(ErrorCodes.Finance.TransferBranchMismatch,
        "The minimum Finance workflow supports transfers within one branch only.");
  }

  internal static void EnsureActive(MoneyAccountEntity account)
  {
    if (!account.IsActive)
      throw new BadRequestException(ErrorCodes.Finance.MoneyAccountInactive,
        $"Money Account '{account.Code}' is inactive and cannot be used for new postings.");
    if (!account.AccountingAccount.IsActive || account.AccountingAccount.IsGroup
      || account.AccountingAccount.Classification != AccountClassification.Asset)
      throw new BadRequestException(ErrorCodes.Finance.AccountMappingInvalid,
        $"Money Account '{account.Code}' is not linked to an active posting Asset account.");
  }

  private static void EnsureDraft(FinanceDocumentStatus status, string document)
  {
    if (status != FinanceDocumentStatus.Draft)
      throw new ConflictException(ErrorCodes.Finance.DocumentNotDraft, $"Posted {document} documents are immutable.");
  }

  private static void ValidateMoneyAccountType(MoneyAccountType type)
  {
    if (!Enum.IsDefined(type))
      throw new BadRequestException(ErrorCodes.Finance.MoneyAccountTypeInvalid, "Select Cashbox or Bank.");
  }

  private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();
  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);

  private static NotFoundException MoneyAccountNotFound() => new(
    ErrorCodes.Finance.MoneyAccountNotFound, "Money Account not found.");
  private static NotFoundException MoneyTransferNotFound() => new(
    ErrorCodes.Finance.MoneyTransferNotFound, "Money Transfer not found.");
  private static NotFoundException SupplierPaymentNotFound() => new(
    ErrorCodes.Finance.SupplierPaymentNotFound, "Supplier Payment not found.");
  private static NotFoundException CustomerReceiptNotFound() => new(
    ErrorCodes.Finance.CustomerReceiptNotFound, "Customer Receipt not found.");

  private sealed record TransferValidation(
    Guid CurrencyId,
    Guid BaseCurrencyId,
    decimal ExchangeRate,
    decimal BaseAmount);

  private sealed record SupplierPaymentValidation(
    MoneyAccountEntity Account,
    string SupplierName,
    Guid BaseCurrencyId,
    decimal ExchangeRate,
    IReadOnlyDictionary<Guid, PurchaseInvoiceEntity> Invoices);

  private sealed record CustomerReceiptValidation(
    MoneyAccountEntity Account,
    string CustomerName,
    Guid BaseCurrencyId,
    decimal ExchangeRate,
    IReadOnlyDictionary<Guid, SalesInvoiceEntity> Invoices);
}
