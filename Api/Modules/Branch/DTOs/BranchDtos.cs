using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Branch;

public sealed class BranchListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public bool? IsActive { get; init; }
}

public sealed record UpdateBranchAccessRequest([Required] Guid[] BranchIds);

public sealed record BranchResponse(
  Guid Id,
  string Code,
  string Name,
  string? PhoneNumber,
  string? Email,
  string Address,
  string City,
  string Region,
  string Country,
  bool IsMainBranch,
  bool IsActive,
  BranchCatalogMode CatalogMode = BranchCatalogMode.Shared);

public sealed record CreateBranchRequest(
  [Required, MaxLength(20)] string Code,
  [Required, MaxLength(200)] string Name,
  [MaxLength(50)] string? PhoneNumber,
  [EmailAddress, MaxLength(254)] string? Email,
  [Required, MaxLength(500)] string Address,
  [Required, MaxLength(100)] string City,
  [Required, MaxLength(100)] string Region,
  [Required, MaxLength(100)] string Country,
  bool IsMainBranch,
  bool IsActive = true,
  [EnumDataType(typeof(BranchCatalogMode))] BranchCatalogMode CatalogMode = BranchCatalogMode.Shared);

public sealed record UpdateBranchRequest(
  [Required, MaxLength(20)] string Code,
  [Required, MaxLength(200)] string Name,
  [MaxLength(50)] string? PhoneNumber,
  [EmailAddress, MaxLength(254)] string? Email,
  [Required, MaxLength(500)] string Address,
  [Required, MaxLength(100)] string City,
  [Required, MaxLength(100)] string Region,
  [Required, MaxLength(100)] string Country,
  bool IsMainBranch,
  bool IsActive,
  BranchCatalogMode CatalogMode = BranchCatalogMode.Shared);
