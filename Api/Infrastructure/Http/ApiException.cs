using System.Net;

namespace Api.Infrastructure.Http;

/// <summary>
/// Base domain exception. Carries everything the global middleware needs to produce
/// a typed <see cref="ApiResponse"/> without any try/catch in controllers.
///
/// Prefer the strongly-typed derived exceptions (<see cref="NotFoundException"/>,
/// <see cref="ConflictException"/>, etc.) at throw sites — they are more readable
/// and remove the need to repeat the HTTP status code every time.
/// </summary>
public class ApiException : Exception
{
  /// <summary>HTTP status code. Cast to <c>int</c> when writing the response.</summary>
  public HttpStatusCode StatusCode { get; }

  /// <summary>Machine-readable error code (e.g. <c>USER_NOT_FOUND</c>).</summary>
  public string Code { get; }

  public ApiException(HttpStatusCode statusCode, string code, string message)
    : base(message)
  {
    StatusCode = statusCode;
    Code = code;
  }
}

// ── Derived convenience exceptions ────────────────────────────────────────────
// Each bakes in the HTTP status so throw sites only supply the error code + message.

/// <summary>404 Not Found — resource does not exist.</summary>
public sealed class NotFoundException(string code, string message)
  : ApiException(HttpStatusCode.NotFound, code, message);

/// <summary>409 Conflict — unique constraint violation or state conflict.</summary>
public sealed class ConflictException(string code, string message)
  : ApiException(HttpStatusCode.Conflict, code, message);

/// <summary>401 Unauthorized — missing, invalid, or expired credentials.</summary>
public sealed class UnauthorizedException(string code, string message)
  : ApiException(HttpStatusCode.Unauthorized, code, message);

/// <summary>400 Bad Request — invalid input that passed model validation.</summary>
public sealed class BadRequestException(string code, string message)
  : ApiException(HttpStatusCode.BadRequest, code, message);

/// <summary>403 Forbidden — authenticated but insufficient permissions.</summary>
public sealed class ForbiddenException(string code, string message)
  : ApiException(HttpStatusCode.Forbidden, code, message);
