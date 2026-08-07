using System.Text.Json.Serialization;
using Api.Shared.Pagination;

namespace Api.Infrastructure.Http;

/// <summary>
/// Unified envelope for all API responses.
///
/// Success:  { "success": true,  "data": { ... }, "meta": { ... } }
/// Error:    { "success": false, "error": { "code": "...", "message": "...", "traceId": "...", "details": [...] } }
///
/// HTTP status codes always match the envelope state:
///   2xx       → success = true
///   4xx / 5xx → success = false
/// </summary>
public sealed class ApiResponse<T>
{
  [JsonPropertyOrder(0)]
  public bool Success { get; private init; }

  [JsonPropertyOrder(1)]
  [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
  public T? Data { get; private init; }

  [JsonPropertyOrder(2)]
  [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
  public PaginationMetadata? Meta { get; private init; }

  [JsonPropertyOrder(3)]
  [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
  public ApiError? Error { get; private init; }

  private ApiResponse() { }

  public static ApiResponse<T> Ok(T data, PaginationMetadata? meta = null) => new()
  {
    Success = true,
    Data = data,
    Meta = meta
  };

  public static ApiResponse<T> Fail(
    string code,
    string message,
    string? traceId = null,
    IReadOnlyList<ApiFieldError>? details = null) => new()
  {
    Success = false,
    Error = new ApiError(code, message, traceId, details)
  };
}

/// <summary>Non-generic variant for error-only responses (no data payload).</summary>
public sealed class ApiResponse
{
  [JsonPropertyOrder(0)]
  public bool Success { get; private init; }

  [JsonPropertyOrder(1)]
  [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
  public ApiError? Error { get; private init; }

  private ApiResponse() { }

  public static ApiResponse Ok() => new() { Success = true };

  public static ApiResponse Fail(
    string code,
    string message,
    string? traceId = null,
    IReadOnlyList<ApiFieldError>? details = null) => new()
  {
    Success = false,
    Error = new ApiError(code, message, traceId, details)
  };
}

/// <summary>
/// Structured error detail embedded inside a failed response envelope.
/// <c>TraceId</c> links to distributed logs and APM traces for production debugging.
/// <c>Details</c> carries per-field validation errors and is only present on VALIDATION_FAILED responses.
/// </summary>
public sealed record ApiError(
  string Code,
  string Message,
  [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
  string? TraceId = null,
  [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
  IReadOnlyList<ApiFieldError>? Details = null);

/// <summary>Per-field validation error included in VALIDATION_FAILED responses.</summary>
public sealed record ApiFieldError(string Field, string Message);
