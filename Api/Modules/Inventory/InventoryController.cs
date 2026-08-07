using Api.Infrastructure.Http;
using Api.Shared.Domain;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Inventory;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/inventory")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class InventoryController(IInventoryDocumentService service) : ControllerBase
{
  [HttpPost("stock-adjustments/{id:guid}/post")]
  public async Task<ActionResult<ApiResponse<DocumentTransitionDto>>> PostAdjustment(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<DocumentTransitionDto>.Ok(await service.PostAdjustmentAsync(id, ct)));

  [HttpPost("stock-adjustments/{id:guid}/void")]
  public async Task<ActionResult<ApiResponse<DocumentTransitionDto>>> VoidAdjustment(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<DocumentTransitionDto>.Ok(await service.VoidAdjustmentAsync(id, ct)));

  [HttpPost("warehouse-transfers/{id:guid}/post")]
  public async Task<ActionResult<ApiResponse<DocumentTransitionDto>>> PostTransfer(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<DocumentTransitionDto>.Ok(await service.PostTransferAsync(id, ct)));

  [HttpPost("warehouse-transfers/{id:guid}/void")]
  public async Task<ActionResult<ApiResponse<DocumentTransitionDto>>> VoidTransfer(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<DocumentTransitionDto>.Ok(await service.VoidTransferAsync(id, ct)));
}
