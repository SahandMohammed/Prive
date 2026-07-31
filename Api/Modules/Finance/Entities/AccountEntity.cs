namespace Api.Modules.Finance;

public sealed class AccountEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty; // e.g., 1001, 1001.1
  public string Name { get; set; } = string.Empty;
  public AccountCategory Category { get; set; } // Asset, Liability, Equity, Revenue, Expense
  
  public Guid? ParentAccountId { get; set; }
  public AccountEntity? ParentAccount { get; set; }
  
  public bool IsLeaf { get; set; } = true; // Only leaf accounts can have Journal Entries
  
  // Specific currency for this account (optional). If null, it accepts base currency.
  public Guid? CurrencyId { get; set; }
  public CurrencyEntity? Currency { get; set; }
  
  public bool IsActive { get; set; } = true;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
