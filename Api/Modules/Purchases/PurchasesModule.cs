namespace Api.Modules.Purchases;

public static class PurchasesModule
{
  public static IServiceCollection AddPurchasesModule(this IServiceCollection services)
  {
    services.AddScoped<ISupplierService, SupplierService>();
    return services;
  }
}
