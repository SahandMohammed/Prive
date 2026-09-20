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
public sealed class PosSessionController : ControllerBase
{
  private readonly PosSessionService _service;

  public PosSessionController(PosSessionService service) => _service = service;

  [HttpGet("registers")]
  [ProducesResponseType(typeof(ApiResponse<List<PosRegisterResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetRegisters([FromQuery] PosRegisterListQuery query, CancellationToken ct)
  {
    var result = await _service.GetRegistersAsync(query, ct);
    return Ok(ApiResponse<List<PosRegisterResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("registers/{id:guid}", Name = nameof(GetRegister))]
  [ProducesResponseType(typeof(ApiResponse<PosRegisterResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetRegister(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<PosRegisterResponse>.Ok(await _service.GetRegisterAsync(id, ct)));

  [HttpPost("registers")]
  [Authorize(Roles = "SuperAdmin,Manager,Owner")]
  [ProducesResponseType(typeof(ApiResponse<PosRegisterResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateRegister([FromBody] CreatePosRegisterRequest request, CancellationToken ct)
  {
    var register = await _service.CreateRegisterAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetRegister), new { id = register.Id, version }, ApiResponse<PosRegisterResponse>.Ok(register));
  }

  [HttpPut("registers/{id:guid}")]
  [Authorize(Roles = "SuperAdmin,Manager,Owner")]
  [ProducesResponseType(typeof(ApiResponse<PosRegisterResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> UpdateRegister(Guid id, [FromBody] UpdatePosRegisterRequest request, CancellationToken ct) =>
    Ok(ApiResponse<PosRegisterResponse>.Ok(await _service.UpdateRegisterAsync(id, request, ct)));

  [HttpGet("sessions/active")]
  [ProducesResponseType(typeof(ApiResponse<PosSessionResponse?>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetActiveSession(CancellationToken ct)
  {
    var session = await _service.GetActiveSessionAsync(GetUserId(), ct);
    return Ok(ApiResponse<PosSessionResponse?>.Ok(session));
  }

  [HttpPost("sessions/open")]
  [ProducesResponseType(typeof(ApiResponse<PosSessionResponse>), StatusCodes.Status201Created)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> OpenSession([FromBody] OpenPosSessionRequest request, CancellationToken ct)
  {
    var session = await _service.OpenSessionAsync(GetUserId(), request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetSession), new { id = session.Id, version }, ApiResponse<PosSessionResponse>.Ok(session));
  }

  [HttpGet("sessions")]
  [ProducesResponseType(typeof(ApiResponse<List<PosSessionListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSessions([FromQuery] PosSessionListQuery query, CancellationToken ct)
  {
    var result = await _service.GetSessionsAsync(GetUserId(), query, ct);
    return Ok(ApiResponse<List<PosSessionListResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("sessions/{id:guid}", Name = nameof(GetSession))]
  [ProducesResponseType(typeof(ApiResponse<PosSessionResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetSession(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<PosSessionResponse>.Ok(await _service.GetSessionAsync(GetUserId(), id, ct)));

  [HttpGet("sessions/{id:guid}/x-report")]
  [ProducesResponseType(typeof(ApiResponse<PosXReportResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetXReport(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<PosXReportResponse>.Ok(await _service.GetXReportAsync(GetUserId(), id, ct)));

  [HttpPost("sessions/{id:guid}/close")]
  [ProducesResponseType(typeof(ApiResponse<PosZReportResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> CloseSession(Guid id, [FromBody] ClosePosSessionRequest request, CancellationToken ct) =>
    Ok(ApiResponse<PosZReportResponse>.Ok(await _service.CloseSessionAsync(GetUserId(), id, request, ct)));

  [HttpGet("z-reports")]
  [ProducesResponseType(typeof(ApiResponse<List<PosZReportListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetZReports([FromQuery] PosZReportListQuery query, CancellationToken ct)
  {
    var result = await _service.GetZReportsAsync(GetUserId(), query, ct);
    return Ok(ApiResponse<List<PosZReportListResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("z-reports/{id:guid}", Name = nameof(GetZReport))]
  [ProducesResponseType(typeof(ApiResponse<PosZReportResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetZReport(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<PosZReportResponse>.Ok(await _service.GetZReportAsync(GetUserId(), id, ct)));

  private Guid GetUserId()
  {
    var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    if (!Guid.TryParse(value, out var userId))
      throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
    return userId;
  }
}
