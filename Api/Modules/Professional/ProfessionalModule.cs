namespace Api.Modules.Professional;

public static class ProfessionalModule
{
  public static IServiceCollection AddProfessionalModule(this IServiceCollection services)
  {
    services.AddScoped<ProfessionalService>();
    return services;
  }
}
