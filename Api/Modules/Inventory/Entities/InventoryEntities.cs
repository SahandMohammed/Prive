using Api.Modules.Branch;
using Api.Modules.Purchase;
using Api.Modules.Sales;
using Api.Modules.User;

namespace Api.Modules.Inventory;

public sealed class ProductCategoryEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public bool IsActive { get; set; } = true;
  public ICollection<ProductEntity> Products { get; set; } = new List<ProductEntity>();
}

public sealed class UnitOfMeasureEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public string Code { get; set; } = string.Empty;
  public bool IsActive { get; set; } = true;
  public ICollection<ProductEntity> Products { get; set; } = new List<ProductEntity>();
}

public sealed class ProductEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public string SKU { get; set; } = string.Empty;
  public string? Barcode { get; set; }
  public Guid CategoryId { get; set; }
  public ProductCategoryEntity Category { get; set; } = null!;
  public Guid UnitOfMeasureId { get; set; }
  public UnitOfMeasureEntity UnitOfMeasure { get; set; } = null!;
  public ProductPurpose Purpose { get; set; }
  public decimal SellingPriceBase { get; set; }
  public bool TrackInventory { get; set; } = true;
  public bool IsActive { get; set; } = true;
  public string? Description { get; set; }
  public string? ImageReference { get; set; }
  public ICollection<StockMovementEntity> StockMovements { get; set; } = new List<StockMovementEntity>();
}

public sealed class WarehouseEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public bool IsActive { get; set; } = true;
  public ICollection<StockMovementEntity> StockMovements { get; set; } = new List<StockMovementEntity>();
}

public sealed class OpeningStockDocumentEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public DateOnly DocumentDate { get; set; }
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid WarehouseId { get; set; }
  public WarehouseEntity Warehouse { get; set; } = null!;
  public InventoryDocumentStatus Status { get; set; } = InventoryDocumentStatus.Draft;
  public string? Notes { get; set; }
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public ICollection<OpeningStockLineEntity> Lines { get; set; } = new List<OpeningStockLineEntity>();
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public sealed class OpeningStockLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid OpeningStockDocumentId { get; set; }
  public OpeningStockDocumentEntity Document { get; set; } = null!;
  public Guid ProductId { get; set; }
  public ProductEntity Product { get; set; } = null!;
  public decimal Quantity { get; set; }
  public decimal UnitCostBase { get; set; }
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public sealed class StockAdjustmentDocumentEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public DateOnly DocumentDate { get; set; }
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid WarehouseId { get; set; }
  public WarehouseEntity Warehouse { get; set; } = null!;
  public string Reason { get; set; } = string.Empty;
  public string? Notes { get; set; }
  public InventoryDocumentStatus Status { get; set; } = InventoryDocumentStatus.Draft;
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public ICollection<StockAdjustmentLineEntity> Lines { get; set; } = new List<StockAdjustmentLineEntity>();
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public sealed class StockAdjustmentLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid StockAdjustmentDocumentId { get; set; }
  public StockAdjustmentDocumentEntity Document { get; set; } = null!;
  public Guid ProductId { get; set; }
  public ProductEntity Product { get; set; } = null!;
  public decimal SystemQuantity { get; set; }
  public decimal ActualQuantity { get; set; }
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public sealed class WarehouseTransferDocumentEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string DocumentNumber { get; set; } = string.Empty;
  public DateOnly DocumentDate { get; set; }
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid SourceWarehouseId { get; set; }
  public WarehouseEntity SourceWarehouse { get; set; } = null!;
  public Guid DestinationWarehouseId { get; set; }
  public WarehouseEntity DestinationWarehouse { get; set; } = null!;
  public string? Notes { get; set; }
  public InventoryDocumentStatus Status { get; set; } = InventoryDocumentStatus.Draft;
  public Guid CreatedByUserId { get; set; }
  public UserEntity CreatedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime? PostedAtUtc { get; set; }
  public ICollection<WarehouseTransferLineEntity> Lines { get; set; } = new List<WarehouseTransferLineEntity>();
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public sealed class WarehouseTransferLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid WarehouseTransferDocumentId { get; set; }
  public WarehouseTransferDocumentEntity Document { get; set; } = null!;
  public Guid ProductId { get; set; }
  public ProductEntity Product { get; set; } = null!;
  public decimal AvailableSourceQuantity { get; set; }
  public decimal Quantity { get; set; }
  public ICollection<StockMovementEntity> Movements { get; set; } = new List<StockMovementEntity>();
}

public sealed class StockMovementEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid ProductId { get; set; }
  public ProductEntity Product { get; set; } = null!;
  public Guid WarehouseId { get; set; }
  public WarehouseEntity Warehouse { get; set; } = null!;
  public StockMovementType Type { get; set; }
  public DateOnly MovementDate { get; set; }
  public decimal QuantityIn { get; set; }
  public decimal QuantityOut { get; set; }
  public decimal UnitCostBase { get; set; }
  public string? Reference { get; set; }
  public string? Note { get; set; }
  public Guid? TransferId { get; set; }
  public Guid? OpeningStockDocumentId { get; set; }
  public OpeningStockDocumentEntity? OpeningStockDocument { get; set; }
  public Guid? OpeningStockLineId { get; set; }
  public OpeningStockLineEntity? OpeningStockLine { get; set; }
  public Guid? StockAdjustmentDocumentId { get; set; }
  public StockAdjustmentDocumentEntity? StockAdjustmentDocument { get; set; }
  public Guid? StockAdjustmentLineId { get; set; }
  public StockAdjustmentLineEntity? StockAdjustmentLine { get; set; }
  public Guid? WarehouseTransferDocumentId { get; set; }
  public WarehouseTransferDocumentEntity? WarehouseTransferDocument { get; set; }
  public Guid? WarehouseTransferLineId { get; set; }
  public WarehouseTransferLineEntity? WarehouseTransferLine { get; set; }
  public Guid? PurchaseInvoiceId { get; set; }
  public PurchaseInvoiceEntity? PurchaseInvoice { get; set; }
  public Guid? PurchaseInvoiceLineId { get; set; }
  public PurchaseInvoiceLineEntity? PurchaseInvoiceLine { get; set; }
  public Guid? SalesInvoiceId { get; set; }
  public SalesInvoiceEntity? SalesInvoice { get; set; }
  public Guid? SalesInvoiceLineId { get; set; }
  public SalesInvoiceLineEntity? SalesInvoiceLine { get; set; }
  public Guid PerformedByUserId { get; set; }
  public UserEntity PerformedByUser { get; set; } = null!;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public enum ProductPurpose { Resale, Consumable, Both }
public enum StockMovementType { OpeningStock, PositiveAdjustment, NegativeAdjustment, TransferOut, TransferIn, Purchase, Sale }
public enum InventoryDocumentType { OpeningStock, Adjustment, Transfer, Purchase, SalesInvoice, PosSale }
public enum InventoryDocumentStatus { Draft, Posted }
