namespace Api.Modules.Finance;

public sealed class ContactEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public ContactType Type { get; set; } // Customer, Vendor
  public string? PhoneNumber { get; set; }
  public string? Email { get; set; }
  public string? Address { get; set; }
  public string? Description { get; set; }
  public decimal OpeningBalance { get; set; }
  
  // Dynamically linked to A/R (Asset) for Customers or A/P (Liability) for Vendors
  public Guid AccountId { get; set; }
  public AccountEntity? Account { get; set; }
  
  public bool IsActive { get; set; } = true;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
