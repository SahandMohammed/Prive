using System.Security.Claims;
using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Branch;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/branches")]
[Authorize]
[BranchIndependent]
public sealed class BranchAccessController(BranchService service) : ControllerBase
{
  [HttpGet("accessible")]
  [ProducesResponseType(typeof(ApiResponse<List<BranchResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAccessible([FromQuery] BranchListQuery query, CancellationToken ct)
  {
    var result = await service.GetAccessibleAsync(CurrentUserId(), query, ct);
    return Ok(ApiResponse<List<BranchResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("selected")]
  [ProducesResponseType(typeof(ApiResponse<BranchResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
  public async Task<IActionResult> GetSelected([FromHeader(Name = "X-Branch-Id")] string? branchId, CancellationToken ct)
  {
    var branch = await service.ValidateSelectionAsync(CurrentUserId(), branchId, ct);
    return Ok(ApiResponse<BranchResponse>.Ok(branch));
  }

  [HttpGet("access/{userId:guid}")]
  [Authorize(Roles = "SuperAdmin,Owner")]
  [ProducesResponseType(typeof(ApiResponse<List<Guid>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetUserAccess(Guid userId, CancellationToken ct) =>
    Ok(ApiResponse<List<Guid>>.Ok(await service.GetUserAccessAsync(userId, ct)));

  [HttpPut("access/{userId:guid}")]
  [Authorize(Roles = "SuperAdmin,Owner")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
  public async Task<IActionResult> SetUserAccess(Guid userId, [FromBody] UpdateBranchAccessRequest request, CancellationToken ct)
  {
    await service.SetUserAccessAsync(userId, request, ct);
    return NoContent();
  }

  private Guid CurrentUserId() => Guid.TryParse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
    ? id : throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
}
