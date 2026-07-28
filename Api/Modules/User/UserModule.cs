using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Api.Modules.User
{
  public static class UserModule
  {
    public static IServiceCollection AddUserModule(this IServiceCollection services)
    {
      services.AddScoped<UserService>();
      return services;
    }
  }
}