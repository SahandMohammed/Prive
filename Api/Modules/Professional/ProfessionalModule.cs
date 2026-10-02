namespace Api.Modules.Professional;

public static class ProfessionalModule
{
  public static IServiceCollection AddProfessionalModule(this IServiceCollection services)
  {
    services.AddScoped<ProfessionalService>();
    services.AddScoped<ProfessionalPerformanceService>();
    return services;
  }
}
