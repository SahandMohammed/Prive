using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Professional;

public sealed class ProfessionalListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public bool? IsActive { get; init; }
  public Guid? BranchId { get; init; }
}

public sealed class ProfessionalUserOptionsQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? ProfessionalId { get; init; }
}

public sealed record ProfessionalBranchResponse(Guid Id, string Code, string Name);

public sealed record ProfessionalLinkedUserResponse(Guid Id, string Username, bool IsActive);

public sealed record ProfessionalUserOptionResponse(Guid Id, string Username, bool IsActive);

public sealed record ProfessionalResponse(
  Guid Id,
  string Name,
  string? PhoneNumber,
  string? Email,
  string? Notes,
  bool IsActive,
  List<ProfessionalBranchResponse> Branches,
  ProfessionalLinkedUserResponse? LinkedUser);

public sealed record CreateProfessionalRequest(
  [Required, MaxLength(200)] string Name,
  [MaxLength(50)] string? PhoneNumber,
  [EmailAddress, MaxLength(254)] string? Email,
  [MaxLength(2000)] string? Notes,
  [Required] Guid[] BranchIds,
  Guid? LinkedUserId,
  bool IsActive = true);

public sealed record UpdateProfessionalRequest(
  [Required, MaxLength(200)] string Name,
  [MaxLength(50)] string? PhoneNumber,
  [EmailAddress, MaxLength(254)] string? Email,
  [MaxLength(2000)] string? Notes,
  [Required] Guid[] BranchIds,
  Guid? LinkedUserId,
  bool IsActive);
