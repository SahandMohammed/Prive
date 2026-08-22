using System.Security.Claims;
using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Purchase;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/purchases/invoices")]
[Authorize(Roles = "SuperAdmin,Manager")]
public sealed class PurchaseController : ControllerBase
{
  private readonly PurchaseService _service;

  public PurchaseController(PurchaseService service) => _service = service;

  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<List<PurchaseInvoiceListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAll([FromQuery] PurchaseInvoiceListQuery query, CancellationToken ct)
  {
    var result = await _service.GetAllAsync(query, ct);
    return Ok(ApiResponse<List<PurchaseInvoiceListResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("{id:guid}", Name = nameof(GetById))]
  [ProducesResponseType(typeof(ApiResponse<PurchaseInvoiceResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<PurchaseInvoiceResponse>.Ok(await _service.GetByIdAsync(id, ct)));

  [HttpPost]
  [ProducesResponseType(typeof(ApiResponse<PurchaseInvoiceResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> Create([FromBody] PurchaseInvoiceDraftRequest request, CancellationToken ct)
  {
    var invoice = await _service.CreateAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetById), new { invoice.Id, version }, ApiResponse<PurchaseInvoiceResponse>.Ok(invoice));
  }

  [HttpPut("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<PurchaseInvoiceResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Update(Guid id, [FromBody] PurchaseInvoiceDraftRequest request, CancellationToken ct) =>
    Ok(ApiResponse<PurchaseInvoiceResponse>.Ok(await _service.UpdateAsync(id, request, ct)));

  [HttpDelete("{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
  {
    await _service.DeleteAsync(id, ct);
    return NoContent();
  }

  [HttpPost("{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<PurchaseInvoiceResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Post(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<PurchaseInvoiceResponse>.Ok(await _service.PostAsync(id, GetUserId(), ct)));

  private Guid GetUserId()
  {
    var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    if (!Guid.TryParse(value, out var userId))
      throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
    return userId;
  }
}
