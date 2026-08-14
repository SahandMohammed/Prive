namespace Api.Modules.Inventory;
public static class InventoryModule { public static IServiceCollection AddInventoryModule(this IServiceCollection services) { services.AddScoped<InventoryService>(); return services; } }
