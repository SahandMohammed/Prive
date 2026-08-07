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
  public string? Notes { get; set; }

  public bool IsActive { get; set; } = true;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public static class ContactPostingRules
{
  public static bool IsActiveCustomer(ContactEntity? contact) =>
    contact is { IsActive: true, Type: ContactType.Customer or ContactType.CustomerAndVendor };

  public static bool IsActiveVendor(ContactEntity? contact) =>
    contact is { IsActive: true, Type: ContactType.Vendor or ContactType.CustomerAndVendor };
}
