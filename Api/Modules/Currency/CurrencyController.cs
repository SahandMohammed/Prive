using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Currency;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/currencies")]
[Authorize(Roles = "SuperAdmin,Manager")]
public sealed class CurrencyController : ControllerBase
{
  private readonly CurrencyService _currencyService;

  public CurrencyController(CurrencyService currencyService) => _currencyService = currencyService;

  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<List<CurrencyResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAll([FromQuery] CurrencyListQuery query, CancellationToken ct)
  {
    var currencies = await _currencyService.GetAllAsync(query, ct);
    return Ok(ApiResponse<List<CurrencyResponse>>.Ok(currencies.Items, currencies.ToMetadata()));
  }

  [HttpGet("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<CurrencyResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
  {
    var currency = await _currencyService.GetByIdAsync(id, ct);
    return Ok(ApiResponse<CurrencyResponse>.Ok(currency));
  }

  [HttpPost]
  [ProducesResponseType(typeof(ApiResponse<CurrencyResponse>), StatusCodes.Status201Created)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Create([FromBody] CreateCurrencyRequest request, CancellationToken ct)
  {
    var currency = await _currencyService.CreateAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(nameof(GetById), new { id = currency.Id, version }, ApiResponse<CurrencyResponse>.Ok(currency));
  }

  [HttpPut("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<CurrencyResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
  public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCurrencyRequest request, CancellationToken ct)
  {
    var currency = await _currencyService.UpdateAsync(id, request, ct);
    return Ok(ApiResponse<CurrencyResponse>.Ok(currency));
  }
}
