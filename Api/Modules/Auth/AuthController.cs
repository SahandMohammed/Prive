using System.Security.Claims;
using Api.Infrastructure.Configuration;
using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Api.Modules.Auth;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
public sealed class AuthController : ControllerBase
{
  private const string RefreshTokenCookieName = "refreshToken";
  private readonly AuthService _authService;
  private readonly JwtOptions _jwt;
  private readonly IWebHostEnvironment _environment;

  public AuthController(
    AuthService authService,
    IOptions<JwtOptions> jwt,
    IWebHostEnvironment environment)
  {
    _authService = authService;
    _jwt = jwt.Value;
    _environment = environment;
  }

  [HttpPost("login")]
  [EnableRateLimiting("LoginPolicy")]
  [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
  public async Task<IActionResult> Login([FromBody] LoginRequest request)
  {
    var (response, refreshToken) = await _authService.LoginAsync(request);
    SetRefreshTokenCookie(refreshToken);
    return Ok(ApiResponse<LoginResponse>.Ok(response));
  }

  [HttpPost("refresh")]
  [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
  public async Task<IActionResult> Refresh()
  {
    var refreshToken = Request.Cookies[RefreshTokenCookieName];
    if (string.IsNullOrEmpty(refreshToken))
    {
      return Unauthorized(ApiResponse.Fail(ErrorCodes.Auth.NoRefreshToken, "No refresh token provided."));
    }

    var (response, newRefreshToken) = await _authService.RefreshAsync(refreshToken);
    SetRefreshTokenCookie(newRefreshToken);
    return Ok(ApiResponse<LoginResponse>.Ok(response));
  }

  [HttpPost("logout")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> Logout()
  {
    var refreshToken = Request.Cookies[RefreshTokenCookieName];
    if (!string.IsNullOrEmpty(refreshToken))
    {
      await _authService.LogoutAsync(refreshToken);
    }

    Response.Cookies.Delete(RefreshTokenCookieName, CookieOptions());
    return NoContent();
  }

  [Authorize]
  [HttpPost("change-password")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
  public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
  {
    var subject = User.FindFirstValue("sub");
    if (!Guid.TryParse(subject, out var userId))
    {
      return Unauthorized(ApiResponse.Fail(ErrorCodes.Common.Unauthorized, "Invalid token subject."));
    }

    await _authService.ChangePasswordAsync(userId, request);
    Response.Cookies.Delete(RefreshTokenCookieName, CookieOptions());
    return NoContent();
  }

  private void SetRefreshTokenCookie(string refreshToken)
  {
    var options = CookieOptions();
    options.Expires = DateTimeOffset.UtcNow.AddDays(_jwt.RefreshTokenDays);
    Response.Cookies.Append(RefreshTokenCookieName, refreshToken, options);
  }

  private CookieOptions CookieOptions() => new()
  {
    HttpOnly = true,
    Secure = !_environment.IsDevelopment(),
    SameSite = SameSiteMode.Strict,
    Path = "/",
    IsEssential = true
  };
}
