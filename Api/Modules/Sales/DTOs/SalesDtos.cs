using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Shared.Pagination;

namespace Api.Modules.Sales;

public sealed class ServiceCategoryListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public bool? IsActive { get; init; }
}

public sealed class ServiceListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? CategoryId { get; init; }
  public bool? IsActive { get; init; }
}

public sealed class SalesCatalogQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? CategoryId { get; init; }
  public Guid? WarehouseId { get; init; }
  public SalesLineType? ItemType { get; init; }
  public bool? IsActive { get; init; }
}

public sealed class SalesInvoiceListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? CustomerId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public Guid? BranchId { get; init; }
  public Guid? CurrencyId { get; init; }
  public SalesInvoiceStatus? Status { get; init; }
  public string? SortBy { get; init; }
  public bool? SortDescending { get; init; }
}

public sealed class DeletedSalesInvoiceListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
}

public sealed record ServiceCategoryRequest(
  [Required, MaxLength(100)] string Name,
  bool IsActive = true);

public sealed record ServiceRequest(
  [Required, MaxLength(200)] string Name,
  [Required] Guid CategoryId,
  [Range(typeof(decimal), "0", "9999999999999")] decimal SellingPriceBase,
  [Range(1, 1440)] int DurationMinutes,
  [Required] Guid RevenueAccountId,
  bool IsActive,
  [MaxLength(1000)] string? Description);

public sealed record SalesInvoiceLineRequest(
  SalesLineType? LineType = null,
  Guid? ServiceId = null,
  Guid? ProductId = null,
  Guid? UnitOfMeasureId = null,
  [MaxLength(500)] string? Description = null,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Quantity = 1,
  [Range(typeof(decimal), "0", "9999999999999")] decimal UnitPrice = 0,
  Guid? ProfessionalId = null,
  bool UseMasterPrice = false,
  Guid? ItemId = null);

public sealed record SalesInvoiceDraftRequest(
  Guid? CustomerId,
  [Required] DateOnly InvoiceDate,
  [Required] Guid BranchId,
  Guid? WarehouseId,
  [Required] Guid CurrencyId,
  decimal? ExchangeRate,
  [MaxLength(1000)] string? Notes,
  [Required, MinLength(1)] List<SalesInvoiceLineRequest> Lines,
  List<EmbeddedSalesInvoicePaymentRequest>? Payments = null);

public sealed record EmbeddedSalesInvoicePaymentRequest(
  [Required] DateOnly PaymentDate,
  [Required] Guid MoneyAccountId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount,
  decimal? ExchangeRate,
  [MaxLength(1000)] string? Notes);

public sealed record UpdatePostedSalesInvoiceRequest(
  [MaxLength(1000)] string? Reason,
  [Required] DateTime ExpectedUpdatedAtUtc,
  Guid? CustomerId,
  [Required] DateOnly InvoiceDate,
  [Required] Guid BranchId,
  Guid? WarehouseId,
  [Required] Guid CurrencyId,
  decimal? ExchangeRate,
  [MaxLength(1000)] string? Notes,
  [Required, MinLength(1)] List<SalesInvoiceLineRequest> Lines);

public sealed record DeletePostedSalesInvoiceRequest(
  [Required, MinLength(1), MaxLength(1000)] string Reason,
  [Required] DateTime ExpectedUpdatedAtUtc);

public sealed record ServiceCategoryResponse(Guid Id, string Name, bool IsActive);

public sealed record ServiceResponse(
  Guid Id,
  string Name,
  Guid CategoryId,
  string CategoryName,
  decimal SellingPriceBase,
  int DurationMinutes,
  Guid RevenueAccountId,
  string RevenueAccountCode,
  string RevenueAccountName,
  bool IsActive,
  string? Description);

public sealed record SalesCatalogItemResponse(
  Guid Id,
  string Name,
  SalesLineType Type,
  decimal BasePrice,
  Guid CategoryId,
  string CategoryName,
  string? SKU,
  Guid? UnitOfMeasureId,
  string? UnitName,
  string? UnitCode,
  int? DurationMinutes,
  bool IsActive,
  decimal? AvailableQuantity,
  IReadOnlyList<ProductUnitConversionResponse> UnitConversions);

public sealed record SalesInvoiceListResponse(
  Guid Id,
  string DocumentNumber,
  Guid CustomerId,
  string CustomerName,
  DateOnly InvoiceDate,
  Guid BranchId,
  string BranchName,
  Guid? WarehouseId,
  string? WarehouseName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal Total,
  decimal BaseTotal,
  SalesInvoiceStatus Status,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc,
  DateTime? PostedAtUtc);

public sealed record SalesInvoiceLineResponse(
  Guid Id,
  SalesLineType LineType,
  Guid? ServiceId,
  string? ServiceName,
  Guid? ProductId,
  string? ProductName,
  string? SKU,
  Guid? UnitOfMeasureId,
  string? UnitCode,
  Guid? ProfessionalId,
  string? ProfessionalName,
  string? Description,
  decimal Quantity,
  UnitConversionOperation? ConversionOperation,
  decimal ConversionFactor,
  decimal BaseQuantity,
  decimal UnitPrice,
  decimal BaseUnitPrice,
  bool IsPriceOverridden,
  decimal LineSubtotal,
  decimal LineAmount,
  decimal BaseLineAmount);

public sealed record SalesInvoicePaymentResponse(
  Guid PaymentId,
  string PaymentDocumentNumber,
  DateOnly PaymentDate,
  decimal Amount,
  decimal BaseAmount,
  PaymentOrigin Origin,
  Guid JournalEntryId);

public sealed record SalesInvoicePosContextResponse(
  Guid PosSessionId,
  string PosSessionNumber,
  PosSessionStatus SessionStatus,
  Guid CashierUserId,
  string CashierUsername,
  Guid? PaymentId,
  string? PaymentDocumentNumber,
  PosPaymentMode PaymentMode,
  DateTime CompletedAtUtc,
  List<PosSessionCountResponse> SessionCashboxes,
  List<PosTenderResponse> Tenders,
  PosChangeResponse? Change);

public sealed record SalesInvoiceResponse(
  Guid Id,
  string DocumentNumber,
  Guid CustomerId,
  string CustomerName,
  DateOnly InvoiceDate,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  Guid? WarehouseId,
  string? WarehouseCode,
  string? WarehouseName,
  Guid CurrencyId,
  string CurrencyCode,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  decimal ExchangeRate,
  decimal Subtotal,
  decimal Total,
  decimal BaseTotal,
  SalesInvoiceStatus Status,
  string? Notes,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc,
  DateTime? PostedAtUtc,
  Guid? JournalEntryId,
  decimal CollectedAmount,
  decimal ReceivableReductionAmount,
  decimal OutstandingAmount,
  decimal OverpaidAmount,
  SalesInvoicePaymentStatus PaymentStatus,
  List<SalesInvoicePaymentResponse> Payments,
  List<Guid> StockMovementIds,
  List<SalesInvoiceLineResponse> Lines,
  SalesInvoicePosContextResponse? PosContext);

public sealed record SalesInvoiceHistoryResponse(
  Guid Id,
  string Action,
  string? Reason,
  Guid ChangedByUserId,
  string ChangedByUsername,
  DateTime ChangedAtUtc,
  JsonElement? BeforeState,
  JsonElement? AfterState);

public sealed record DeletedSalesInvoiceResponse(
  Guid Id,
  string DocumentNumber,
  DateOnly InvoiceDate,
  Guid BranchId,
  string BranchName,
  Guid CustomerId,
  string CustomerName,
  decimal Total,
  decimal BaseTotal,
  DateTime? PostedAtUtc,
  DateTime DeletedAtUtc,
  Guid DeletedByUserId,
  string DeletedByUsername,
  string DeleteReason,
  bool IsPosSale);

public enum SalesInvoicePaymentStatus
{
  Unpaid,
  PartiallyPaid,
  Paid,
  Overpaid
}
