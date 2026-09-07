namespace Api.Shared.Persistence;

// Set only after the authenticated user's branch access has been checked.
public sealed class BranchContext
{
  public Guid? BranchId { get; set; }
  public Guid? CatalogBranchId { get; set; }
}
