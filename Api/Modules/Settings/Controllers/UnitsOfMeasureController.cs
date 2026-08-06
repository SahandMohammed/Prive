using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Settings;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/units-of-measure")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class UnitsOfMeasureController(IItemService itemService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<UnitOfMeasureDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUnitsOfMeasure(CancellationToken ct)
    {
        var items = await itemService.GetUnitsOfMeasureAsync(ct);
        return Ok(ApiResponse<List<UnitOfMeasureDto>>.Ok(items));
    }
    
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<UnitOfMeasureDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateUnitOfMeasure(CreateUnitOfMeasureRequest req, CancellationToken ct)
    {
        var uom = await itemService.CreateUnitOfMeasureAsync(req, ct);
        return Ok(ApiResponse<UnitOfMeasureDto>.Ok(uom));
    }
}
