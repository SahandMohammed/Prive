using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Modules.Settings;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Purchases;

public interface ISupplierService
{
  Task<PagedResult<SupplierDto>> GetSuppliersAsync(SupplierListQuery query, CancellationToken ct = default);
  Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, CancellationToken ct = default);
}

public sealed class SupplierService(AppDbContext db, IPostingSettingsProvider postingSettings) : ISupplierService
{
  public async Task<PagedResult<SupplierDto>> GetSuppliersAsync(SupplierListQuery request, CancellationToken ct = default)
  {
    var query = db.Contacts.AsNoTracking().Where(contact => contact.Type == ContactType.Vendor).AsQueryable();

    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(supplier =>
        supplier.Name.ToLower().Contains(search) ||
        (supplier.PhoneNumber != null && supplier.PhoneNumber.ToLower().Contains(search)) ||
        (supplier.Email != null && supplier.Email.ToLower().Contains(search)) ||
        (supplier.Address != null && supplier.Address.ToLower().Contains(search)));
    }

    query = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase)
      ? query.OrderByDescending(contact => contact.Name).ThenByDescending(contact => contact.Id)
      : query.OrderBy(contact => contact.Name).ThenBy(contact => contact.Id);

    var page = await query.ToPagedResultAsync(request, ct);
    var settings = await postingSettings.GetRequiredAsync(ct);
    var contactIds = page.Items.Select(contact => contact.Id).ToArray();
    var openingBalances = await db.AccountTransactions
      .AsNoTracking()
      .Where(transaction =>
        transaction.AccountId == settings.DefaultPayableAccountId &&
        transaction.SourceType == AccountTransactionSourceType.OpeningBalance &&
        transaction.ContactId.HasValue &&
        contactIds.Contains(transaction.ContactId.Value))
      .GroupBy(transaction => transaction.ContactId!.Value)
      .Select(group => new { ContactId = group.Key, Amount = group.Sum(transaction => transaction.BaseAmount) })
      .ToDictionaryAsync(row => row.ContactId, row => row.Amount, ct);

    var suppliers = page.Items
      .Select(supplier => MapToDto(supplier, openingBalances.GetValueOrDefault(supplier.Id), settings.DefaultPayableAccountId))
      .ToList();
    return new PagedResult<SupplierDto>(suppliers, page.TotalCount, page.Page, page.PageSize);
  }

  public async Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, CancellationToken ct = default)
  {
    var settings = await postingSettings.GetRequiredAsync(ct);
    var supplier = new ContactEntity
    {
      Name = request.Name.Trim(),
      Type = ContactType.Vendor,
      PhoneNumber = Normalize(request.PhoneNumber),
      Email = Normalize(request.Email),
      Address = Normalize(request.Address),
      Description = Normalize(request.Description)
    };
    db.Contacts.Add(supplier);

    if (request.OpeningBalance > 0)
    {
      db.AccountTransactions.Add(new AccountTransactionEntity
      {
        AccountId = settings.DefaultPayableAccountId,
        ContactId = supplier.Id,
        CurrencyId = settings.BaseCurrencyId,
        Amount = request.OpeningBalance,
        BaseAmount = request.OpeningBalance,
        TransactionDateUtc = DateTime.UtcNow,
        SourceType = AccountTransactionSourceType.OpeningBalance,
        SourceId = supplier.Id,
        Description = $"Opening balance - {supplier.Name}"
      });
    }

    await db.SaveChangesAsync(ct);
    return MapToDto(supplier, request.OpeningBalance, settings.DefaultPayableAccountId);
  }

  private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  // OpeningBalance is retained in this API response for compatibility, but it is
  // calculated from opening-balance ledger movements and is not stored on Contact.
  // AccountId is the shared Vendor Payables account, not a per-contact account.
  private static SupplierDto MapToDto(ContactEntity supplier, decimal openingBalance, Guid payableAccountId) => new(
    supplier.Id,
    supplier.Name,
    supplier.PhoneNumber,
    supplier.Email,
    supplier.Address,
    supplier.Description,
    openingBalance,
    payableAccountId,
    supplier.IsActive,
    supplier.CreatedAtUtc);
}
