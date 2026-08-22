using System.ComponentModel.DataAnnotations;
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

public sealed class SalesInvoiceListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? CustomerId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public Guid? BranchId { get; init; }
  public Guid? CurrencyId { get; init; }
  public SalesInvoiceStatus? Status { get; init; }
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
  [Required] SalesLineType LineType,
  Guid? ServiceId,
  Guid? ProductId,
  Guid? UnitOfMeasureId,
  [MaxLength(500)] string? Description,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Quantity,
  [Range(typeof(decimal), "0", "9999999999999")] decimal UnitPrice,
  Guid? ProfessionalUserId = null);

public sealed record SalesInvoiceDraftRequest(
  Guid? CustomerId,
  [Required] DateOnly InvoiceDate,
  [Required] Guid BranchId,
  Guid? WarehouseId,
  [Required] Guid CurrencyId,
  decimal? ExchangeRate,
  [MaxLength(1000)] string? Notes,
  [Required, MinLength(1)] List<SalesInvoiceLineRequest> Lines);

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

public sealed record SalesInvoiceListResponse(
  Guid Id,
  string DocumentNumber,
  Guid? CustomerId,
  string? CustomerName,
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
  Guid? ProfessionalUserId,
  string? ProfessionalUsername,
  string? Description,
  decimal Quantity,
  decimal UnitPrice,
  decimal LineSubtotal,
  decimal LineAmount,
  decimal BaseLineAmount);

public sealed record SalesInvoiceReceiptResponse(
  Guid CustomerReceiptId,
  string CustomerReceiptDocumentNumber,
  DateOnly ReceiptDate,
  decimal Amount,
  decimal BaseAmount,
  Guid? JournalEntryId);

public sealed record SalesInvoiceResponse(
  Guid Id,
  string DocumentNumber,
  Guid? CustomerId,
  string? CustomerName,
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
  decimal ReceivedAmount,
  decimal OutstandingAmount,
  SalesInvoicePaymentStatus PaymentStatus,
  List<SalesInvoiceReceiptResponse> Receipts,
  List<Guid> StockMovementIds,
  List<SalesInvoiceLineResponse> Lines);

public enum SalesInvoicePaymentStatus
{
  Unpaid,
  PartiallyPaid,
  Paid
}
