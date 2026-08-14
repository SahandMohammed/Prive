using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Api.Modules.User;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/users")]
[Authorize]
public sealed class UserController : ControllerBase
{
  private readonly UserService _userService;

  public UserController(UserService userService)
  {
    _userService = userService;
  }

  [HttpGet]
  [Authorize(Roles = "SuperAdmin,Manager")]
  [ProducesResponseType(typeof(ApiResponse<List<UserResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAll([FromQuery] UserListQuery query, CancellationToken ct)
  {
    var users = await _userService.GetAllAsync(query, ct);
    return Ok(ApiResponse<List<UserResponse>>.Ok(users.Items, users.ToMetadata()));
  }

  [HttpGet("me")]
  [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetMe()
  {
    var userId = Guid.TryParse(User.FindFirstValue("sub"), out var id)
      ? id
      : throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");

    var user = await _userService.GetByIdAsync(userId);
    return Ok(ApiResponse<UserResponse>.Ok(user));
  }

  [HttpGet("{id:guid}")]
  [Authorize(Roles = "SuperAdmin,Manager")]
  [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetById(Guid id)
  {
    var user = await _userService.GetByIdAsync(id);
    return Ok(ApiResponse<UserResponse>.Ok(user));
  }

  [HttpPost]
  [Authorize(Roles = "SuperAdmin,Manager")]
  [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status201Created)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
  {
    var user = await _userService.CreateAsync(request);

    // #7: Include the API version in route values so the Location header is correct under URL versioning.
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(nameof(GetById), new { id = user.Id, version }, ApiResponse<UserResponse>.Ok(user));
  }

  [HttpPut("{id:guid}")]
  [Authorize(Roles = "SuperAdmin,Manager")]
  [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
  {
    var user = await _userService.UpdateAsync(id, request);
    return Ok(ApiResponse<UserResponse>.Ok(user));
  }

  [HttpPost("{id:guid}/reset-password")]
  [Authorize(Roles = "SuperAdmin,Manager")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
  {
    await _userService.ResetPasswordAsync(id, request);
    return NoContent();
  }

  [HttpDelete("{id:guid}")]
  [Authorize(Roles = "SuperAdmin,Manager")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Delete(Guid id)
  {
    await _userService.DeleteAsync(id);
    return NoContent();
  }
}
