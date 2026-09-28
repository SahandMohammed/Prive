namespace Api.Modules.Pos;

public static class PosModule
{
  public static IServiceCollection AddPosModule(this IServiceCollection services)
  {
    services.AddScoped<PosService>();
    services.AddScoped<PosSettlementService>();
    services.AddScoped<PosRefundService>();
    services.AddScoped<PosSessionService>();
    services.AddScoped<PosDrawerMovementService>();
    return services;
  }
}
