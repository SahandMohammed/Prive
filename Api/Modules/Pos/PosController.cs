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
  private readonly PosRefundService _refunds;

  public PosController(PosService service, PosRefundService refunds)
  {
    _service = service;
    _refunds = refunds;
  }

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

  [HttpGet("sales/{salesInvoiceId:guid}", Name = nameof(GetSale))]
  [ProducesResponseType(typeof(ApiResponse<PosSaleResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetSale(Guid salesInvoiceId, CancellationToken ct) =>
    Ok(ApiResponse<PosSaleResponse>.Ok(await _service.GetSaleAsync(salesInvoiceId, ct)));

  [HttpPost("sales")]
  [ProducesResponseType(typeof(ApiResponse<PosSaleResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CompleteSale([FromBody] CompletePosSaleRequest request, CancellationToken ct)
  {
    RequireClientRequestId(request.ClientRequestId, "checkout");
    var sale = await _service.CompleteSaleAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetSale), new { salesInvoiceId = sale.Id, version }, ApiResponse<PosSaleResponse>.Ok(sale));
  }

  [HttpPut("sales/{salesInvoiceId:guid}/settlement")]
  [Authorize(Roles = "SuperAdmin,Manager,Owner")]
  [ProducesResponseType(typeof(ApiResponse<PosSaleResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> CorrectSettlement(
    Guid salesInvoiceId,
    [FromBody] CorrectPosSettlementRequest request,
    CancellationToken ct) =>
    Ok(ApiResponse<PosSaleResponse>.Ok(
      await _service.CorrectSettlementAsync(salesInvoiceId, request, GetUserId(), ct)));

  [HttpGet("sales/{salesInvoiceId:guid}/refundability")]
  [ProducesResponseType(typeof(ApiResponse<PosRefundabilityResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetRefundability(Guid salesInvoiceId, CancellationToken ct) =>
    Ok(ApiResponse<PosRefundabilityResponse>.Ok(await _refunds.GetRefundabilityAsync(salesInvoiceId, ct)));

  [HttpGet("sales/{salesInvoiceId:guid}/refunds")]
  [ProducesResponseType(typeof(ApiResponse<List<PosRefundSummaryResponse>>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetSaleRefunds(Guid salesInvoiceId, [FromQuery] PosRefundListQuery query, CancellationToken ct)
  {
    var result = await _refunds.GetSaleRefundsAsync(salesInvoiceId, query, ct);
    return Ok(ApiResponse<List<PosRefundSummaryResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("refunds/{id:guid}", Name = nameof(GetRefund))]
  [ProducesResponseType(typeof(ApiResponse<PosRefundResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetRefund(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<PosRefundResponse>.Ok(await _refunds.GetRefundAsync(id, ct)));

  [HttpPost("sales/{salesInvoiceId:guid}/refunds")]
  [Authorize(Roles = "SuperAdmin,Manager,Owner")]
  [ProducesResponseType(typeof(ApiResponse<PosRefundResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> PostRefund(
    Guid salesInvoiceId,
    [FromBody] CreatePosRefundRequest request,
    CancellationToken ct)
  {
    RequireClientRequestId(request.ClientRequestId, "refund");
    var refund = await _refunds.PostRefundAsync(salesInvoiceId, request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetRefund), new { id = refund.Id, version }, ApiResponse<PosRefundResponse>.Ok(refund));
  }

  [HttpPost("sales/{salesInvoiceId:guid}/void")]
  [Authorize(Roles = "SuperAdmin,Manager,Owner")]
  [ProducesResponseType(typeof(ApiResponse<PosRefundResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> VoidRemaining(
    Guid salesInvoiceId,
    [FromBody] VoidPosSaleRequest request,
    CancellationToken ct)
  {
    RequireClientRequestId(request.ClientRequestId, "void");
    var refund = await _refunds.VoidRemainingAsync(salesInvoiceId, request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetRefund), new { id = refund.Id, version }, ApiResponse<PosRefundResponse>.Ok(refund));
  }

  private Guid GetUserId()
  {
    var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    if (!Guid.TryParse(value, out var userId))
      throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
    return userId;
  }

  private static void RequireClientRequestId(Guid clientRequestId, string operation)
  {
    if (clientRequestId == Guid.Empty)
      throw new BadRequestException(ErrorCodes.Pos.IdempotencyKeyRequired,
        $"A client request ID is required for POS {operation}.");
  }
}
