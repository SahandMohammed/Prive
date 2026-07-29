using System.Net;
using Api.Infrastructure.Http;

namespace Api.Infrastructure.Errors;

public sealed class GlobalExceptionMiddleware
{
  private readonly RequestDelegate _next;
  private readonly ILogger<GlobalExceptionMiddleware> _logger;

  public GlobalExceptionMiddleware(
    RequestDelegate next,
    ILogger<GlobalExceptionMiddleware> logger)
  {
    _next = next;
    _logger = logger;
  }

  public async Task InvokeAsync(HttpContext context)
  {
    try
    {
      await _next(context);
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
      // Client disconnected mid-request — not a server error, no response needed.
      _logger.LogInformation(
        "Request cancelled by client for {Method} {Path}",
        context.Request.Method, context.Request.Path);
    }
    catch (ApiException exception) when (!context.Response.HasStarted)
    {
      // Domain exceptions thrown by services.
      // 4xx errors are expected client behaviour — log as Information, not Warning.
      // 5xx would be a bug in ApiException construction and is logged as Error.
      var statusCode = (int)exception.StatusCode;
      if (statusCode >= 500)
      {
        _logger.LogError(
          exception,
          "Server-level domain exception [{Code}] for {Method} {Path}",
          exception.Code, context.Request.Method, context.Request.Path);
      }
      else
      {
        _logger.LogInformation(
          "Client error [{StatusCode}] [{Code}] for {Method} {Path}",
          statusCode, exception.Code, context.Request.Method, context.Request.Path);
      }

      await WriteErrorAsync(context, statusCode, exception.Code, exception.Message);
    }
    catch (Exception exception) when (!context.Response.HasStarted)
    {
      // Unhandled — always a bug, always a 500.
      _logger.LogError(
        exception,
        "Unhandled exception for {Method} {Path}",
        context.Request.Method, context.Request.Path);

      await WriteErrorAsync(
        context,
        (int)HttpStatusCode.InternalServerError,
        ErrorCodes.Common.ServerError,
        "An unexpected error occurred.");
    }
  }

  private static async Task WriteErrorAsync(
    HttpContext context, int statusCode, string code, string message)
  {
    context.Response.Clear();
    context.Response.StatusCode = statusCode;
    context.Response.ContentType = "application/json";

    await context.Response.WriteAsJsonAsync(
      ApiResponse.Fail(code, message, traceId: context.TraceIdentifier));
  }
}
