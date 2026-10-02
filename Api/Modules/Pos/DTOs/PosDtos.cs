using System.ComponentModel.DataAnnotations;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Sales;
using Api.Shared.Pagination;

namespace Api.Modules.Pos;

public sealed class PosCatalogQuery : PaginationRequest
{
  public string? Search { get; init; }
  [EnumDataType(typeof(PosCatalogItemType))]
  public PosCatalogItemType? ItemType { get; init; }
  public Guid? CategoryId { get; init; }
  public Guid? WarehouseId { get; init; }
}

public sealed class PosCustomerListQuery : PaginationRequest
{
  public string? Search { get; init; }
}

public sealed class PosSaleListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? CustomerId { get; init; }
  public Guid? BranchId { get; init; }
  [EnumDataType(typeof(PosRefundState))]
  public PosRefundState? RefundState { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
}

public sealed class PosRefundListQuery : PaginationRequest { }

public sealed record PosSaleLineRequest(
  [Required] SalesLineType LineType,
  Guid? ServiceId,
  Guid? ProductId,
  Guid? UnitOfMeasureId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Quantity,
  Guid? ProfessionalId);

public sealed record CollectionMoneyLineRequest(
  [Required] Guid MoneyAccountId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount);

public sealed record ChangeMoneyLineRequest(
  [Required] Guid MoneyAccountId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount);

public sealed record CompletePosSaleRequest(
  [Required] Guid BranchId,
  Guid? WarehouseId,
  Guid? CustomerId,
  [Required, MinLength(1)] List<PosSaleLineRequest> Lines,
  [Required] List<CollectionMoneyLineRequest> Collections,
  ChangeMoneyLineRequest? Change,
  [EnumDataType(typeof(PosPaymentMode))] PosPaymentMode PaymentMode = PosPaymentMode.Paid,
  [Required] Guid ClientRequestId = default);

public sealed record CorrectPosSettlementRequest(
  [Required, EnumDataType(typeof(PosPaymentMode))] PosPaymentMode PaymentMode,
  [Required] List<CollectionMoneyLineRequest> Collections,
  ChangeMoneyLineRequest? Change,
  [Required, MinLength(1), MaxLength(1000)] string Reason,
  [Required] DateTime ExpectedUpdatedAtUtc);

public sealed record PosRefundLineRequest(
  [Required] Guid SalesInvoiceLineId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Quantity,
  bool RestockProduct);

public sealed record PosRefundPayoutRequest(
  [Required] Guid MoneyAccountId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount);

public sealed record CreatePosRefundRequest(
  [Required, EnumDataType(typeof(PosRefundReason))] PosRefundReason Reason,
  [MaxLength(1000)] string? Notes,
  [Required, MinLength(1)] List<PosRefundLineRequest> Lines,
  [Required] List<PosRefundPayoutRequest> RefundPayouts,
  [Required] Guid ClientRequestId = default);

public sealed record VoidPosSaleRequest(
  [Required, EnumDataType(typeof(PosRefundReason))] PosRefundReason Reason,
  [MaxLength(1000)] string? Notes,
  [Required] List<Guid> RestockSalesInvoiceLineIds,
  [Required] List<PosRefundPayoutRequest> RefundPayouts,
  [Required] Guid ClientRequestId = default);

public sealed record PosBranchResponse(Guid Id, string Code, string Name, bool IsMainBranch);
public sealed record PosWarehouseResponse(Guid Id, string Code, string Name, Guid BranchId);
public sealed record PosCategoryResponse(Guid Id, string Name, PosCatalogItemType ItemType);
public sealed record PosProfessionalResponse(Guid Id, string Name);

public sealed record PosMoneyAccountResponse(
  Guid Id,
  string Code,
  string Name,
  MoneyAccountType Type,
  Guid BranchId,
  Guid CurrencyId,
  string CurrencyCode,
  int CurrencyDecimalPlaces,
  decimal Balance,
  decimal? CurrentExchangeRate);

public sealed record PosSetupResponse(
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  List<PosBranchResponse> Branches,
  List<PosWarehouseResponse> Warehouses,
  List<PosCategoryResponse> Categories,
  List<PosProfessionalResponse> Professionals,
  List<PosMoneyAccountResponse> MoneyAccounts);

public sealed record PosCatalogItemResponse(
  PosCatalogItemType ItemType,
  Guid Id,
  string Name,
  Guid CategoryId,
  string CategoryName,
  decimal UnitPriceBase,
  string? SKU,
  string? Barcode,
  Guid? UnitOfMeasureId,
  string? UnitName,
  string? UnitCode,
  decimal? AvailableQuantity,
  string? ImageReference,
  IReadOnlyList<ProductUnitConversionResponse> UnitConversions);

public sealed record PosCustomerResponse(Guid Id, string Name, string? PrimaryPhoneNumber);

public sealed record PosSaleListResponse(
  Guid Id,
  string DocumentNumber,
  DateTime CompletedAtUtc,
  Guid BranchId,
  string BranchName,
  Guid CustomerId,
  string CustomerName,
  decimal Total,
  decimal CollectedBaseAmount,
  decimal OutstandingBaseAmount,
  decimal OverpaidBaseAmount,
  decimal RefundedBaseAmount,
  decimal NetSaleBaseAmount,
  PosRefundState RefundStatus,
  SalesInvoicePaymentStatus PaymentStatus,
  string BaseCurrencyCode,
  string OperatorUsername);

public sealed record PosSaleLineResponse(
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
  decimal Quantity,
  UnitConversionOperation? ConversionOperation,
  decimal ConversionFactor,
  decimal BaseQuantity,
  decimal UnitPrice,
  decimal BaseUnitPrice,
  decimal LineTotal);

public sealed record PosPaymentMoneyLineResponse(
  Guid Id,
  int Sequence,
  PaymentMoneyDirection Direction,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal Amount,
  decimal ExchangeRate,
  decimal BaseAmount,
  Guid MoneyLedgerEntryId);

public sealed record PosSaleResponse(
  Guid Id,
  string DocumentNumber,
  Guid CustomerId,
  string CustomerName,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  Guid? WarehouseId,
  string? WarehouseCode,
  string? WarehouseName,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  decimal Subtotal,
  decimal Total,
  decimal GrossCollectionBaseAmount,
  decimal ChangeBaseAmount,
  decimal CollectedBaseAmount,
  decimal OutstandingBaseAmount,
  decimal OverpaidBaseAmount,
  decimal RefundedBaseAmount,
  decimal RemainingRefundableBaseAmount,
  decimal NetSaleBaseAmount,
  PosRefundState RefundStatus,
  SalesInvoicePaymentStatus PaymentStatus,
  Guid? PaymentId,
  string? PaymentDocumentNumber,
  Guid OperatorUserId,
  string OperatorUsername,
  DateTime CompletedAtUtc,
  DateTime UpdatedAtUtc,
  Guid JournalEntryId,
  List<Guid> StockMovementIds,
  List<PosSaleLineResponse> Lines,
  List<PosPaymentMoneyLineResponse> Collections,
  PosPaymentMoneyLineResponse? Change,
  List<PosRefundSummaryResponse> Refunds);

public sealed record PosRefundSummaryResponse(
  Guid Id,
  string DocumentNumber,
  bool IsVoid,
  PosRefundReason Reason,
  decimal TotalRefundBase,
  decimal ReceivableReversalBase,
  decimal CashRefundBase,
  DateTime PostedAtUtc,
  string ApprovedByUsername);

public sealed record PosRefundabilityLineResponse(
  Guid SalesInvoiceLineId,
  SalesLineType LineType,
  string Description,
  string? Sku,
  string? UnitCode,
  string? ProfessionalName,
  decimal OriginalQuantity,
  decimal RefundedQuantity,
  decimal RefundableQuantity,
  decimal OriginalLineAmountBase,
  decimal RefundedAmountBase,
  decimal RefundableAmountBase,
  bool CanRestock);

public sealed record PosRefundabilityResponse(
  Guid SalesInvoiceId,
  string SalesInvoiceDocumentNumber,
  Guid BranchId,
  Guid CustomerId,
  string CustomerName,
  Guid? WarehouseId,
  DateTime CompletedAtUtc,
  string OperatorUsername,
  decimal OriginalTotalBase,
  decimal RefundedBaseAmount,
  decimal RemainingRefundableBaseAmount,
  decimal CurrentOutstandingBaseAmount,
  PosRefundState RefundStatus,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  List<PosRefundabilityLineResponse> Lines,
  List<PosRefundSummaryResponse> Refunds);

public sealed record PosRefundLineResponse(
  Guid Id,
  Guid OriginalSalesInvoiceLineId,
  SalesLineType LineType,
  string Description,
  string? UnitCode,
  string? ProfessionalName,
  decimal Quantity,
  decimal BaseQuantity,
  decimal RefundAmountBase,
  bool RestockProduct,
  decimal? OriginalUnitCostBase,
  List<Guid> StockMovementIds);

public sealed record PosRefundPayoutResponse(
  Guid Id,
  int Sequence,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal Amount,
  decimal ExchangeRate,
  decimal BaseAmount,
  Guid MoneyLedgerEntryId);

public sealed record PosRefundResponse(
  Guid Id,
  string DocumentNumber,
  Guid SalesInvoiceId,
  string SalesInvoiceDocumentNumber,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  Guid CustomerId,
  string CustomerName,
  PosRefundReason Reason,
  string? Notes,
  bool IsVoid,
  PosRefundStatus Status,
  decimal TotalRefundBase,
  decimal ReceivableReversalBase,
  decimal CashRefundBase,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  Guid CreatedByUserId,
  string CreatedByUsername,
  Guid ApprovedByUserId,
  string ApprovedByUsername,
  DateTime CreatedAtUtc,
  DateTime PostedAtUtc,
  Guid JournalEntryId,
  List<PosRefundLineResponse> Lines,
  List<PosRefundPayoutResponse> RefundPayouts);

public enum PosCatalogItemType { Service, Product }
public enum PosPaymentMode { Paid, Partial, Credit }
