namespace Api.Modules.Contact;

public static class ContactModule
{
  public static IServiceCollection AddContactModule(this IServiceCollection services)
  {
    services.AddScoped<ContactService>();
    services.AddScoped<WalkInCustomerProvisioner>();
    return services;
  }
}
