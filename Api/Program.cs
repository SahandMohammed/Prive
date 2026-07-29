using Api.Modules.User;
using Api.Infrastructure.Configuration;
using Api.Infrastructure.Errors;
using Api.Infrastructure.OpenApi;
using Api.Modules.Auth;
using Api.Shared.Persistence;
using Asp.Versioning;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;

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
    });
  builder.Services.AddAuthorization();

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
    options.SwaggerDoc("v1", new()
    {
      Title = "Prive API",
      Version = "v1"
    });
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
  });
  builder.Services.AddControllers();
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
    app.UseSwaggerUI(options =>
    {
      options.SwaggerEndpoint("/swagger/v1/swagger.json", "Prive API v1");
    });
  }

  app.UseSerilogRequestLogging();
  app.UseMiddleware<GlobalExceptionMiddleware>();
  app.UseHttpsRedirection();
  app.UseCors(CorsOptions.PolicyName);
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
