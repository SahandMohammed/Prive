namespace Api.Modules.Currency;

public static class CurrencyModule
{
  public static IServiceCollection AddCurrencyModule(this IServiceCollection services)
  {
    services.AddScoped<CurrencyService>();
    return services;
  }
}
