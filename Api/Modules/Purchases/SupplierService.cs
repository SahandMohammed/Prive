using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Purchases;

public interface ISupplierService
{
  Task<List<SupplierDto>> GetSuppliersAsync(CancellationToken ct = default);
  Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, CancellationToken ct = default);
}

public sealed class SupplierService(AppDbContext db) : ISupplierService
{
  public async Task<List<SupplierDto>> GetSuppliersAsync(CancellationToken ct = default)
  {
    var suppliers = await db.Contacts
      .AsNoTracking()
      .Where(contact => contact.Type == ContactType.Vendor)
      .OrderBy(contact => contact.Name)
      .ToListAsync(ct);

    return suppliers.Select(MapToDto).ToList();
  }

  public async Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, CancellationToken ct = default)
  {
    var name = request.Name.Trim();
    var accountsPayable = await GetOrCreateAccountsPayableAsync(ct);
    var account = new AccountEntity
    {
      Code = await GetNextSupplierAccountCodeAsync(accountsPayable, ct),
      Name = $"{name} (Vendor) Account",
      Category = AccountCategory.Liability,
      ParentAccountId = accountsPayable.Id,
      IsLeaf = true,
    };

    var supplier = new ContactEntity
    {
      Name = name,
      Type = ContactType.Vendor,
      PhoneNumber = Normalize(request.PhoneNumber),
      Email = Normalize(request.Email),
      Address = Normalize(request.Address),
      Description = Normalize(request.Description),
      OpeningBalance = request.OpeningBalance,
      AccountId = account.Id,
    };

    db.Accounts.Add(account);
    db.Contacts.Add(supplier);

    if (request.OpeningBalance > 0)
    {
      var baseCurrency = await db.Currencies.SingleOrDefaultAsync(currency => currency.IsBaseCurrency, ct)
        ?? throw new BadRequestException(
          ErrorCodes.Finance.CurrencyNotFound,
          "A base currency must be configured before recording a supplier opening balance.");
      var openingBalanceEquity = await GetOrCreateOpeningBalanceEquityAsync(ct);
      db.JournalEntries.Add(new JournalEntryEntity
      {
        EntryDateUtc = DateTime.UtcNow,
        ReferenceType = "SupplierOpeningBalance",
        ReferenceId = supplier.Id,
        Description = $"Opening balance - {supplier.Name}",
        Lines =
        {
          new JournalEntryLineEntity
          {
            AccountId = openingBalanceEquity.Id,
            Debit = request.OpeningBalance,
            Credit = 0,
            CurrencyId = baseCurrency.Id,
            ExchangeRate = baseCurrency.ExchangeRate,
            BaseDebit = request.OpeningBalance * baseCurrency.ExchangeRate,
          },
          new JournalEntryLineEntity
          {
            AccountId = account.Id,
            Debit = 0,
            Credit = request.OpeningBalance,
            CurrencyId = baseCurrency.Id,
            ExchangeRate = baseCurrency.ExchangeRate,
            BaseCredit = request.OpeningBalance * baseCurrency.ExchangeRate,
          },
        },
      });
    }

    await db.SaveChangesAsync(ct);
    return MapToDto(supplier);
  }

  private async Task<AccountEntity> GetOrCreateAccountsPayableAsync(CancellationToken ct)
  {
    var accountsPayable = await db.Accounts.SingleOrDefaultAsync(account => account.Code == "2100", ct);
    if (accountsPayable is not null) return accountsPayable;

    var liabilities = await db.Accounts.SingleOrDefaultAsync(account => account.Code == "2000", ct);
    if (liabilities is null)
    {
      liabilities = new AccountEntity { Code = "2000", Name = "Liabilities", Category = AccountCategory.Liability, IsLeaf = false };
      db.Accounts.Add(liabilities);
    }

    accountsPayable = new AccountEntity
    {
      Code = "2100",
      Name = "Accounts Payable",
      Category = AccountCategory.Liability,
      ParentAccountId = liabilities.Id,
      IsLeaf = false,
    };
    db.Accounts.Add(accountsPayable);
    return accountsPayable;
  }

  private async Task<string> GetNextSupplierAccountCodeAsync(AccountEntity accountsPayable, CancellationToken ct)
  {
    var childCount = await db.Accounts.CountAsync(account => account.ParentAccountId == accountsPayable.Id, ct);
    return $"{accountsPayable.Code}.{childCount + 1}";
  }

  private async Task<AccountEntity> GetOrCreateOpeningBalanceEquityAsync(CancellationToken ct)
  {
    var equity = await db.Accounts.SingleOrDefaultAsync(account => account.Code == "3001", ct);
    if (equity is not null) return equity;

    var equityRoot = await db.Accounts.SingleOrDefaultAsync(account => account.Code == "3000", ct);
    if (equityRoot is null)
    {
      equityRoot = new AccountEntity { Code = "3000", Name = "Equity", Category = AccountCategory.Equity, IsLeaf = false };
      db.Accounts.Add(equityRoot);
    }

    equity = new AccountEntity
    {
      Code = "3001",
      Name = "Opening Balance Equity",
      Category = AccountCategory.Equity,
      ParentAccountId = equityRoot.Id,
      IsLeaf = true,
    };
    db.Accounts.Add(equity);
    return equity;
  }

  private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private static SupplierDto MapToDto(ContactEntity supplier) => new(
    supplier.Id,
    supplier.Name,
    supplier.PhoneNumber,
    supplier.Email,
    supplier.Address,
    supplier.Description,
    supplier.OpeningBalance,
    supplier.AccountId,
    supplier.IsActive,
    supplier.CreatedAtUtc);
}
