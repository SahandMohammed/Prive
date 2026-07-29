using System.ComponentModel.DataAnnotations;

namespace Api.Modules.Auth;

public sealed record LoginRequest(
  [Required] string Username,
  [Required] string Password);

public sealed record LoginResponse(
  string AccessToken,
  DateTime AccessTokenExpiresAtUtc,
  bool MustChangePassword);

public sealed record ChangePasswordRequest(
  [Required] string CurrentPassword,
  [Required, MinLength(8)] string NewPassword);
