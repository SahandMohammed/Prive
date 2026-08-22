namespace Api.Modules.Sales;

public sealed class SalesOptions
{
  public const string SectionName = "Sales";
  public string AccountsReceivableAccountCode { get; init; } = "13214";
  public string ProductRevenueAccountCode { get; init; } = "4211";
  public string CostOfGoodsSoldAccountCode { get; init; } = "3641";
  public string InventoryAccountCode { get; init; } = "1317";
}

public static class SalesModule
{
  public static IServiceCollection AddSalesModule(this IServiceCollection services, IConfiguration configuration)
  {
    services.AddOptions<SalesOptions>()
      .Bind(configuration.GetSection(SalesOptions.SectionName))
      .Validate(options => !string.IsNullOrWhiteSpace(options.AccountsReceivableAccountCode), "Sales:AccountsReceivableAccountCode is required.")
      .Validate(options => !string.IsNullOrWhiteSpace(options.ProductRevenueAccountCode), "Sales:ProductRevenueAccountCode is required.")
      .Validate(options => !string.IsNullOrWhiteSpace(options.CostOfGoodsSoldAccountCode), "Sales:CostOfGoodsSoldAccountCode is required.")
      .Validate(options => !string.IsNullOrWhiteSpace(options.InventoryAccountCode), "Sales:InventoryAccountCode is required.")
      .ValidateOnStart();
    services.AddScoped<SalesService>();
    return services;
  }
}
