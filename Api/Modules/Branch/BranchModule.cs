namespace Api.Modules.Branch;

public static class BranchModule
{
  public static IServiceCollection AddBranchModule(this IServiceCollection services)
  {
    services.AddScoped<BranchService>();
    services.AddScoped<Api.Shared.Persistence.BranchContext>();
    services.AddScoped<Api.Infrastructure.Http.BranchScopeFilter>();
    return services;
  }
}
