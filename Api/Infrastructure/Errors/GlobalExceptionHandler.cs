using Api.Infrastructure.Http;
using Microsoft.AspNetCore.Diagnostics;

namespace Api.Infrastructure.Errors;

/// <summary>
/// Global exception handler registered via <c>AddExceptionHandler</c>.
/// Maps <see cref="ApiException"/> subtypes to the standard <see cref="ApiResponse"/>
/// envelope and logs at the appropriate severity level.
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
  public async ValueTask<bool> TryHandleAsync(
    HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
  {
    if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
    {
      // Client disconnected mid-request — not a server error, no response needed.
      logger.LogInformation(
        "Request cancelled by client for {Method} {Path}",
        httpContext.Request.Method, httpContext.Request.Path);

      httpContext.Response.StatusCode = StatusCodes.Status499ClientClosedRequest;
      return true;
    }

    var (statusCode, code, message) = exception switch
    {
      ApiException api => ((int)api.StatusCode, api.Code, api.Message),
      _ => (StatusCodes.Status500InternalServerError, ErrorCodes.Common.ServerError, "An unexpected error occurred.")
    };

    if (statusCode >= 500)
    {
      logger.LogError(
        exception,
        "Server-level exception [{Code}] for {Method} {Path}",
        code, httpContext.Request.Method, httpContext.Request.Path);
    }
    else
    {
      logger.LogInformation(
        "Client error [{StatusCode}] [{Code}] for {Method} {Path}",
        statusCode, code, httpContext.Request.Method, httpContext.Request.Path);
    }

    httpContext.Response.StatusCode = statusCode;
    httpContext.Response.ContentType = "application/json";

    await httpContext.Response.WriteAsJsonAsync(
      ApiResponse.Fail(code, message, traceId: httpContext.TraceIdentifier),
      cancellationToken);

    return true;
  }
}
