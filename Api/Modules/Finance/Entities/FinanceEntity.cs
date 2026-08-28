using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Purchase;
using Api.Modules.Sales;
using Api.Modules.User;

namespace Api.Modules.Finance;

public sealed class MoneyAccountEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
  public MoneyAccountType Type { get; set; }
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public Guid AccountingAccountId { get; set; }
  public AccountEntity AccountingAccount { get; set; } = null!;
  public bool IsActive { get; set; } = true;
  public string? Notes { get; set; }
  public string? BankName { get; set; }
  public string? AccountNumberOrIban { get; set; }
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public ICollection<MoneyAccountAccessEntity> AccessAssignments { get; set; } = new List<MoneyAccountAccessEntity>();
  public ICollection<MoneyLedgerEntryEntity> LedgerEntries { get; set; } = new List<MoneyLedgerEntryEntity>();
}

public sealed class MoneyAccountAccessEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid MoneyAccountId { get; set; }
  public MoneyAccountEntity MoneyAccount { get; set; } = null!;
  public Guid UserId { get; set; }
  public UserEntity User { get; set; } = null!;
  public MoneyAccountAccessLevel AccessLevel { get; set; }
}

public sealed class MoneyLedgerEntryEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid MoneyAccountId { get; set; }
  public MoneyAccountEntity MoneyAccount { get; set; } = null!;
  public DateOnly MovementDate { get; set; }
  public MoneyLedgerSourceType SourceType { get; set; }
  public Guid SourceDocumentId { get; set; }
  public string DocumentNumber { get; set; } = string.Empty;
  public decimal Amount { get; set; }
  public decimal BaseAmount { get; set; }
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public Guid BaseCurrencyId { get; set; }
  public CurrencyEntity BaseCurrency { get; set; } = null!;
  public decimal ExchangeRate { get; set; } = 1m;
  public Guid JournalEntryId { get; set; }
  public JournalEntryEntity JournalEntry { get; set; } = null!;
  public Guid PerformedByUserId { get; set; }
  public UserEntity PerformedByUser { get; set; } = null!;
  public string? Notes { get; set; }
  public DateTime PostedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class ExchangeRateEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid FromCurrencyId { get; set; }
  public CurrencyEntity FromCurrency { get; set; } = null!;
  public Guid ToCurrencyId { get; set; }
  public CurrencyEntity ToCurrency { get; set; } = null!;
  public decimal Rate { get; set; }
  public DateTime EffectiveAtUtc { get; set; }
  public bool IsActive { get; set; } = true;
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class MoneyTransferEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public DateOnly TransferDate { get; set; }
  public Guid SourceMoneyAccountId { get; set; }
  public MoneyAccountEntity SourceMoneyAccount { get; set; } = null!;
  public Guid DestinationMoneyAccountId { get; set; }
  public MoneyAccountEntity DestinationMoneyAccount { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public Guid BaseCurrencyId { get; set; }
  public CurrencyEntity BaseCurrency { get; set; } = null!;
  public decimal Amount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal BaseAmount { get; set; }
  public FinanceDocumentStatus Status { get; set; } = FinanceDocumentStatus.Draft;
  public string? Notes { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public Guid? JournalEntryId { get; set; }
  public JournalEntryEntity? JournalEntry { get; set; }
}

public sealed class SupplierPaymentEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid SupplierId { get; set; }
  public ContactEntity Supplier { get; set; } = null!;
  public DateOnly PaymentDate { get; set; }
  public Guid MoneyAccountId { get; set; }
  public MoneyAccountEntity MoneyAccount { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public Guid BaseCurrencyId { get; set; }
  public CurrencyEntity BaseCurrency { get; set; } = null!;
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal TotalAmount { get; set; }
  public decimal BaseTotalAmount { get; set; }
  public FinanceDocumentStatus Status { get; set; } = FinanceDocumentStatus.Draft;
  public string? Notes { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public Guid? JournalEntryId { get; set; }
  public JournalEntryEntity? JournalEntry { get; set; }
  public ICollection<SupplierPaymentAllocationEntity> Allocations { get; set; } = new List<SupplierPaymentAllocationEntity>();
}

public sealed class SupplierPaymentAllocationEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid SupplierPaymentId { get; set; }
  public SupplierPaymentEntity SupplierPayment { get; set; } = null!;
  public Guid PurchaseInvoiceId { get; set; }
  public PurchaseInvoiceEntity PurchaseInvoice { get; set; } = null!;
  public decimal Amount { get; set; }
  public decimal BaseAmount { get; set; }
}

public sealed class CustomerReceiptEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid CustomerId { get; set; }
  public ContactEntity Customer { get; set; } = null!;
  public DateOnly ReceiptDate { get; set; }
  public Guid MoneyAccountId { get; set; }
  public MoneyAccountEntity MoneyAccount { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public Guid BaseCurrencyId { get; set; }
  public CurrencyEntity BaseCurrency { get; set; } = null!;
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal TotalAmount { get; set; }
  public decimal BaseTotalAmount { get; set; }
  public FinanceDocumentStatus Status { get; set; } = FinanceDocumentStatus.Draft;
  public string? Notes { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public Guid? JournalEntryId { get; set; }
  public JournalEntryEntity? JournalEntry { get; set; }
  public ICollection<CustomerReceiptAllocationEntity> Allocations { get; set; } = new List<CustomerReceiptAllocationEntity>();
}

public sealed class CustomerReceiptAllocationEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid CustomerReceiptId { get; set; }
  public CustomerReceiptEntity CustomerReceipt { get; set; } = null!;
  public Guid SalesInvoiceId { get; set; }
  public SalesInvoiceEntity SalesInvoice { get; set; } = null!;
  public decimal Amount { get; set; }
  public decimal BaseAmount { get; set; }
}

public enum MoneyAccountType { Cashbox, Bank }
public enum MoneyAccountAccessLevel { View, Operate }
public enum MoneyLedgerSourceType { OpeningBalance, MoneyTransfer, SupplierPayment, CustomerReceipt, PosSale, Expense }
public enum FinanceDocumentStatus { Draft, Posted }
