using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Inventory;
using Api.Modules.User;

namespace Api.Modules.Purchase;

public sealed class PurchaseInvoiceEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid SupplierId { get; set; }
  public ContactEntity Supplier { get; set; } = null!;
  public DateOnly InvoiceDate { get; set; }
  public string? SupplierReference { get; set; }
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid WarehouseId { get; set; }
  public WarehouseEntity Warehouse { get; set; } = null!;
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public Guid BaseCurrencyId { get; set; }
  public CurrencyEntity BaseCurrency { get; set; } = null!;
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal Subtotal { get; set; }
  public decimal Total { get; set; }
  public decimal BaseTotal { get; set; }
  public PurchaseInvoiceStatus Status { get; set; } = PurchaseInvoiceStatus.Draft;
  public string? Notes { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public Guid? JournalEntryId { get; set; }
  public JournalEntryEntity? JournalEntry { get; set; }
  public ICollection<PurchaseInvoiceLineEntity> Lines { get; set; } = new List<PurchaseInvoiceLineEntity>();
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public sealed class PurchaseInvoiceLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PurchaseInvoiceId { get; set; }
  public PurchaseInvoiceEntity PurchaseInvoice { get; set; } = null!;
  public Guid ProductId { get; set; }
  public ProductEntity Product { get; set; } = null!;
  public Guid UnitOfMeasureId { get; set; }
  public UnitOfMeasureEntity UnitOfMeasure { get; set; } = null!;
  public decimal Quantity { get; set; }
  public decimal UnitCost { get; set; }
  public decimal LineSubtotal { get; set; }
  public decimal LineAmount { get; set; }
  public decimal BaseLineAmount { get; set; }
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public enum PurchaseInvoiceStatus
{
  Draft,
  Posted
}
