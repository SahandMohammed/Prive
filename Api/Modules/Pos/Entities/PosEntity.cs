using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Sales;
using Api.Modules.User;

namespace Api.Modules.Pos;

public sealed class PosRegisterEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public bool IsActive { get; set; } = true;
  public ICollection<PosSessionEntity> Sessions { get; set; } = new List<PosSessionEntity>();
}

public sealed class PosSessionEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string SessionNumber { get; set; } = string.Empty;
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid RegisterId { get; set; }
  public PosRegisterEntity Register { get; set; } = null!;
  public Guid CashierUserId { get; set; }
  public UserEntity CashierUser { get; set; } = null!;
  public PosSessionStatus Status { get; set; } = PosSessionStatus.Open;
  public DateTimeOffset OpenedAtUtc { get; set; } = DateTimeOffset.UtcNow;
  public DateTimeOffset? ClosedAtUtc { get; set; }
  public Guid? ClosedByUserId { get; set; }
  public UserEntity? ClosedByUser { get; set; }
  public string? OpeningNotes { get; set; }
  public string? ClosingNotes { get; set; }
  public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
  public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
  public ICollection<PosSessionOpeningCountEntity> OpeningCounts { get; set; } = new List<PosSessionOpeningCountEntity>();
  public ICollection<PosSessionClosingCountEntity> ClosingCounts { get; set; } = new List<PosSessionClosingCountEntity>();
  public ICollection<PosSaleEntity> Sales { get; set; } = new List<PosSaleEntity>();
  public ICollection<PosRefundEntity> Refunds { get; set; } = new List<PosRefundEntity>();
  public ICollection<PosDrawerMovementEntity> DrawerMovements { get; set; } = new List<PosDrawerMovementEntity>();
  public PosZReportEntity? ZReport { get; set; }
}

public sealed class PosSessionOpeningCountEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PosSessionId { get; set; }
  public PosSessionEntity PosSession { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public decimal Amount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal BaseAmount { get; set; }
}

public sealed class PosSessionClosingCountEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PosSessionId { get; set; }
  public PosSessionEntity PosSession { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public decimal ExpectedAmount { get; set; }
  public decimal CountedAmount { get; set; }
  public decimal VarianceAmount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal ExpectedBaseAmount { get; set; }
  public decimal CountedBaseAmount { get; set; }
  public decimal VarianceBaseAmount { get; set; }
}

public sealed class PosZReportEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string ReportNumber { get; set; } = string.Empty;
  public Guid PosSessionId { get; set; }
  public PosSessionEntity PosSession { get; set; } = null!;
  public Guid BranchId { get; set; }
  public string BranchCode { get; set; } = string.Empty;
  public string BranchName { get; set; } = string.Empty;
  public Guid RegisterId { get; set; }
  public string RegisterCode { get; set; } = string.Empty;
  public string RegisterName { get; set; } = string.Empty;
  public Guid CashierUserId { get; set; }
  public string CashierUsername { get; set; } = string.Empty;
  public Guid ClosedByUserId { get; set; }
  public string ClosedByUsername { get; set; } = string.Empty;
  public Guid BaseCurrencyId { get; set; }
  public string BaseCurrencyCode { get; set; } = string.Empty;
  public DateTimeOffset OpenedAtUtc { get; set; }
  public DateTimeOffset ClosedAtUtc { get; set; }
  public DateTimeOffset GeneratedAtUtc { get; set; } = DateTimeOffset.UtcNow;
  public int SaleCount { get; set; }
  public decimal ServiceSalesBase { get; set; }
  public decimal ProductSalesBase { get; set; }
  public decimal GrossSalesBase { get; set; }
  public int RefundCount { get; set; }
  public decimal ServiceRefundsBase { get; set; }
  public decimal ProductRefundsBase { get; set; }
  public decimal RefundTotalBase { get; set; }
  // Null only for immutable Z reports created before refunds existed; responses
  // derive those legacy snapshots as gross (there could have been no refunds).
  public decimal? NetSalesBase { get; set; }
  public ICollection<PosZPaymentSummaryEntity> PaymentSummaries { get; set; } = new List<PosZPaymentSummaryEntity>();
  public ICollection<PosZDrawerSummaryEntity> DrawerSummaries { get; set; } = new List<PosZDrawerSummaryEntity>();
}

public sealed class PosZPaymentSummaryEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PosZReportId { get; set; }
  public PosZReportEntity PosZReport { get; set; } = null!;
  public Guid MoneyAccountId { get; set; }
  public string MoneyAccountCode { get; set; } = string.Empty;
  public string MoneyAccountName { get; set; } = string.Empty;
  public MoneyAccountType MoneyAccountType { get; set; }
  public Guid CurrencyId { get; set; }
  public string CurrencyCode { get; set; } = string.Empty;
  public decimal TenderedAmount { get; set; }
  public decimal ChangeAmount { get; set; }
  public decimal RefundAmount { get; set; }
  public decimal NetAmount { get; set; }
  public decimal TenderedBaseAmount { get; set; }
  public decimal ChangeBaseAmount { get; set; }
  public decimal RefundBaseAmount { get; set; }
  public decimal NetBaseAmount { get; set; }
}

public sealed class PosZDrawerSummaryEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PosZReportId { get; set; }
  public PosZReportEntity PosZReport { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public string CurrencyCode { get; set; } = string.Empty;
  public decimal OpeningAmount { get; set; }
  public decimal TenderedAmount { get; set; }
  public decimal ChangeAmount { get; set; }
  public decimal RefundAmount { get; set; }
  public decimal ExpectedAmount { get; set; }
  public decimal CountedAmount { get; set; }
  public decimal VarianceAmount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal OpeningBaseAmount { get; set; }
  public decimal TenderedBaseAmount { get; set; }
  public decimal ChangeBaseAmount { get; set; }
  public decimal RefundBaseAmount { get; set; }
  public decimal ExpectedBaseAmount { get; set; }
  public decimal CountedBaseAmount { get; set; }
  public decimal VarianceBaseAmount { get; set; }
  public decimal CashInAmount { get; set; }
  public decimal CashOutAmount { get; set; }
  public decimal CashDropAmount { get; set; }
  public decimal AdjustmentAmount { get; set; }
  public decimal CashInBaseAmount { get; set; }
  public decimal CashOutBaseAmount { get; set; }
  public decimal CashDropBaseAmount { get; set; }
  public decimal AdjustmentBaseAmount { get; set; }
}

public sealed class PosSaleEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid SalesInvoiceId { get; set; }
  public SalesInvoiceEntity SalesInvoice { get; set; } = null!;
  public Guid? PosSessionId { get; set; }
  public PosSessionEntity? PosSession { get; set; }
  public PosSaleStatus Status { get; set; } = PosSaleStatus.Completed;
  public Guid CashierUserId { get; set; }
  public UserEntity CashierUser { get; set; } = null!;
  public DateTime CompletedAtUtc { get; set; } = DateTime.UtcNow;
  public Guid? ClientRequestId { get; set; }
  public string? RequestFingerprint { get; set; }
  public ICollection<PosTenderEntity> Tenders { get; set; } = new List<PosTenderEntity>();
  public PosChangeEntity? Change { get; set; }
  public ICollection<PosRefundEntity> Refunds { get; set; } = new List<PosRefundEntity>();
}

public sealed class PosTenderEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PosSaleId { get; set; }
  public PosSaleEntity PosSale { get; set; } = null!;
  public int Sequence { get; set; }
  public Guid MoneyAccountId { get; set; }
  public MoneyAccountEntity MoneyAccount { get; set; } = null!;
  public decimal TenderedAmount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal BaseAmount { get; set; }
  public Guid MoneyLedgerEntryId { get; set; }
  public MoneyLedgerEntryEntity MoneyLedgerEntry { get; set; } = null!;
}

public sealed class PosChangeEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PosSaleId { get; set; }
  public PosSaleEntity PosSale { get; set; } = null!;
  public Guid MoneyAccountId { get; set; }
  public MoneyAccountEntity MoneyAccount { get; set; } = null!;
  public decimal Amount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal BaseAmount { get; set; }
  public Guid MoneyLedgerEntryId { get; set; }
  public MoneyLedgerEntryEntity MoneyLedgerEntry { get; set; } = null!;
}

public sealed class PosRefundEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid PosSaleId { get; set; }
  public PosSaleEntity PosSale { get; set; } = null!;
  public Guid SalesInvoiceId { get; set; }
  public SalesInvoiceEntity SalesInvoice { get; set; } = null!;
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid PosSessionId { get; set; }
  public PosSessionEntity PosSession { get; set; } = null!;
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
  public ICollection<PosRefundTenderEntity> Tenders { get; set; } = new List<PosRefundTenderEntity>();
}

public sealed class PosDrawerMovementEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid PosSessionId { get; set; }
  public PosSessionEntity PosSession { get; set; } = null!;
  public Guid BranchId { get; set; }
  public Guid CashboxMoneyAccountId { get; set; }
  public MoneyAccountEntity CashboxMoneyAccount { get; set; } = null!;
  public Guid? DestinationMoneyAccountId { get; set; }
  public MoneyAccountEntity? DestinationMoneyAccount { get; set; }
  public Guid? OffsetAccountId { get; set; }
  public AccountEntity? OffsetAccount { get; set; }
  public PosDrawerMovementType Type { get; set; }
  public PosDrawerAdjustmentDirection? AdjustmentDirection { get; set; }
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public decimal Amount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal BaseAmount { get; set; }
  public string Reason { get; set; } = string.Empty;
  public string? Notes { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public Guid JournalEntryId { get; set; }
  public JournalEntryEntity JournalEntry { get; set; } = null!;
  public Guid CashboxLedgerEntryId { get; set; }
  public MoneyLedgerEntryEntity CashboxLedgerEntry { get; set; } = null!;
  public Guid? DestinationLedgerEntryId { get; set; }
  public MoneyLedgerEntryEntity? DestinationLedgerEntry { get; set; }
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

public sealed class PosRefundTenderEntity
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

public enum PosSaleStatus
{
  Completed
}

public enum PosSessionStatus
{
  Open,
  Closed
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

public enum PosDrawerMovementType
{
  CashIn,
  CashOut,
  CashDrop,
  Adjustment
}

public enum PosDrawerAdjustmentDirection
{
  In,
  Out
}
