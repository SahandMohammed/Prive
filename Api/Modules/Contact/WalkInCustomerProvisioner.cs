using Api.Modules.Branch;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Contact;

public sealed class WalkInCustomerProvisioner
{
  private readonly AppDbContext _db;

  public WalkInCustomerProvisioner(AppDbContext db) => _db = db;

  public async Task<ContactEntity> EnsureSharedAsync(CancellationToken ct = default)
  {
    var existing = await _db.Contacts.IgnoreQueryFilters().SingleOrDefaultAsync(contact =>
      contact.CatalogBranchId == null && contact.SystemRole == ContactSystemRole.WalkInCustomer, ct);
    if (existing is not null) return existing;
    var contact = Create(null);
    _db.Contacts.Add(contact);
    await _db.SaveChangesAsync(ct);
    return contact;
  }

  public async Task<ContactEntity> EnsureForBranchAsync(BranchEntity branch, CancellationToken ct = default)
  {
    if (branch.CatalogMode == BranchCatalogMode.Shared) return await EnsureSharedAsync(ct);
    var existing = await _db.Contacts.IgnoreQueryFilters().SingleOrDefaultAsync(contact =>
      contact.CatalogBranchId == branch.Id && contact.SystemRole == ContactSystemRole.WalkInCustomer, ct);
    if (existing is not null) return existing;
    var contact = Create(branch.Id);
    _db.Contacts.Add(contact);
    await _db.SaveChangesAsync(ct);
    return contact;
  }

  private static ContactEntity Create(Guid? catalogBranchId) => new()
  {
    CatalogBranchId = catalogBranchId,
    Name = "Walk-in Customer",
    Kind = ContactKind.Individual,
    IsCustomer = true,
    IsSupplier = false,
    SystemRole = ContactSystemRole.WalkInCustomer,
    Notes = "Protected system customer used for anonymous paid POS checkouts.",
    IsActive = true
  };
}
