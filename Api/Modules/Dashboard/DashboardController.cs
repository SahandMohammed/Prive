using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Dashboard;

[Authorize]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/dashboard")]
public sealed class DashboardController : ControllerBase
{
  private readonly DashboardService _dashboard;

  public DashboardController(DashboardService dashboard)
  {
    _dashboard = dashboard;
  }

  [HttpGet("summary")]
  public async Task<ActionResult<ApiResponse<DashboardSummaryResponse>>> GetSummary(CancellationToken ct)
  {
    var summary = await _dashboard.GetSummaryAsync(ct);
    return Ok(ApiResponse<DashboardSummaryResponse>.Ok(summary));
  }

  [HttpGet("trends")]
  public async Task<ActionResult<ApiResponse<DashboardTrendResponse>>> GetTrends(
    [FromQuery] int days = 14,
    CancellationToken ct = default)
  {
    var trends = await _dashboard.GetTrendsAsync(days, ct);
    return Ok(ApiResponse<DashboardTrendResponse>.Ok(trends));
  }

  [HttpGet("sales-mix")]
  public async Task<ActionResult<ApiResponse<DashboardSalesMixResponse>>> GetSalesMix(CancellationToken ct)
  {
    var salesMix = await _dashboard.GetSalesMixAsync(ct);
    return Ok(ApiResponse<DashboardSalesMixResponse>.Ok(salesMix));
  }

  [HttpGet("recent-transactions")]
  public async Task<ActionResult<ApiResponse<IReadOnlyList<DashboardRecentTransactionResponse>>>> GetRecentTransactions(
    [FromQuery] int limit = 10,
    CancellationToken ct = default)
  {
    var transactions = await _dashboard.GetRecentTransactionsAsync(limit, ct);
    return Ok(ApiResponse<IReadOnlyList<DashboardRecentTransactionResponse>>.Ok(transactions));
  }

  [HttpGet("recent-activity")]
  public async Task<ActionResult<ApiResponse<IReadOnlyList<DashboardRecentActivityResponse>>>> GetRecentActivity(
    [FromQuery] int limit = 10,
    CancellationToken ct = default)
  {
    var activities = await _dashboard.GetRecentActivityAsync(limit, ct);
    return Ok(ApiResponse<IReadOnlyList<DashboardRecentActivityResponse>>.Ok(activities));
  }
}
