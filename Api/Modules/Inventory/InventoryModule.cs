namespace Api.Modules.Inventory;

public static class InventoryModule
{
  public static IServiceCollection AddInventoryModule(this IServiceCollection services)
  {
    services.AddScoped<IInventoryLedgerService, InventoryLedgerService>();
    services.AddScoped<IInventoryDocumentService, InventoryDocumentService>();
    return services;
  }
}
