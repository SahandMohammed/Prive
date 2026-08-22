using Api.Modules.Finance;
using Api.Modules.Sales;
using Api.Modules.User;

namespace Api.Modules.Pos;

public sealed class PosSaleEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid SalesInvoiceId { get; set; }
  public SalesInvoiceEntity SalesInvoice { get; set; } = null!;
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
