using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Sales;
using Api.Modules.User;

namespace Api.Modules.Pos;

public sealed class PosContextEntity
{
  public Guid SalesInvoiceId { get; set; }
  public SalesInvoiceEntity SalesInvoice { get; set; } = null!;
  public Guid OperatorUserId { get; set; }
  public UserEntity OperatorUser { get; set; } = null!;
  public DateTime CompletedAtUtc { get; set; } = DateTime.UtcNow;
  public Guid? ClientRequestId { get; set; }
  public string? RequestFingerprint { get; set; }
  public ICollection<PosRefundEntity> Refunds { get; set; } = new List<PosRefundEntity>();
}

public sealed class PosRefundEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid SalesInvoiceId { get; set; }
  public SalesInvoiceEntity SalesInvoice { get; set; } = null!;
  public PosContextEntity PosContext { get; set; } = null!;
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid? CustomerId { get; set; }
  public ContactEntity? Customer { get; set; }
  public PosRefundReason Reason { get; set; }
  public string? Notes { get; set; }
  public bool IsVoid { get; set; }
  public PosRefundStatus Status { get; set; } = PosRefundStatus.Posted;
  public decimal TotalRefundBase { get; set; }
  public decimal ReceivableReversalBase { get; set; }
  public decimal CashRefundBase { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public Guid ApprovedByUserId { get; set; }
  public UserEntity ApprovedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime PostedAtUtc { get; set; } = DateTime.UtcNow;
  public Guid JournalEntryId { get; set; }
  public JournalEntryEntity JournalEntry { get; set; } = null!;
  public Guid? ClientRequestId { get; set; }
  public string? RequestFingerprint { get; set; }
  public ICollection<PosRefundLineEntity> Lines { get; set; } = new List<PosRefundLineEntity>();
  public ICollection<PosRefundPayoutEntity> RefundPayouts { get; set; } = new List<PosRefundPayoutEntity>();
}

public sealed class PosRefundLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PosRefundId { get; set; }
  public PosRefundEntity PosRefund { get; set; } = null!;
  public Guid OriginalSalesInvoiceLineId { get; set; }
  public SalesInvoiceLineEntity OriginalSalesInvoiceLine { get; set; } = null!;
  public SalesLineType LineType { get; set; }
  public Guid? ServiceId { get; set; }
  public Guid? ProductId { get; set; }
  public Guid? UnitOfMeasureId { get; set; }
  public Guid? ProfessionalId { get; set; }
  public string Description { get; set; } = string.Empty;
  public string? UnitCode { get; set; }
  public string? ProfessionalName { get; set; }
  public decimal Quantity { get; set; }
  public decimal BaseQuantity { get; set; }
  public decimal RefundAmountBase { get; set; }
  public bool RestockProduct { get; set; }
  public decimal? OriginalUnitCostBase { get; set; }
  public Guid RevenueAccountId { get; set; }
  public Guid? InventoryAccountId { get; set; }
  public Guid? CostOfGoodsSoldAccountId { get; set; }
  public ICollection<StockMovementEntity> StockMovements { get; set; } = new List<StockMovementEntity>();
}

public sealed class PosRefundPayoutEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PosRefundId { get; set; }
  public PosRefundEntity PosRefund { get; set; } = null!;
  public int Sequence { get; set; }
  public Guid MoneyAccountId { get; set; }
  public MoneyAccountEntity MoneyAccount { get; set; } = null!;
  public decimal Amount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal BaseAmount { get; set; }
  public Guid MoneyLedgerEntryId { get; set; }
  public MoneyLedgerEntryEntity MoneyLedgerEntry { get; set; } = null!;
}

public enum PosRefundStatus { Posted }

public enum PosRefundState { NotRefunded, PartiallyRefunded, FullyRefunded }

public enum PosRefundReason
{
  WrongServiceEntered,
  WrongProductEntered,
  CustomerComplaint,
  DuplicateSale,
  ProductReturned,
  ServiceIssue,
  CashierMistake,
  Other
}
