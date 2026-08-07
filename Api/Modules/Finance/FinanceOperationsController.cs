using Api.Infrastructure.Http;
using Api.Shared.Domain;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Finance;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/finance")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class FinanceOperationsController(IFinancialOperationsService service) : ControllerBase
{
  [HttpPost("vouchers/{id:guid}/post")]
  public async Task<ActionResult<ApiResponse<DocumentTransitionDto>>> PostVoucher(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<DocumentTransitionDto>.Ok(await service.PostVoucherAsync(id, ct)));

  [HttpPost("vouchers/{id:guid}/void")]
  public async Task<ActionResult<ApiResponse<DocumentTransitionDto>>> VoidVoucher(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<DocumentTransitionDto>.Ok(await service.VoidVoucherAsync(id, ct)));

  [HttpPost("payment-allocations")]
  public async Task<ActionResult<ApiResponse<PaymentAllocationDto>>> CreateAllocation(
    CreatePaymentAllocationRequest request,
    CancellationToken ct)
  {
    var allocation = await service.CreateAllocationAsync(request, ct);
    return Ok(ApiResponse<PaymentAllocationDto>.Ok(allocation));
  }
}
