using System.Security.Claims;
using Api.Infrastructure.Configuration;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
  public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
  {
    try
    {
      var (response, refreshToken) = await _authService.LoginAsync(request);
      SetRefreshTokenCookie(refreshToken);
      return Ok(response);
    }
    catch (AuthException exception)
    {
      return Unauthorized(new { error = exception.Message });
    }
  }

  [HttpPost("refresh")]
  public async Task<ActionResult<LoginResponse>> Refresh()
  {
    var refreshToken = Request.Cookies[RefreshTokenCookieName];
    if (string.IsNullOrEmpty(refreshToken))
    {
      return Unauthorized(new { error = "No refresh token." });
    }

    try
    {
      var (response, newRefreshToken) = await _authService.RefreshAsync(refreshToken);
      SetRefreshTokenCookie(newRefreshToken);
      return Ok(response);
    }
    catch (AuthException exception)
    {
      return Unauthorized(new { error = exception.Message });
    }
  }

  [HttpPost("logout")]
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
  public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
  {
    var subject = User.FindFirstValue("sub");
    if (!Guid.TryParse(subject, out var userId))
    {
      return Unauthorized();
    }

    try
    {
      await _authService.ChangePasswordAsync(userId, request);
      Response.Cookies.Delete(RefreshTokenCookieName, CookieOptions());
      return NoContent();
    }
    catch (AuthException exception)
    {
      return BadRequest(new { error = exception.Message });
    }
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
