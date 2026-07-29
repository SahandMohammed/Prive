using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Api.Infrastructure.OpenApi;

public sealed class HealthChecksDocumentFilter : IDocumentFilter
{
  public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
  {
    swaggerDoc.Tags ??= new HashSet<OpenApiTag>();
    swaggerDoc.Paths ??= new OpenApiPaths();
    swaggerDoc.Tags.Add(new OpenApiTag { Name = "Health" });

    swaggerDoc.Paths.Add("/api/v1/health/live", new OpenApiPathItem
    {
      Operations = new Dictionary<HttpMethod, OpenApiOperation>
      {
        [HttpMethod.Get] = new OpenApiOperation
        {
          Tags = new HashSet<OpenApiTagReference>
          {
            new("Health", swaggerDoc)
          },
          Summary = "Check whether the API process is running",
          Responses = new OpenApiResponses
          {
            ["200"] = new OpenApiResponse { Description = "API is healthy" }
          }
        }
      }
    });

    swaggerDoc.Paths.Add("/api/v1/health", new OpenApiPathItem
    {
      Operations = new Dictionary<HttpMethod, OpenApiOperation>
      {
        [HttpMethod.Get] = new OpenApiOperation
        {
          Tags = new HashSet<OpenApiTagReference>
          {
            new("Health", swaggerDoc)
          },
          Summary = "Check API dependency readiness",
          Responses = new OpenApiResponses
          {
            ["200"] = new OpenApiResponse { Description = "Dependencies are healthy" },
            ["503"] = new OpenApiResponse { Description = "A dependency is unhealthy" }
          }
        }
      }
    });
  }
}
