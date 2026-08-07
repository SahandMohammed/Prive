using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Finance;

public interface IFinanceService
{
  Task<List<CurrencyEntity>> GetCurrenciesAsync(CancellationToken ct = default);
  Task<CurrencyEntity> CreateCurrencyAsync(string code, string name, string symbol, decimal exchangeRate, bool isBaseCurrency, CancellationToken ct = default);
  Task<List<AccountEntity>> GetAccountsAsync(CancellationToken ct = default);
  Task<AccountEntity> CreateAccountAsync(string code, string name, AccountCategory category, AccountType type, Guid? parentAccountId, Guid? currencyId, CancellationToken ct = default);
  Task SeedBaseAccountsAsync(CancellationToken ct = default);
  Task<List<ContactEntity>> GetContactsAsync(ContactType? type = null, CancellationToken ct = default);
  Task<ContactEntity> CreateContactAsync(string name, ContactType type, CancellationToken ct = default);
  Task<PagedResult<AccountTransactionEntity>> GetAccountTransactionsAsync(AccountTransactionListQuery query, CancellationToken ct = default);
}

public sealed class FinanceService(AppDbContext db) : IFinanceService
{
  public Task<List<CurrencyEntity>> GetCurrenciesAsync(CancellationToken ct = default) =>
    db.Currencies.AsNoTracking().OrderBy(currency => currency.Code).ToListAsync(ct);

  public async Task<CurrencyEntity> CreateCurrencyAsync(string code, string name, string symbol, decimal exchangeRate, bool isBaseCurrency, CancellationToken ct = default)
  {
    if (isBaseCurrency && exchangeRate != 1m)
    {
      throw new BadRequestException(
        ErrorCodes.Settings.InvalidBaseCurrency,
        "The base currency exchange rate must be 1.");
    }

    if (isBaseCurrency)
    {
      var currentBases = await db.Currencies.Where(currency => currency.IsBaseCurrency).ToListAsync(ct);
      foreach (var currentBase in currentBases) currentBase.IsBaseCurrency = false;
    }

    var currency = new CurrencyEntity
    {
      Code = code.Trim().ToUpperInvariant(),
      Name = name.Trim(),
      Symbol = symbol.Trim(),
      ExchangeRate = exchangeRate,
      IsBaseCurrency = isBaseCurrency
    };

    db.Currencies.Add(currency);
    await db.SaveChangesAsync(ct);
    return currency;
  }

  public Task<List<AccountEntity>> GetAccountsAsync(CancellationToken ct = default) =>
    db.Accounts.AsNoTracking().Include(account => account.Currency).OrderBy(account => account.Code).ToListAsync(ct);

  public async Task<AccountEntity> CreateAccountAsync(string code, string name, AccountCategory category, AccountType type, Guid? parentAccountId, Guid? currencyId, CancellationToken ct = default)
  {
    if (parentAccountId.HasValue)
    {
      var parent = await db.Accounts.FindAsync([parentAccountId.Value], ct)
        ?? throw new NotFoundException(ErrorCodes.Finance.AccountNotFound, "Parent account not found.");
      parent.IsLeaf = false;
    }

    var account = new AccountEntity
    {
      Code = code.Trim(),
      Name = name.Trim(),
      Category = category,
      Type = type,
      ParentAccountId = parentAccountId,
      CurrencyId = currencyId,
      IsLeaf = true
    };

    db.Accounts.Add(account);
    await db.SaveChangesAsync(ct);
    return account;
  }

  public async Task SeedBaseAccountsAsync(CancellationToken ct = default)
  {
    if (await db.Accounts.AnyAsync(ct)) return;

    var assets = NewAccount("1000", "Assets", AccountCategory.Asset, AccountType.General, false);
    var liabilities = NewAccount("2000", "Liabilities", AccountCategory.Liability, AccountType.General, false);
    var revenue = NewAccount("4000", "Revenue", AccountCategory.Revenue, AccountType.General, false);
    var expenses = NewAccount("5000", "Expenses", AccountCategory.Expense, AccountType.General, false);
    db.Accounts.AddRange(assets, liabilities, revenue, expenses);

    db.Accounts.AddRange(
      NewAccount("1100", "Cash", AccountCategory.Asset, AccountType.Cash, true, assets.Id),
      NewAccount("1110", "Bank", AccountCategory.Asset, AccountType.Bank, true, assets.Id),
      NewAccount("1200", "Customer Receivables", AccountCategory.Asset, AccountType.Receivable, true, assets.Id),
      NewAccount("1300", "Inventory", AccountCategory.Asset, AccountType.Inventory, true, assets.Id),
      NewAccount("2100", "Vendor Payables", AccountCategory.Liability, AccountType.Payable, true, liabilities.Id),
      NewAccount("4100", "Sales Income", AccountCategory.Revenue, AccountType.Income, true, revenue.Id),
      NewAccount("5100", "Purchase Expense", AccountCategory.Expense, AccountType.Expense, true, expenses.Id),
      NewAccount("5200", "General Expense", AccountCategory.Expense, AccountType.Expense, true, expenses.Id));

    await db.SaveChangesAsync(ct);
  }

  public Task<List<ContactEntity>> GetContactsAsync(ContactType? type = null, CancellationToken ct = default)
  {
    var query = db.Contacts.AsNoTracking().AsQueryable();
    if (type.HasValue) query = query.Where(contact => contact.Type == type.Value);
    return query.OrderBy(contact => contact.Name).ToListAsync(ct);
  }

  public async Task<ContactEntity> CreateContactAsync(string name, ContactType type, CancellationToken ct = default)
  {
    var contact = new ContactEntity { Name = name.Trim(), Type = type };
    db.Contacts.Add(contact);
    await db.SaveChangesAsync(ct);
    return contact;
  }

  public async Task<PagedResult<AccountTransactionEntity>> GetAccountTransactionsAsync(AccountTransactionListQuery request, CancellationToken ct = default)
  {
    var query = db.AccountTransactions
      .AsNoTracking()
      .Include(transaction => transaction.Account)
      .Include(transaction => transaction.Contact)
      .AsQueryable();

    if (request.AccountId.HasValue) query = query.Where(transaction => transaction.AccountId == request.AccountId);
    if (request.ContactId.HasValue) query = query.Where(transaction => transaction.ContactId == request.ContactId);
    if (request.SourceType.HasValue) query = query.Where(transaction => transaction.SourceType == request.SourceType);
    if (request.StartDate.HasValue) query = query.Where(transaction => transaction.TransactionDateUtc >= request.StartDate.Value.ToUniversalTime());
    if (request.EndDate.HasValue) query = query.Where(transaction => transaction.TransactionDateUtc <= request.EndDate.Value.ToUniversalTime());

    return await query
      .OrderByDescending(transaction => transaction.TransactionDateUtc)
      .ThenByDescending(transaction => transaction.Id)
      .ToPagedResultAsync(request, ct);
  }

  private static AccountEntity NewAccount(string code, string name, AccountCategory category, AccountType type, bool isLeaf, Guid? parentId = null) => new()
  {
    Code = code,
    Name = name,
    Category = category,
    Type = type,
    IsLeaf = isLeaf,
    ParentAccountId = parentId
  };
}

public sealed class AccountTransactionListQuery : PaginationRequest
{
  public Guid? AccountId { get; init; }
  public Guid? ContactId { get; init; }
  public AccountTransactionSourceType? SourceType { get; init; }
  public DateTime? StartDate { get; init; }
  public DateTime? EndDate { get; init; }
}
