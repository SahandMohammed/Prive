namespace Api.Modules.Branch;

public sealed class BranchEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
  public string? PhoneNumber { get; set; }
  public string? Email { get; set; }
  public string Address { get; set; } = string.Empty;
  public string City { get; set; } = string.Empty;
  public string Region { get; set; } = string.Empty;
  public string Country { get; set; } = string.Empty;
  public BranchCatalogMode CatalogMode { get; set; } = BranchCatalogMode.Shared;
  public bool IsMainBranch { get; set; }
  public bool IsActive { get; set; } = true;
}

[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
public enum BranchCatalogMode { Shared, Separate }
