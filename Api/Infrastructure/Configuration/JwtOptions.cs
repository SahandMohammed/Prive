using System.Security.Cryptography;

namespace Api.Infrastructure.Configuration;

public sealed class JwtOptions
{
  public const string SectionName = "Jwt";

  public string Key { get; init; } = string.Empty;
  public string Issuer { get; init; } = string.Empty;
  public string Audience { get; init; } = string.Empty;
  public int AccessTokenMinutes { get; init; } = 15;
  public int RefreshTokenDays { get; init; } = 30;

  public static bool IsValidSigningKey(string? key)
  {
    if (string.IsNullOrWhiteSpace(key))
    {
      return false;
    }

    try
    {
      return Convert.FromBase64String(key).Length >= 32;
    }
    catch (FormatException)
    {
      return false;
    }
  }
}
