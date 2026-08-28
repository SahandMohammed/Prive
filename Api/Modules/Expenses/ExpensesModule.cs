namespace Api.Modules.Expenses;

public static class ExpensesModule
{
  public static IServiceCollection AddExpensesModule(this IServiceCollection services)
  {
    services.AddScoped<ExpensesService>();
    return services;
  }
}
