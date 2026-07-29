using Asp.Versioning.ApiExplorer;
using Microsoft.Extensions.Options;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Api.Infrastructure.OpenApi;

/// <summary>
/// Configures Swagger to register one document per API version discovered by
/// <see cref="IApiVersionDescriptionProvider"/>. Adding a new API version (e.g. v2)
/// automatically appears in Swagger UI without any manual registration in Program.cs.
/// </summary>
public sealed class ConfigureSwaggerOptions : IConfigureOptions<SwaggerGenOptions>
{
  private readonly IApiVersionDescriptionProvider _provider;

  public ConfigureSwaggerOptions(IApiVersionDescriptionProvider provider)
  {
    _provider = provider;
  }

  public void Configure(SwaggerGenOptions options)
  {
    foreach (var description in _provider.ApiVersionDescriptions)
    {
      options.SwaggerDoc(description.GroupName, new()
      {
        Title = "Prive API",
        Version = description.ApiVersion.ToString(),
        Description = description.IsDeprecated
          ? "This API version has been deprecated."
          : "Internal endpoints for the Prive platform."
      });
    }
  }
}
