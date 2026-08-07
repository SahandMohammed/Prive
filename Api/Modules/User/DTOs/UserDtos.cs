using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.User;

public sealed class UserListQuery : PaginationRequest
{
  public string? Search { get; init; }
}

public sealed record UserResponse(
  Guid Id,
  string Username,
  UserRole Role,
  Guid? LinkedProfessionalId,
  bool IsActive,
  bool MustChangePassword,
  DateTime? LastLoginAtUtc);

public sealed record CreateUserRequest(
  [Required, MinLength(3), MaxLength(100)] string Username,
  [Required, MinLength(8)] string Password,
  [Required] UserRole Role,
  Guid? LinkedProfessionalId,
  bool MustChangePassword = true);

public sealed record UpdateUserRequest(
  [MinLength(3), MaxLength(100)] string? Username,
  [Required] UserRole Role,
  Guid? LinkedProfessionalId,
  bool IsActive);

public sealed record ResetPasswordRequest(
  [Required, MinLength(8)] string NewPassword,
  bool MustChangePassword = true);
