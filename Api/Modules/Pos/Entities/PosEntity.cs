using Api.Modules.Branch;
using Api.Modules.Currency;
using Api.Modules.Finance;
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
  public decimal NetAmount { get; set; }
  public decimal TenderedBaseAmount { get; set; }
  public decimal ChangeBaseAmount { get; set; }
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
  public decimal ExpectedAmount { get; set; }
  public decimal CountedAmount { get; set; }
  public decimal VarianceAmount { get; set; }
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal OpeningBaseAmount { get; set; }
  public decimal TenderedBaseAmount { get; set; }
  public decimal ChangeBaseAmount { get; set; }
  public decimal ExpectedBaseAmount { get; set; }
  public decimal CountedBaseAmount { get; set; }
  public decimal VarianceBaseAmount { get; set; }
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
  public ICollection<PosTenderEntity> Tenders { get; set; } = new List<PosTenderEntity>();
  public PosChangeEntity? Change { get; set; }
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

public enum PosSaleStatus
{
  Completed
}

public enum PosSessionStatus
{
  Open,
  Closed
}
