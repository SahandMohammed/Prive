namespace Api.Modules.Contact;

public sealed class ContactEntity : Api.Shared.Persistence.IBranchCatalogEntity
{
  public Guid? CatalogBranchId { get; set; }
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public ContactKind Kind { get; set; } = ContactKind.Individual;
  public bool IsCustomer { get; set; }
  public bool IsSupplier { get; set; }
  public string? PrimaryPhoneNumber { get; set; }
  public string? PrimaryPhoneNormalized { get; set; }
  public string? SecondaryPhoneNumber { get; set; }
  public string? SecondaryPhoneNormalized { get; set; }
  public string? Email { get; set; }
  public string? Address { get; set; }
  public string? City { get; set; }
  public string? Region { get; set; }
  public string? Country { get; set; }
  public string? Notes { get; set; }
  public bool IsActive { get; set; } = true;
}

public enum ContactKind
{
  Individual = 0,
  Business = 1
}

public enum ContactRole
{
  Customer = 0,
  Supplier = 1,
  Both = 2
}
