using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Business;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/business")]
[Authorize(Roles = "SuperAdmin,Manager")]
public sealed class BusinessController : ControllerBase
{
  private readonly BusinessService _businessService;

  public BusinessController(BusinessService businessService) => _businessService = businessService;

  [HttpGet("current")]
  [ProducesResponseType(typeof(ApiResponse<BusinessResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetCurrent(CancellationToken ct)
  {
    var business = await _businessService.GetCurrentAsync(ct);
    return Ok(ApiResponse<BusinessResponse>.Ok(business));
  }

  [HttpPost]
  [ProducesResponseType(typeof(ApiResponse<BusinessResponse>), StatusCodes.Status201Created)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Create([FromBody] CreateBusinessRequest request, CancellationToken ct)
  {
    var business = await _businessService.CreateAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(nameof(GetCurrent), new { version }, ApiResponse<BusinessResponse>.Ok(business));
  }

  [HttpPut("current")]
  [ProducesResponseType(typeof(ApiResponse<BusinessResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> UpdateCurrent([FromBody] UpdateBusinessRequest request, CancellationToken ct)
  {
    var business = await _businessService.UpdateCurrentAsync(request, ct);
    return Ok(ApiResponse<BusinessResponse>.Ok(business));
  }
}
