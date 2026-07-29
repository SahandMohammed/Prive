using Microsoft.AspNetCore.Mvc;

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
    catch (Exception exception) when (!context.Response.HasStarted)
    {
      _logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);

      context.Response.Clear();
      context.Response.StatusCode = StatusCodes.Status500InternalServerError;
      context.Response.ContentType = "application/problem+json";

      await context.Response.WriteAsJsonAsync(new ProblemDetails
      {
        Status = StatusCodes.Status500InternalServerError,
        Title = "An unexpected error occurred.",
        Type = "https://httpstatuses.com/500",
        Instance = context.Request.Path
      });
    }
  }
}
