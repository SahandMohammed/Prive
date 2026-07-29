using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Api.Infrastructure.Configuration;
using Api.Infrastructure.Http;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Api.Modules.Auth;

public sealed class AuthService
{
  private const int MaxFailedAttempts = 5;
  private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

  private readonly AppDbContext _db;
  private readonly JwtOptions _jwt;
  private readonly PasswordHasher<UserEntity> _hasher = new();

  public AuthService(AppDbContext db, IOptions<JwtOptions> jwt)
  {
    _db = db;
    _jwt = jwt.Value;
  }

  public async Task<(LoginResponse Response, string RefreshToken)> LoginAsync(LoginRequest request)
  {
    var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == request.Username);

    if (user is null)
      throw new UnauthorizedException(ErrorCodes.Auth.InvalidCredentials, "Invalid username or password.");

    if (!user.IsActive)
      throw new UnauthorizedException(ErrorCodes.Auth.AccountDeactivated, "This account has been deactivated.");

    if (user.LockoutUntilUtc is { } lockoutUntil && lockoutUntil > DateTime.UtcNow)
      throw new UnauthorizedException(ErrorCodes.Auth.AccountLocked, "Account temporarily locked due to repeated failed attempts. Try again later.");

    var verificationResult = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
    if (verificationResult == PasswordVerificationResult.Failed)
    {
      user.FailedLoginAttemptCount++;
      if (user.FailedLoginAttemptCount >= MaxFailedAttempts)
      {
        user.LockoutUntilUtc = DateTime.UtcNow.Add(LockoutDuration);
        user.FailedLoginAttemptCount = 0;
      }

      await _db.SaveChangesAsync();
      throw new UnauthorizedException(ErrorCodes.Auth.InvalidCredentials, "Invalid username or password.");
    }

    user.FailedLoginAttemptCount = 0;
    user.LockoutUntilUtc = null;
    user.LastLoginAtUtc = DateTime.UtcNow;

    var (accessToken, accessTokenExpiresAtUtc) = IssueAccessToken(user);
    var refreshToken = await IssueRefreshTokenAsync(user.Id);
    await _db.SaveChangesAsync();

    return (new LoginResponse(accessToken, accessTokenExpiresAtUtc, user.MustChangePassword), refreshToken);
  }

  public async Task<(LoginResponse Response, string RefreshToken)> RefreshAsync(string refreshToken)
  {
    var existingToken = await _db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == Hash(refreshToken));
    if (existingToken is null || !existingToken.IsActive)
      throw new UnauthorizedException(ErrorCodes.Auth.SessionExpired, "Session expired. Please log in again.");

    var user = await _db.Users.FindAsync(existingToken.UserId);
    if (user is null || !user.IsActive)
      throw new UnauthorizedException(ErrorCodes.Auth.SessionExpired, "Session expired. Please log in again.");

    existingToken.RevokedAtUtc = DateTime.UtcNow;
    var newRefreshToken = await IssueRefreshTokenAsync(user.Id);
    var (accessToken, accessTokenExpiresAtUtc) = IssueAccessToken(user);
    await _db.SaveChangesAsync();

    return (new LoginResponse(accessToken, accessTokenExpiresAtUtc, user.MustChangePassword), newRefreshToken);
  }

  public async Task LogoutAsync(string refreshToken)
  {
    var existingToken = await _db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == Hash(refreshToken));
    if (existingToken is null) return;

    existingToken.RevokedAtUtc = DateTime.UtcNow;
    await _db.SaveChangesAsync();
  }

  public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
  {
    var user = await _db.Users.FindAsync(userId)
      ?? throw new NotFoundException(ErrorCodes.User.NotFound, "User not found.");

    if (_hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) == PasswordVerificationResult.Failed)
      throw new BadRequestException(ErrorCodes.Auth.WrongPassword, "Current password is incorrect.");

    user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
    user.MustChangePassword = false;

    var activeTokens = await _db.RefreshTokens
      .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
      .ToListAsync();
    foreach (var token in activeTokens)
    {
      token.RevokedAtUtc = DateTime.UtcNow;
    }

    await _db.SaveChangesAsync();
  }

  private (string Token, DateTime ExpiresAtUtc) IssueAccessToken(UserEntity user)
  {
    var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes);
    var claims = new[]
    {
      new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
      new Claim(ClaimTypes.Role, user.Role.ToString()),
      new Claim("linkedProfessionalId", user.LinkedProfessionalId?.ToString() ?? string.Empty)
    };
    var credentials = new SigningCredentials(
      new SymmetricSecurityKey(Convert.FromBase64String(_jwt.Key)),
      SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
      issuer: _jwt.Issuer,
      audience: _jwt.Audience,
      claims: claims,
      expires: expiresAtUtc,
      signingCredentials: credentials);

    return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
  }

  private async Task<string> IssueRefreshTokenAsync(Guid userId)
  {
    var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    _db.RefreshTokens.Add(new RefreshTokenEntity
    {
      UserId = userId,
      TokenHash = Hash(rawToken),
      ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays)
    });

    return rawToken;
  }

  private static string Hash(string value) =>
    Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
