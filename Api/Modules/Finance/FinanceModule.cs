namespace Api.Modules.Finance;

public sealed class FinanceOptions
{
  public const string SectionName = "Finance";
  public string AccountsPayableAccountCode { get; init; } = "23214";
  public string OpeningBalanceEquityAccountCode { get; init; } = "261";
}

public static class FinanceModule
{
  public static IServiceCollection AddFinanceModule(this IServiceCollection services, IConfiguration configuration)
  {
    services.AddOptions<FinanceOptions>()
      .Bind(configuration.GetSection(FinanceOptions.SectionName))
      .Validate(options => !string.IsNullOrWhiteSpace(options.AccountsPayableAccountCode),
        "Finance:AccountsPayableAccountCode is required.")
      .Validate(options => !string.IsNullOrWhiteSpace(options.OpeningBalanceEquityAccountCode),
        "Finance:OpeningBalanceEquityAccountCode is required.")
      .ValidateOnStart();
    services.AddScoped<FinanceService>();
    return services;
  }
}
