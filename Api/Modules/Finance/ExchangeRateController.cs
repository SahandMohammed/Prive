using System.Security.Claims;
using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Finance;

[BranchIndependent]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/finance/exchange-rates")]
[Authorize]
public sealed class ExchangeRateController : ControllerBase
{
  private const string Administrators = "SuperAdmin,Manager,Owner";
  private readonly FinanceService _service;

  public ExchangeRateController(FinanceService service) => _service = service;

  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<List<ExchangeRateResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetExchangeRates([FromQuery] ExchangeRateListQuery query, CancellationToken ct)
  {
    var result = await _service.GetExchangeRatesAsync(query, ct);
    return Ok(ApiResponse<List<ExchangeRateResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("effective")]
  [ProducesResponseType(typeof(ApiResponse<EffectiveExchangeRateResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetEffectiveExchangeRate(
    [FromQuery] Guid currencyId,
    [FromQuery] DateOnly date,
    CancellationToken ct) =>
    Ok(ApiResponse<EffectiveExchangeRateResponse>.Ok(
      await _service.GetEffectiveExchangeRateAsync(currencyId, date, ct)));

  [HttpGet("dollar/current")]
  [ProducesResponseType(typeof(ApiResponse<DollarRateResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCurrentDollarRate(CancellationToken ct) =>
    Ok(ApiResponse<DollarRateResponse>.Ok(await _service.GetCurrentDollarRateAsync(ct)));

  [HttpPost("dollar")]
  [ProducesResponseType(typeof(ApiResponse<DollarRateResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> SetDollarRate([FromBody] SetDollarRateRequest request, CancellationToken ct)
  {
    var rate = await _service.SetDollarRateAsync(request, GetUserId(), ct);
    return StatusCode(StatusCodes.Status201Created, ApiResponse<DollarRateResponse>.Ok(rate));
  }

  [HttpPost]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<ExchangeRateResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateExchangeRate([FromBody] CreateExchangeRateRequest request, CancellationToken ct)
  {
    var rate = await _service.CreateExchangeRateAsync(request, GetUserId(), ct);
    return StatusCode(StatusCodes.Status201Created, ApiResponse<ExchangeRateResponse>.Ok(rate));
  }

  [HttpPut("{id:guid}/deactivate")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<ExchangeRateResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> DeactivateExchangeRate(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<ExchangeRateResponse>.Ok(await _service.DeactivateExchangeRateAsync(id, ct)));

  private Guid GetUserId()
  {
    var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    if (!Guid.TryParse(value, out var userId))
      throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
    return userId;
  }
}
