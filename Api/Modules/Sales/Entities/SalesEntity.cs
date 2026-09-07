using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.User;

namespace Api.Modules.Sales;

public sealed class ServiceCategoryEntity : Api.Shared.Persistence.IBranchCatalogEntity
{
  public Guid? CatalogBranchId { get; set; }
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public bool IsActive { get; set; } = true;
  public ICollection<ServiceEntity> Services { get; set; } = new List<ServiceEntity>();
}

public sealed class ServiceEntity : Api.Shared.Persistence.IBranchCatalogEntity
{
  public Guid? CatalogBranchId { get; set; }
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public Guid CategoryId { get; set; }
  public ServiceCategoryEntity Category { get; set; } = null!;
  public decimal SellingPriceBase { get; set; }
  public int DurationMinutes { get; set; }
  public Guid RevenueAccountId { get; set; }
  public AccountEntity RevenueAccount { get; set; } = null!;
  public bool IsActive { get; set; } = true;
  public string? Description { get; set; }
  public ICollection<SalesInvoiceLineEntity> SalesInvoiceLines { get; set; } = new List<SalesInvoiceLineEntity>();
}

public sealed class SalesInvoiceEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public Guid? CustomerId { get; set; }
  public ContactEntity? Customer { get; set; }
  public DateOnly InvoiceDate { get; set; }
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid? WarehouseId { get; set; }
  public WarehouseEntity? Warehouse { get; set; }
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public Guid BaseCurrencyId { get; set; }
  public CurrencyEntity BaseCurrency { get; set; } = null!;
  public decimal ExchangeRate { get; set; } = 1m;
  public decimal Subtotal { get; set; }
  public decimal Total { get; set; }
  public decimal BaseTotal { get; set; }
  public SalesInvoiceStatus Status { get; set; } = SalesInvoiceStatus.Draft;
  public string? Notes { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public Guid? JournalEntryId { get; set; }
  public JournalEntryEntity? JournalEntry { get; set; }
  public ICollection<SalesInvoiceLineEntity> Lines { get; set; } = new List<SalesInvoiceLineEntity>();
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
  public ICollection<CustomerReceiptAllocationEntity> ReceiptAllocations { get; set; } = new List<CustomerReceiptAllocationEntity>();
  public PosSaleEntity? PosSale { get; set; }
}

public sealed class SalesInvoiceLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid SalesInvoiceId { get; set; }
  public SalesInvoiceEntity SalesInvoice { get; set; } = null!;
  public SalesLineType LineType { get; set; }
  public Guid? ServiceId { get; set; }
  public ServiceEntity? Service { get; set; }
  public Guid? ProductId { get; set; }
  public ProductEntity? Product { get; set; }
  public Guid? UnitOfMeasureId { get; set; }
  public UnitOfMeasureEntity? UnitOfMeasure { get; set; }
  public string? Description { get; set; }
  public decimal Quantity { get; set; }
  public UnitConversionOperation? ConversionOperation { get; set; }
  public decimal ConversionFactor { get; set; } = 1m;
  public decimal BaseQuantity { get; set; }
  public decimal UnitPrice { get; set; }
  public decimal BaseUnitPrice { get; set; }
  public bool IsPriceOverridden { get; set; }
  public decimal LineSubtotal { get; set; }
  public decimal LineAmount { get; set; }
  public decimal BaseLineAmount { get; set; }
  public Guid? ProfessionalUserId { get; set; }
  public UserEntity? ProfessionalUser { get; set; }
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public enum SalesInvoiceStatus
{
  Draft,
  Posted
}

public enum SalesLineType
{
  Service,
  Product
}
