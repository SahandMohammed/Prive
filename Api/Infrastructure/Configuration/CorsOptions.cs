namespace Api.Infrastructure.Configuration;

public sealed class CorsOptions
{
  public const string SectionName = "Cors";
  public const string PolicyName = "Frontend";

  public string[] AllowedOrigins { get; init; } = [];
}
