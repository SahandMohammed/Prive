namespace Api.Modules.Purchase;

public sealed class PurchaseOptions
{
  public const string SectionName = "Purchase";
  public string InventoryAccountCode { get; init; } = "1317";
  public string AccountsPayableAccountCode { get; init; } = "23214";
}

public static class PurchaseModule
{
  public static IServiceCollection AddPurchaseModule(this IServiceCollection services, IConfiguration configuration)
  {
    services.AddOptions<PurchaseOptions>()
      .Bind(configuration.GetSection(PurchaseOptions.SectionName))
      .Validate(options => !string.IsNullOrWhiteSpace(options.InventoryAccountCode), "Purchase:InventoryAccountCode is required.")
      .Validate(options => !string.IsNullOrWhiteSpace(options.AccountsPayableAccountCode), "Purchase:AccountsPayableAccountCode is required.")
      .ValidateOnStart();
    services.AddScoped<PurchaseService>();
    return services;
  }
}
