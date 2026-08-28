using System.Security.Claims;
using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Pos;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/pos")]
[Authorize(Roles = "SuperAdmin,Manager,Owner,Cashier")]
public sealed class PosController : ControllerBase
{
  private readonly PosService _service;

  public PosController(PosService service) => _service = service;

  [HttpGet("setup")]
  [ProducesResponseType(typeof(ApiResponse<PosSetupResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSetup(CancellationToken ct) =>
    Ok(ApiResponse<PosSetupResponse>.Ok(await _service.GetSetupAsync(GetUserId(), ct)));

  [HttpGet("catalog")]
  [ProducesResponseType(typeof(ApiResponse<List<PosCatalogItemResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCatalog([FromQuery] PosCatalogQuery query, CancellationToken ct)
  {
    var result = await _service.GetCatalogAsync(query, ct);
    return Ok(ApiResponse<List<PosCatalogItemResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("customers")]
  [ProducesResponseType(typeof(ApiResponse<List<PosCustomerResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCustomers([FromQuery] PosCustomerListQuery query, CancellationToken ct)
  {
    var result = await _service.GetCustomersAsync(query, ct);
    return Ok(ApiResponse<List<PosCustomerResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("sales")]
  [ProducesResponseType(typeof(ApiResponse<List<PosSaleListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSales([FromQuery] PosSaleListQuery query, CancellationToken ct)
  {
    var result = await _service.GetSalesAsync(query, ct);
    return Ok(ApiResponse<List<PosSaleListResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("sales/{id:guid}", Name = nameof(GetSale))]
  [ProducesResponseType(typeof(ApiResponse<PosSaleResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetSale(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<PosSaleResponse>.Ok(await _service.GetSaleAsync(id, ct)));

  [HttpPost("sales")]
  [ProducesResponseType(typeof(ApiResponse<PosSaleResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CompleteSale([FromBody] CompletePosSaleRequest request, CancellationToken ct)
  {
    var sale = await _service.CompleteSaleAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetSale), new { sale.Id, version }, ApiResponse<PosSaleResponse>.Ok(sale));
  }

  private Guid GetUserId()
  {
    var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    if (!Guid.TryParse(value, out var userId))
      throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
    return userId;
  }
}
