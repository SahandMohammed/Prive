using Api.Infrastructure.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Settings;

[ApiController]
[Route("api/v1/business-settings")]
public class BusinessSettingsController(IBusinessSettingsService businessSettingsService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<BusinessSettingsDto>>> GetSettings(CancellationToken ct)
    {
        var settings = await businessSettingsService.GetSettingsAsync(ct);
        return Ok(ApiResponse<BusinessSettingsDto>.Ok(settings));
    }

    [HttpPost("setup")]
    public async Task<ActionResult<ApiResponse<BusinessSettingsDto>>> SetupSettings([FromBody] SetupBusinessRequest req, CancellationToken ct)
    {
        var settings = await businessSettingsService.SetupSettingsAsync(req, ct);
        return Ok(ApiResponse<BusinessSettingsDto>.Ok(settings));
    }

    [HttpPut]
    public async Task<ActionResult<ApiResponse<BusinessSettingsDto>>> UpdateSettings([FromBody] UpdateBusinessSettingsRequest req, CancellationToken ct)
    {
        var settings = await businessSettingsService.UpdateSettingsAsync(req, ct);
        return Ok(ApiResponse<BusinessSettingsDto>.Ok(settings));
    }
}
