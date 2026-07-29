using Api.Modules.User;
using Api.Infrastructure.Configuration;
using Api.Infrastructure.Errors;
using Asp.Versioning;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
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

builder.Services.AddCors(options =>
{
  options.AddPolicy(CorsOptions.PolicyName, policy => policy
    .WithOrigins(corsOptions.AllowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials());
});

var healthChecks = builder.Services.AddHealthChecks();
var connectionString = builder.Configuration.GetConnectionString("Default");

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

builder.Services.AddUserModule();

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
