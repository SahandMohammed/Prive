using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Professional;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/professionals/performance")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class ProfessionalPerformanceController : ControllerBase
{
  private readonly ProfessionalPerformanceService _service;

  public ProfessionalPerformanceController(ProfessionalPerformanceService service) => _service = service;

  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<ProfessionalPerformanceResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Get(
    [FromQuery] ProfessionalPerformanceQuery query,
    CancellationToken ct) =>
    Ok(ApiResponse<ProfessionalPerformanceResponse>.Ok(await _service.GetAsync(query, ct)));
}
