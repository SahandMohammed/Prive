namespace Api.Modules.Finance;

public static class FinanceModule
{
    public static IServiceCollection AddFinanceModule(this IServiceCollection services)
    {
        services.AddScoped<IFinanceService, FinanceService>();
        return services;
    }
}
