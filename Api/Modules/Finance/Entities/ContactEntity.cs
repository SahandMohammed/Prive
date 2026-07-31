namespace Api.Modules.Finance;

public sealed class ContactEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public ContactType Type { get; set; } // Customer, Vendor
  
  // Dynamically linked to A/R (Asset) for Customers or A/P (Liability) for Vendors
  public Guid AccountId { get; set; }
  public AccountEntity? Account { get; set; }
  
  public bool IsActive { get; set; } = true;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
