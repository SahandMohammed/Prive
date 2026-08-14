namespace Api.Modules.Business;

public static class BusinessModule
{
  public static IServiceCollection AddBusinessModule(this IServiceCollection services)
  {
    services.AddScoped<BusinessService>();
    return services;
  }
}
