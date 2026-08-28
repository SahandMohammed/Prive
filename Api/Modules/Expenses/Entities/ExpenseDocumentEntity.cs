using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.User;

namespace Api.Modules.Expenses;

public sealed class ExpenseDocumentEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public ExpenseDocumentStatus Status { get; set; } = ExpenseDocumentStatus.Draft;
  public DateOnly ExpenseDate { get; set; }
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid MoneyAccountId { get; set; }
  public MoneyAccountEntity MoneyAccount { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public Guid BaseCurrencyId { get; set; }
  public CurrencyEntity BaseCurrency { get; set; } = null!;
  public decimal ExchangeRate { get; set; } = 1m;
  public Guid? ContactId { get; set; }
  public ContactEntity? Contact { get; set; }
  public string? PayeeName { get; set; }
  public string? Reference { get; set; }
  public string? Notes { get; set; }
  public decimal TotalAmount { get; set; }
  public decimal BaseTotalAmount { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public Guid? PostedByUserId { get; set; }
  public UserEntity? PostedByUser { get; set; }
  public Guid? JournalEntryId { get; set; }
  public JournalEntryEntity? JournalEntry { get; set; }
  public ICollection<ExpenseLineEntity> Lines { get; set; } = new List<ExpenseLineEntity>();
}

public enum ExpenseDocumentStatus
{
  Draft = 0,
  Posted = 1
}
