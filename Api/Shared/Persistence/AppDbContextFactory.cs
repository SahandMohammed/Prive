using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Api.Shared.Persistence;

public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
  public AppDbContext CreateDbContext(string[] args)
  {
    var configuration = new ConfigurationBuilder()
      .SetBasePath(Directory.GetCurrentDirectory())
      .AddJsonFile("appsettings.json", optional: false)
      .AddJsonFile("appsettings.Development.json", optional: true)
      .AddUserSecrets<AppDbContext>(optional: true)
      .AddEnvironmentVariables()
      .Build();
    var connectionString = configuration.GetConnectionString("Default");

    // Scaffolding a migration does not connect to PostgreSQL. Database updates still
    // require a real connection string supplied through user secrets or environment variables.
    if (string.IsNullOrWhiteSpace(connectionString))
    {
      connectionString = "Host=localhost;Database=prive;Username=postgres;Password=postgres";
    }

    return new AppDbContext(
      new DbContextOptionsBuilder<AppDbContext>()
        .UseNpgsql(connectionString)
        .Options);
  }
}
