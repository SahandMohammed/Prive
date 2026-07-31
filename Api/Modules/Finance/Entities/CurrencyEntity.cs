namespace Api.Modules.Finance;

public sealed class CurrencyEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
  public string Symbol { get; set; } = string.Empty;
  public decimal ExchangeRate { get; set; } = 1m;
  public bool IsBaseCurrency { get; set; }
  public bool IsActive { get; set; } = true;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
