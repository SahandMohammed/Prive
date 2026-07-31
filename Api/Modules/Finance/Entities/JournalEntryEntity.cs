namespace Api.Modules.Finance;

public sealed class JournalEntryEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public DateTime EntryDateUtc { get; set; }
  
  public string ReferenceType { get; set; } = string.Empty; // e.g., Invoice, Voucher
  public Guid? ReferenceId { get; set; } // Id of the Invoice or Voucher
  
  public string Description { get; set; } = string.Empty;
  
  public ICollection<JournalEntryLineEntity> Lines { get; set; } = new List<JournalEntryLineEntity>();
  
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class JournalEntryLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  
  public Guid JournalEntryId { get; set; }
  public JournalEntryEntity? JournalEntry { get; set; }
  
  public Guid AccountId { get; set; }
  public AccountEntity? Account { get; set; }
  
  // Transaction currency amounts
  public decimal Debit { get; set; }
  public decimal Credit { get; set; }
  
  public Guid CurrencyId { get; set; }
  public CurrencyEntity? Currency { get; set; }
  public decimal ExchangeRate { get; set; }
  
  // Base currency amounts (for strict accounting balance)
  public decimal BaseDebit { get; set; }
  public decimal BaseCredit { get; set; }
}
