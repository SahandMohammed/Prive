using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Professional;

[BranchIndependent]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/professionals")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class ProfessionalController : ControllerBase
{
  private readonly ProfessionalService _professionalService;

  public ProfessionalController(ProfessionalService professionalService) => _professionalService = professionalService;

  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<List<ProfessionalResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAll([FromQuery] ProfessionalListQuery query, CancellationToken ct)
  {
    var professionals = await _professionalService.GetAllAsync(query, ct);
    return Ok(ApiResponse<List<ProfessionalResponse>>.Ok(professionals.Items, professionals.ToMetadata()));
  }

  [HttpGet("user-options")]
  [ProducesResponseType(typeof(ApiResponse<List<ProfessionalUserOptionResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetUserOptions([FromQuery] ProfessionalUserOptionsQuery query, CancellationToken ct)
  {
    var users = await _professionalService.GetUserOptionsAsync(query, ct);
    return Ok(ApiResponse<List<ProfessionalUserOptionResponse>>.Ok(users.Items, users.ToMetadata()));
  }

  [HttpGet("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ProfessionalResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<ProfessionalResponse>.Ok(await _professionalService.GetByIdAsync(id, ct)));

  [HttpPost]
  [ProducesResponseType(typeof(ApiResponse<ProfessionalResponse>), StatusCodes.Status201Created)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Create([FromBody] CreateProfessionalRequest request, CancellationToken ct)
  {
    var professional = await _professionalService.CreateAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(nameof(GetById), new { id = professional.Id, version }, ApiResponse<ProfessionalResponse>.Ok(professional));
  }

  [HttpPut("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ProfessionalResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProfessionalRequest request, CancellationToken ct) =>
    Ok(ApiResponse<ProfessionalResponse>.Ok(await _professionalService.UpdateAsync(id, request, ct)));

  [HttpPost("{id:guid}/activate")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
  {
    await _professionalService.ActivateAsync(id, ct);
    return NoContent();
  }

  [HttpPost("{id:guid}/deactivate")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
  {
    await _professionalService.DeactivateAsync(id, ct);
    return NoContent();
  }

  [HttpDelete("{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
  {
    await _professionalService.DeleteAsync(id, ct);
    return NoContent();
  }
}
