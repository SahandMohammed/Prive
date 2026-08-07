namespace Api.Modules.Settings;

public static class SettingsModule
{
    public static IServiceCollection AddSettingsModule(this IServiceCollection services)
    {
        services.AddScoped<IItemService, ItemService>();
        services.AddScoped<IBusinessSettingsService, BusinessSettingsService>();
        services.AddScoped<IWarehouseService, WarehouseService>();
        services.AddScoped<IPostingSettingsProvider, PostingSettingsProvider>();
        return services;
    }
}
