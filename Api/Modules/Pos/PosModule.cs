namespace Api.Modules.Pos;

public static class PosModule
{
  public static IServiceCollection AddPosModule(this IServiceCollection services)
  {
    services.AddScoped<PosService>();
    return services;
  }
}
