using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Branch;

[BranchIndependent]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/branches")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class BranchController : ControllerBase
{
  private readonly BranchService _branchService;

  public BranchController(BranchService branchService) => _branchService = branchService;

  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<List<BranchResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAll([FromQuery] BranchListQuery query, CancellationToken ct)
  {
    var branches = await _branchService.GetAllAsync(query, ct);
    return Ok(ApiResponse<List<BranchResponse>>.Ok(branches.Items, branches.ToMetadata()));
  }

  [HttpGet("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<BranchResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
  {
    var branch = await _branchService.GetByIdAsync(id, ct);
    return Ok(ApiResponse<BranchResponse>.Ok(branch));
  }

  [HttpPost]
  [Authorize(Roles = "SuperAdmin,Owner")]
  [ProducesResponseType(typeof(ApiResponse<BranchResponse>), StatusCodes.Status201Created)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Create([FromBody] CreateBranchRequest request, CancellationToken ct)
  {
    var branch = await _branchService.CreateAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(nameof(GetById), new { id = branch.Id, version }, ApiResponse<BranchResponse>.Ok(branch));
  }

  [HttpPut("{id:guid}")]
  [Authorize(Roles = "SuperAdmin,Owner")]
  [ProducesResponseType(typeof(ApiResponse<BranchResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBranchRequest request, CancellationToken ct)
  {
    var branch = await _branchService.UpdateAsync(id, request, ct);
    return Ok(ApiResponse<BranchResponse>.Ok(branch));
  }

  [HttpDelete("{id:guid}")]
  [Authorize(Roles = "SuperAdmin,Owner")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
  {
    await _branchService.DeactivateAsync(id, ct);
    return NoContent();
  }
}
