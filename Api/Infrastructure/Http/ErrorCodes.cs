namespace Api.Infrastructure.Http;

/// <summary>
/// Centralized error code catalog organized by domain.
/// Format: MODULE_REASON (SCREAMING_SNAKE_CASE).
///
/// Split into nested static classes so constants are namespaced and
/// discoverable via IntelliSense (e.g. ErrorCodes.Auth.InvalidCredentials).
/// Add a new nested class per module as the project grows.
/// </summary>
public static class ErrorCodes
{
  public static class Auth
  {
    public const string InvalidCredentials = "AUTH_INVALID_CREDENTIALS";
    public const string AccountDeactivated = "AUTH_ACCOUNT_DEACTIVATED";
    public const string AccountLocked      = "AUTH_ACCOUNT_LOCKED";
    public const string SessionExpired     = "AUTH_SESSION_EXPIRED";
    public const string NoRefreshToken     = "AUTH_NO_REFRESH_TOKEN";
    public const string WrongPassword      = "AUTH_WRONG_CURRENT_PASSWORD";
  }

  public static class User
  {
    public const string NotFound      = "USER_NOT_FOUND";
    public const string UsernameTaken = "USER_USERNAME_TAKEN";
  }

  public static class Common
  {
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string Unauthorized     = "UNAUTHORIZED";
    public const string Forbidden        = "FORBIDDEN";
    public const string ServerError      = "SERVER_ERROR";
    public const string TooManyRequests  = "TOO_MANY_REQUESTS";
  }
}
