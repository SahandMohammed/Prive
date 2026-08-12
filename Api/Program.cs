using Api.Modules.User;
using Api.Infrastructure.Configuration;
using Api.Infrastructure.Errors;
using Api.Infrastructure.Http;
using Api.Infrastructure.OpenApi;
using Api.Modules.Auth;
using Api.Shared.Persistence;
using Asp.Versioning;
using Asp.Versioning.ApiExplorer;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Serilog;
using Microsoft.Extensions.Options;
using Swashbuckle.AspNetCore.SwaggerGen;

Log.Logger = new LoggerConfiguration()
  .WriteTo.Console()
  .CreateBootstrapLogger();

try
{
  var builder = WebApplication.CreateBuilder(args);

  builder.Host.UseSerilog((context, services, loggerConfiguration) => loggerConfiguration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

  builder.Services
    .AddOptions<CorsOptions>()
    .BindConfiguration(CorsOptions.SectionName)
    .Validate(
      options => options.AllowedOrigins.Length > 0 && options.AllowedOrigins.All(origin => Uri.IsWellFormedUriString(origin, UriKind.Absolute)),
      "Cors:AllowedOrigins must contain at least one absolute origin.")
    .ValidateOnStart();

  var corsOptions = builder.Configuration
    .GetSection(CorsOptions.SectionName)
    .Get<CorsOptions>() ?? new CorsOptions();

  builder.Services
    .AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .Validate(
      options => JwtOptions.IsValidSigningKey(options.Key),
      "Jwt:Key must be a Base64-encoded value of at least 32 bytes.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.Issuer), "Jwt:Issuer is required.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.Audience), "Jwt:Audience is required.")
    .Validate(options => options.AccessTokenMinutes > 0, "Jwt:AccessTokenMinutes must be positive.")
    .Validate(options => options.RefreshTokenDays > 0, "Jwt:RefreshTokenDays must be positive.")
    .ValidateOnStart();

  var jwtOptions = builder.Configuration
    .GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? new JwtOptions();

  builder.Services.AddCors(options =>
  {
    options.AddPolicy(CorsOptions.PolicyName, policy => policy
      .WithOrigins(corsOptions.AllowedOrigins)
      .AllowAnyHeader()
      .AllowAnyMethod()
      .AllowCredentials());
  });

  var connectionString = builder.Configuration.GetConnectionString("Default");
  builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString ?? string.Empty));

  builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
      options.MapInboundClaims = false;
      options.TokenValidationParameters = new TokenValidationParameters
      {
        ValidateIssuer = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtOptions.Audience,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Convert.FromBase64String(jwtOptions.Key)),
        RoleClaimType = ClaimTypes.Role,
        ClockSkew = TimeSpan.FromMinutes(1)
      };
      options.Events = new JwtBearerEvents
      {
        // #4: Return the standard ApiResponse envelope for JWT auth/authz failures
        // so they are indistinguishable in shape from domain error responses.
        OnChallenge = async context =>
        {
          context.HandleResponse();
          context.Response.StatusCode = StatusCodes.Status401Unauthorized;
          context.Response.ContentType = "application/json";
          await context.Response.WriteAsJsonAsync(
            ApiResponse.Fail(
              ErrorCodes.Common.Unauthorized,
              "Authentication is required to access this resource.",
              traceId: context.HttpContext.TraceIdentifier));
        },
        OnForbidden = async context =>
        {
          context.Response.StatusCode = StatusCodes.Status403Forbidden;
          context.Response.ContentType = "application/json";
          await context.Response.WriteAsJsonAsync(
            ApiResponse.Fail(
              ErrorCodes.Common.Forbidden,
              "You do not have permission to access this resource.",
              traceId: context.HttpContext.TraceIdentifier));
        }
      };
    });
  builder.Services.AddAuthorization();

  builder.Services.AddRateLimiter(options =>
  {
    options.AddPolicy("LoginPolicy", context =>
    {
      var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
      return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
      {
        PermitLimit = 5,
        Window = TimeSpan.FromMinutes(1),
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        QueueLimit = 0
      });
    });

    options.OnRejected = async (context, token) =>
    {
      context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
      context.HttpContext.Response.ContentType = "application/json";
      await context.HttpContext.Response.WriteAsJsonAsync(
        ApiResponse.Fail(
          ErrorCodes.Common.TooManyRequests,
          "Too many requests. Please try again later.",
          traceId: context.HttpContext.TraceIdentifier),
        cancellationToken: token);
    };
  });

  var healthChecks = builder.Services.AddHealthChecks();

  if (!string.IsNullOrWhiteSpace(connectionString))
  {
    healthChecks.AddNpgSql(connectionString, name: "postgresql", tags: ["ready"]);
  }

  // Add services to the container.
  // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
  builder.Services.AddEndpointsApiExplorer();
  builder.Services.AddSwaggerGen(options =>
  {
    // Documents are registered dynamically by ConfigureSwaggerOptions via IApiVersionDescriptionProvider.
    options.DocumentFilter<HealthChecksDocumentFilter>();
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
      Type = SecuritySchemeType.Http,
      Scheme = "bearer",
      BearerFormat = "JWT",
      Description = "Paste an access token obtained from the login endpoint."
    });
    options.AddSecurityRequirement(document => new()
    {
      [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
    // Clean schema names for generic wrappers, e.g. ApiResponse_LoginResponse.
    options.CustomSchemaIds(type =>
    {
      if (!type.IsGenericType) return type.Name;
      
      string GetTypeName(Type t)
      {
        if (!t.IsGenericType) return t.Name;
        var baseName = t.Name.Split('`')[0];
        var args = string.Join("_", t.GetGenericArguments().Select(GetTypeName));
        return $"{baseName}_{args}";
      }

      return GetTypeName(type);
    });
  });
  // #6: Dynamically registers one Swagger document per discovered API version.
  builder.Services.AddTransient<IConfigureOptions<SwaggerGenOptions>, ConfigureSwaggerOptions>();
  builder.Services
    .AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
      options.InvalidModelStateResponseFactory = context =>
      {
        var traceId = context.HttpContext.TraceIdentifier;
        var fieldErrors = context.ModelState
          .Where(e => e.Value?.Errors.Count > 0)
          .SelectMany(kvp => kvp.Value!.Errors.Select(err => new ApiFieldError(
            Field: System.Text.Json.JsonNamingPolicy.CamelCase.ConvertName(kvp.Key),
            Message: err.ErrorMessage)))
          .ToList();

        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(
          ApiResponse.Fail(ErrorCodes.Common.ValidationFailed, "One or more validation errors occurred.", traceId: traceId, details: fieldErrors));
      };
    });
  builder.Services
    .AddApiVersioning(options =>
    {
      options.DefaultApiVersion = new ApiVersion(1, 0);
      options.AssumeDefaultVersionWhenUnspecified = true;
      options.ReportApiVersions = true;
      options.ApiVersionReader = new UrlSegmentApiVersionReader();
    })
    .AddApiExplorer(options =>
    {
      options.GroupNameFormat = "'v'VVV";
      options.SubstituteApiVersionInUrl = true;
    });

  builder.Services
    .AddUserModule()
    .AddAuthModule();

  var app = builder.Build();

  // Configure the HTTP request pipeline.
  if (app.Environment.IsDevelopment())
  {
    app.UseSwagger();
    // #6: Iterate discovered versions so v2+ automatically appears in Swagger UI.
    app.UseSwaggerUI(options =>
    {
      var descriptions = app.Services.GetRequiredService<IApiVersionDescriptionProvider>();
      foreach (var description in descriptions.ApiVersionDescriptions.OrderByDescending(d => d.ApiVersion))
      {
        var label = description.IsDeprecated
          ? $"Prive API {description.GroupName.ToUpper()} (deprecated)"
          : $"Prive API {description.GroupName.ToUpper()}";
        options.SwaggerEndpoint($"/swagger/{description.GroupName}/swagger.json", label);
      }
    });
  }

  app.UseSerilogRequestLogging();
  app.UseMiddleware<GlobalExceptionMiddleware>();
  app.UseCors(CorsOptions.PolicyName);
  app.UseHttpsRedirection();
  app.UseRateLimiter();
  app.UseAuthentication();
  app.UseAuthorization();
  app.MapControllers();
  app.MapHealthChecks("/api/v1/health/live", new HealthCheckOptions
  {
    Predicate = _ => false
  });
  app.MapHealthChecks("/api/v1/health", new HealthCheckOptions
  {
    Predicate = registration => registration.Tags.Contains("ready")
  });

  await Api.Shared.Persistence.DbSeeder.SeedAsync(app.Services);

  app.Run();
}
catch (Exception exception)
{
  Log.Fatal(exception, "Application terminated unexpectedly");
}
finally
{
  await Log.CloseAndFlushAsync();
}
