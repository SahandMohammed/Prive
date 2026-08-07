namespace Api.Modules.Sales;

public static class SalesModule
{
  public static IServiceCollection AddSalesModule(this IServiceCollection services)
  {
    services.AddScoped<ISalesPostingService, SalesPostingService>();
    return services;
  }
}
