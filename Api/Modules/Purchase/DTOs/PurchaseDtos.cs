using System.ComponentModel.DataAnnotations;
using Api.Modules.Inventory;
using Api.Shared.Pagination;

namespace Api.Modules.Purchase;

public sealed class PurchaseInvoiceListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? SupplierId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public Guid? BranchId { get; init; }
  public Guid? WarehouseId { get; init; }
  public Guid? CurrencyId { get; init; }
  public PurchaseInvoiceStatus? Status { get; init; }
}

public sealed record PurchaseInvoiceLineRequest(
  [Required] Guid ProductId,
  [Required] Guid UnitOfMeasureId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Quantity,
  [Range(typeof(decimal), "0", "9999999999999")] decimal UnitCost,
  bool UseMasterPrice = false);

public sealed record PurchaseInvoiceDraftRequest(
  [Required] Guid SupplierId,
  [Required] DateOnly InvoiceDate,
  [MaxLength(100)] string? SupplierReference,
  [Required] Guid BranchId,
  [Required] Guid WarehouseId,
  [Required] Guid CurrencyId,
  decimal? ExchangeRate,
  [MaxLength(1000)] string? Notes,
  [Required, MinLength(1)] List<PurchaseInvoiceLineRequest> Lines);

public sealed record PurchaseInvoiceListResponse(
  Guid Id,
  string DocumentNumber,
  Guid SupplierId,
  string SupplierName,
  DateOnly InvoiceDate,
  string? SupplierReference,
  Guid BranchId,
  string BranchName,
  Guid WarehouseId,
  string WarehouseName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal Total,
  decimal BaseTotal,
  PurchaseInvoiceStatus Status,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc,
  DateTime? PostedAtUtc);

public sealed record PurchaseInvoiceLineResponse(
  Guid Id,
  Guid ProductId,
  string ProductName,
  string SKU,
  Guid UnitOfMeasureId,
  string UnitCode,
  decimal Quantity,
  UnitConversionOperation? ConversionOperation,
  decimal ConversionFactor,
  decimal BaseQuantity,
  decimal UnitCost,
  decimal BaseUnitCost,
  bool IsPriceOverridden,
  decimal LineSubtotal,
  decimal LineAmount,
  decimal BaseLineAmount);

public sealed record PurchaseInvoiceResponse(
  Guid Id,
  string DocumentNumber,
  Guid SupplierId,
  string SupplierName,
  DateOnly InvoiceDate,
  string? SupplierReference,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  Guid WarehouseId,
  string WarehouseCode,
  string WarehouseName,
  Guid CurrencyId,
  string CurrencyCode,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  decimal ExchangeRate,
  decimal Subtotal,
  decimal Total,
  decimal BaseTotal,
  PurchaseInvoiceStatus Status,
  string? Notes,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc,
  DateTime? PostedAtUtc,
  Guid? JournalEntryId,
  List<Guid> StockMovementIds,
  List<PurchaseInvoiceLineResponse> Lines);
