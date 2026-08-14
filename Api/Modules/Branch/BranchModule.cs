namespace Api.Modules.Branch;

public static class BranchModule
{
  public static IServiceCollection AddBranchModule(this IServiceCollection services)
  {
    services.AddScoped<BranchService>();
    return services;
  }
}
