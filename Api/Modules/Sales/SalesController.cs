using System.Security.Claims;
using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Sales;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/sales")]
[Authorize(Roles = "SuperAdmin,Manager")]
public sealed class SalesController : ControllerBase
{
  private readonly SalesService _service;

  public SalesController(SalesService service) => _service = service;

  [HttpGet("service-categories")]
  [ProducesResponseType(typeof(ApiResponse<List<ServiceCategoryResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetServiceCategories([FromQuery] ServiceCategoryListQuery query, CancellationToken ct)
  {
    var result = await _service.GetServiceCategoriesAsync(query, ct);
    return Ok(ApiResponse<List<ServiceCategoryResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpPost("service-categories")]
  [ProducesResponseType(typeof(ApiResponse<ServiceCategoryResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateServiceCategory([FromBody] ServiceCategoryRequest request, CancellationToken ct)
  {
    var category = await _service.CreateServiceCategoryAsync(request, ct);
    return StatusCode(StatusCodes.Status201Created, ApiResponse<ServiceCategoryResponse>.Ok(category));
  }

  [HttpPut("service-categories/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ServiceCategoryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateServiceCategory(Guid id, [FromBody] ServiceCategoryRequest request, CancellationToken ct) =>
    Ok(ApiResponse<ServiceCategoryResponse>.Ok(await _service.UpdateServiceCategoryAsync(id, request, ct)));

  [HttpDelete("service-categories/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteServiceCategory(Guid id, CancellationToken ct)
  {
    await _service.DeleteServiceCategoryAsync(id, ct);
    return NoContent();
  }

  [HttpGet("services")]
  [ProducesResponseType(typeof(ApiResponse<List<ServiceResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetServices([FromQuery] ServiceListQuery query, CancellationToken ct)
  {
    var result = await _service.GetServicesAsync(query, ct);
    return Ok(ApiResponse<List<ServiceResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("services/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ServiceResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetService(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<ServiceResponse>.Ok(await _service.GetServiceAsync(id, ct)));

  [HttpPost("services")]
  [ProducesResponseType(typeof(ApiResponse<ServiceResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateService([FromBody] ServiceRequest request, CancellationToken ct)
  {
    var service = await _service.CreateServiceAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetService), new { service.Id, version }, ApiResponse<ServiceResponse>.Ok(service));
  }

  [HttpPut("services/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ServiceResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateService(Guid id, [FromBody] ServiceRequest request, CancellationToken ct) =>
    Ok(ApiResponse<ServiceResponse>.Ok(await _service.UpdateServiceAsync(id, request, ct)));

  [HttpDelete("services/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteService(Guid id, CancellationToken ct)
  {
    await _service.DeleteServiceAsync(id, ct);
    return NoContent();
  }

  [HttpGet("invoices")]
  [ProducesResponseType(typeof(ApiResponse<List<SalesInvoiceListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetInvoices([FromQuery] SalesInvoiceListQuery query, CancellationToken ct)
  {
    var result = await _service.GetInvoicesAsync(query, ct);
    return Ok(ApiResponse<List<SalesInvoiceListResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("invoices/{id:guid}", Name = nameof(GetInvoice))]
  [ProducesResponseType(typeof(ApiResponse<SalesInvoiceResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetInvoice(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<SalesInvoiceResponse>.Ok(await _service.GetInvoiceAsync(id, ct)));

  [HttpPost("invoices")]
  [ProducesResponseType(typeof(ApiResponse<SalesInvoiceResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateInvoice([FromBody] SalesInvoiceDraftRequest request, CancellationToken ct)
  {
    var invoice = await _service.CreateInvoiceAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetInvoice), new { invoice.Id, version }, ApiResponse<SalesInvoiceResponse>.Ok(invoice));
  }

  [HttpPut("invoices/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<SalesInvoiceResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateInvoice(Guid id, [FromBody] SalesInvoiceDraftRequest request, CancellationToken ct) =>
    Ok(ApiResponse<SalesInvoiceResponse>.Ok(await _service.UpdateInvoiceAsync(id, request, ct)));

  [HttpDelete("invoices/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteInvoice(Guid id, CancellationToken ct)
  {
    await _service.DeleteInvoiceAsync(id, ct);
    return NoContent();
  }

  [HttpPost("invoices/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<SalesInvoiceResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostInvoice(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<SalesInvoiceResponse>.Ok(await _service.PostInvoiceAsync(id, GetUserId(), ct)));

  private Guid GetUserId()
  {
    var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    if (!Guid.TryParse(value, out var userId))
      throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
    return userId;
  }
}
