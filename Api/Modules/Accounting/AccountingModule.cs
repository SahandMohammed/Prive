namespace Api.Modules.Accounting;

public static class AccountingModule
{
  public static IServiceCollection AddAccountingModule(this IServiceCollection services)
  {
    services.AddScoped<AccountingService>();
    return services;
  }
}
