using Api.Modules.Currency;

namespace Api.Modules.Accounting;

public sealed class JournalLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid JournalEntryId { get; set; }
  public JournalEntryEntity JournalEntry { get; set; } = null!;
  public Guid AccountId { get; set; }
  public AccountEntity Account { get; set; } = null!;
  public string? Description { get; set; }
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal OriginalDebitAmount { get; set; }
  public decimal OriginalCreditAmount { get; set; }
  public decimal DebitBaseAmount { get; set; }
  public decimal CreditBaseAmount { get; set; }
}
