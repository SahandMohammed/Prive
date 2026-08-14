namespace Api.Modules.Currency;

public sealed class CurrencyEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
  public string Symbol { get; set; } = string.Empty;
  public int DecimalPlaces { get; set; }
  public bool IsActive { get; set; } = true;
}
