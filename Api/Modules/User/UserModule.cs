namespace Api.Modules.User;

public static class UserModule
{
  public static IServiceCollection AddUserModule(this IServiceCollection services)
  {
    services.AddScoped<UserService>();
    return services;
  }
}