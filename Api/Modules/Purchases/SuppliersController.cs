using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Purchases;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/purchases/suppliers")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class SuppliersController(ISupplierService supplierService) : ControllerBase
{
  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<List<SupplierDto>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSuppliers([FromQuery] SupplierListQuery query, CancellationToken ct)
  {
    var suppliers = await supplierService.GetSuppliersAsync(query, ct);
    return Ok(ApiResponse<List<SupplierDto>>.Ok(suppliers.Items, suppliers.ToMetadata()));
  }

  [HttpPost]
  [ProducesResponseType(typeof(ApiResponse<SupplierDto>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateSupplier(CreateSupplierRequest request, CancellationToken ct)
  {
    var supplier = await supplierService.CreateSupplierAsync(request, ct);
    return CreatedAtAction(nameof(GetSuppliers), new { id = supplier.Id }, ApiResponse<SupplierDto>.Ok(supplier));
  }
}
