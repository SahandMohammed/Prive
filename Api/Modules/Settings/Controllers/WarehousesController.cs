using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Settings;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/warehouses")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class WarehousesController(IWarehouseService warehouseService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<WarehouseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWarehouses([FromQuery] WarehouseListQuery query, CancellationToken ct)
    {
        var warehouses = await warehouseService.GetWarehousesAsync(query, ct);
        return Ok(ApiResponse<List<WarehouseDto>>.Ok(warehouses.Items, warehouses.ToMetadata()));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<WarehouseDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateWarehouse(CreateWarehouseRequest request, CancellationToken ct)
    {
        var warehouse = await warehouseService.CreateWarehouseAsync(request, ct);
        return CreatedAtAction(nameof(GetWarehouses), ApiResponse<WarehouseDto>.Ok(warehouse));
    }
}
