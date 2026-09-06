namespace Api.Shared.Persistence;

// Null denotes the shared business catalog; a branch ID denotes its private catalog.
public interface IBranchCatalogEntity
{
  Guid? CatalogBranchId { get; set; }
}
