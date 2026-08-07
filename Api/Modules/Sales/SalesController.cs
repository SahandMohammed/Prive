using Api.Infrastructure.Http;
using Api.Shared.Domain;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Sales;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/sales/invoices")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class SalesController(ISalesPostingService service) : ControllerBase
{
  [HttpPost("{id:guid}/post")]
  public async Task<ActionResult<ApiResponse<DocumentTransitionDto>>> Post(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<DocumentTransitionDto>.Ok(await service.PostAsync(id, ct)));

  [HttpPost("{id:guid}/void")]
  public async Task<ActionResult<ApiResponse<DocumentTransitionDto>>> Void(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<DocumentTransitionDto>.Ok(await service.VoidAsync(id, ct)));
}
