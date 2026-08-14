using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Inventory;

public class MasterListQuery : PaginationRequest { public string? Search { get; init; } public bool? IsActive { get; init; } }
public sealed class ProductListQuery : MasterListQuery { public Guid? CategoryId { get; init; } public ProductPurpose? Purpose { get; init; } }
public sealed class WarehouseListQuery : MasterListQuery { public Guid? BranchId { get; init; } }
public sealed class StockBalanceListQuery : PaginationRequest { public Guid? ProductId { get; init; } public Guid? WarehouseId { get; init; } public Guid? BranchId { get; init; } public Guid? CategoryId { get; init; } public string? Search { get; init; } }
public sealed class StockMovementListQuery : PaginationRequest
{
  public string? DocumentNumber { get; init; }
  public InventoryDocumentType? DocumentType { get; init; }
  public Guid? ProductId { get; init; }
  public Guid? WarehouseId { get; init; }
  public Guid? BranchId { get; init; }
  public StockMovementType? Type { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
}

public class InventoryDocumentListQuery : PaginationRequest
{
  public string? DocumentNumber { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public Guid? BranchId { get; init; }
  public InventoryDocumentStatus? Status { get; init; }
}

public sealed class OpeningStockListQuery : InventoryDocumentListQuery { public Guid? WarehouseId { get; init; } }
public sealed class StockAdjustmentListQuery : InventoryDocumentListQuery { public Guid? WarehouseId { get; init; } }
public sealed class WarehouseTransferListQuery : InventoryDocumentListQuery { public Guid? SourceWarehouseId { get; init; } public Guid? DestinationWarehouseId { get; init; } }

public sealed record CategoryResponse(Guid Id, string Name, bool IsActive);
public sealed record UnitResponse(Guid Id, string Name, string Code, bool IsActive);
public sealed record WarehouseResponse(Guid Id, string Code, string Name, Guid BranchId, string BranchCode, string BranchName, bool IsActive);
public sealed record ProductResponse(Guid Id, string Name, string SKU, string? Barcode, Guid CategoryId, string CategoryName, Guid UnitOfMeasureId, string UnitCode, ProductPurpose Purpose, bool TrackInventory, bool IsActive, string? Description, string? ImageReference, decimal TotalQuantity, decimal AverageCostBase, decimal TotalValueBase);
public sealed record StockBalanceResponse(Guid ProductId, string ProductName, string SKU, string CategoryName, string UnitCode, Guid WarehouseId, string WarehouseCode, string WarehouseName, Guid BranchId, string BranchName, decimal Quantity, decimal AverageCostBase, decimal TotalValueBase);
public sealed record StockMovementResponse(Guid Id, DateOnly MovementDate, StockMovementType Type, Guid ProductId, string ProductName, string SKU, string UnitCode, Guid WarehouseId, string WarehouseCode, string WarehouseName, Guid BranchId, string BranchName, decimal QuantityIn, decimal QuantityOut, decimal UnitCostBase, string? Reference, string? Note, InventoryDocumentType? SourceDocumentType, Guid? SourceDocumentId, Guid? SourceDocumentLineId, string? DocumentNumber, Guid PerformedByUserId, string PerformedByUsername, DateTime CreatedAtUtc);

public sealed record OpeningStockListResponse(Guid Id, string DocumentNumber, DateOnly DocumentDate, Guid BranchId, string BranchName, Guid WarehouseId, string WarehouseName, int LineCount, decimal TotalValueBase, InventoryDocumentStatus Status, Guid CreatedByUserId, string CreatedByUsername, DateTime CreatedAtUtc, DateTime UpdatedAtUtc, DateTime? PostedAtUtc);
public sealed record OpeningStockLineResponse(Guid Id, Guid ProductId, string ProductName, string SKU, string UnitCode, decimal Quantity, decimal UnitCostBase, decimal LineValueBase);
public sealed record OpeningStockResponse(Guid Id, string DocumentNumber, DateOnly DocumentDate, Guid BranchId, string BranchCode, string BranchName, Guid WarehouseId, string WarehouseCode, string WarehouseName, InventoryDocumentStatus Status, string? Notes, Guid CreatedByUserId, string CreatedByUsername, DateTime CreatedAtUtc, DateTime UpdatedAtUtc, DateTime? PostedAtUtc, int LineCount, decimal TotalValueBase, IReadOnlyList<OpeningStockLineResponse> Lines);

public sealed record StockAdjustmentListResponse(Guid Id, string DocumentNumber, DateOnly DocumentDate, Guid BranchId, string BranchName, Guid WarehouseId, string WarehouseName, string Reason, int LineCount, InventoryDocumentStatus Status, Guid CreatedByUserId, string CreatedByUsername, DateTime CreatedAtUtc, DateTime UpdatedAtUtc, DateTime? PostedAtUtc);
public sealed record StockAdjustmentLineResponse(Guid Id, Guid ProductId, string ProductName, string SKU, string UnitCode, decimal SystemQuantity, decimal ActualQuantity, decimal Difference);
public sealed record StockAdjustmentResponse(Guid Id, string DocumentNumber, DateOnly DocumentDate, Guid BranchId, string BranchCode, string BranchName, Guid WarehouseId, string WarehouseCode, string WarehouseName, string Reason, string? Notes, InventoryDocumentStatus Status, Guid CreatedByUserId, string CreatedByUsername, DateTime CreatedAtUtc, DateTime UpdatedAtUtc, DateTime? PostedAtUtc, int LineCount, IReadOnlyList<StockAdjustmentLineResponse> Lines);

public sealed record WarehouseTransferListResponse(Guid Id, string DocumentNumber, DateOnly DocumentDate, Guid BranchId, string BranchName, Guid SourceWarehouseId, string SourceWarehouseName, Guid DestinationWarehouseId, string DestinationWarehouseName, int LineCount, InventoryDocumentStatus Status, Guid CreatedByUserId, string CreatedByUsername, DateTime CreatedAtUtc, DateTime UpdatedAtUtc, DateTime? PostedAtUtc);
public sealed record WarehouseTransferLineResponse(Guid Id, Guid ProductId, string ProductName, string SKU, string UnitCode, decimal AvailableSourceQuantity, decimal Quantity);
public sealed record WarehouseTransferResponse(Guid Id, string DocumentNumber, DateOnly DocumentDate, Guid BranchId, string BranchCode, string BranchName, Guid SourceWarehouseId, string SourceWarehouseCode, string SourceWarehouseName, Guid DestinationWarehouseId, string DestinationWarehouseCode, string DestinationWarehouseName, string? Notes, InventoryDocumentStatus Status, Guid CreatedByUserId, string CreatedByUsername, DateTime CreatedAtUtc, DateTime UpdatedAtUtc, DateTime? PostedAtUtc, int LineCount, IReadOnlyList<WarehouseTransferLineResponse> Lines);

public sealed record CreateCategoryRequest([Required, MaxLength(100)] string Name, bool IsActive = true);
public sealed record UpdateCategoryRequest([Required, MaxLength(100)] string Name, bool IsActive);
public sealed record CreateUnitRequest([Required, MaxLength(100)] string Name, [Required, MaxLength(20)] string Code, bool IsActive = true);
public sealed record UpdateUnitRequest([Required, MaxLength(100)] string Name, [Required, MaxLength(20)] string Code, bool IsActive);
public sealed record CreateProductRequest([Required, MaxLength(250)] string Name, [Required, MaxLength(64)] string SKU, [MaxLength(64)] string? Barcode, [Required] Guid CategoryId, [Required] Guid UnitOfMeasureId, ProductPurpose Purpose, bool TrackInventory, bool IsActive, [MaxLength(1000)] string? Description, [MaxLength(2048)] string? ImageReference);
public sealed record UpdateProductRequest([Required, MaxLength(250)] string Name, [Required, MaxLength(64)] string SKU, [MaxLength(64)] string? Barcode, [Required] Guid CategoryId, [Required] Guid UnitOfMeasureId, ProductPurpose Purpose, bool TrackInventory, bool IsActive, [MaxLength(1000)] string? Description, [MaxLength(2048)] string? ImageReference);
public sealed record CreateWarehouseRequest([Required, MaxLength(32)] string Code, [Required, MaxLength(200)] string Name, [Required] Guid BranchId, bool IsActive = true);
public sealed record UpdateWarehouseRequest([Required, MaxLength(32)] string Code, [Required, MaxLength(200)] string Name, [Required] Guid BranchId, bool IsActive);

public sealed record OpeningStockLineRequest([Required] Guid ProductId, [Range(typeof(decimal), "0.0001", "999999999999999")] decimal Quantity, [Range(typeof(decimal), "0", "999999999999999")] decimal UnitCostBase);
public sealed record OpeningStockDraftRequest([Required] Guid BranchId, [Required] Guid WarehouseId, [Required] DateOnly DocumentDate, [Required, MinLength(1)] IReadOnlyList<OpeningStockLineRequest> Lines, [MaxLength(1000)] string? Notes);

public sealed record StockAdjustmentLineRequest([Required] Guid ProductId, [Range(typeof(decimal), "0", "999999999999999")] decimal ActualQuantity);
public sealed record StockAdjustmentDraftRequest([Required] Guid BranchId, [Required] Guid WarehouseId, [Required] DateOnly DocumentDate, [Required, MaxLength(500)] string Reason, [MaxLength(1000)] string? Notes, [Required, MinLength(1)] IReadOnlyList<StockAdjustmentLineRequest> Lines);

public sealed record WarehouseTransferLineRequest([Required] Guid ProductId, [Range(typeof(decimal), "0.0001", "999999999999999")] decimal Quantity);
public sealed record WarehouseTransferDraftRequest([Required] Guid BranchId, [Required] Guid SourceWarehouseId, [Required] Guid DestinationWarehouseId, [Required] DateOnly DocumentDate, [MaxLength(1000)] string? Notes, [Required, MinLength(1)] IReadOnlyList<WarehouseTransferLineRequest> Lines);
