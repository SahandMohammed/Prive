using Api.Modules.Branch;
using Api.Modules.Purchase;
using Api.Modules.Finance;
using Api.Modules.Sales;
using Api.Modules.Expenses;

namespace Api.Modules.Accounting;

public sealed class JournalEntryEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public DateOnly EntryDate { get; set; }
  public string? Reference { get; set; }
  public string Description { get; set; } = string.Empty;
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
  public JournalEntryType Type { get; set; } = JournalEntryType.Standard;
  public DateTime? PostedAtUtc { get; set; }
  public Guid? ReversalOfJournalId { get; set; }
  public JournalEntryEntity? ReversalOfJournal { get; set; }
  public ICollection<JournalEntryEntity> ReversalJournals { get; set; } = new List<JournalEntryEntity>();
  public ICollection<JournalLineEntity> Lines { get; set; } = new List<JournalLineEntity>();
  public PurchaseInvoiceEntity? SourcePurchaseInvoice { get; set; }
  public SalesInvoiceEntity? SourceSalesInvoice { get; set; }
  public MoneyTransferEntity? SourceMoneyTransfer { get; set; }
  public SupplierPaymentEntity? SourceSupplierPayment { get; set; }
  public CustomerReceiptEntity? SourceCustomerReceipt { get; set; }
  public ExpenseDocumentEntity? SourceExpenseDocument { get; set; }
}

public enum JournalEntryStatus
{
  Draft,
  Posted,
  Reversed
}

public enum JournalEntryType
{
  Standard,
  Opening,
  Reversal
}
