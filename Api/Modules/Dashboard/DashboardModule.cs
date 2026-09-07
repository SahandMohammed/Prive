using Microsoft.Extensions.DependencyInjection;

namespace Api.Modules.Dashboard;

public static class DashboardModule
{
  public static IServiceCollection AddDashboardModule(this IServiceCollection services)
  {
    services.AddScoped<DashboardService>();
    return services;
  }
}
