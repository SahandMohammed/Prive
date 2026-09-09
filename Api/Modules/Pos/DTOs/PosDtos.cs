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
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
}

public sealed class PosRegisterListQuery : PaginationRequest
{
  public bool IncludeInactive { get; init; }
}

public sealed class PosSessionListQuery : PaginationRequest
{
  [EnumDataType(typeof(PosSessionStatus))]
  public PosSessionStatus? Status { get; init; }
  public Guid? RegisterId { get; init; }
  public Guid? CashierUserId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
}

public sealed class PosZReportListQuery : PaginationRequest
{
  public Guid? RegisterId { get; init; }
  public Guid? CashierUserId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
}

public sealed record PosSaleLineRequest(
  [Required] SalesLineType LineType,
  Guid? ServiceId,
  Guid? ProductId,
  Guid? UnitOfMeasureId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Quantity,
  Guid? ProfessionalUserId);

public sealed record PosTenderRequest(
  [Required] Guid MoneyAccountId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount);

public sealed record PosChangeRequest(
  [Required] Guid MoneyAccountId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount);

public sealed record CompletePosSaleRequest(
  [Required] Guid BranchId,
  [Required] Guid PosSessionId,
  Guid? WarehouseId,
  Guid? CustomerId,
  [Required, EnumDataType(typeof(PosPaymentMode))] PosPaymentMode PaymentMode,
  [Required, MinLength(1)] List<PosSaleLineRequest> Lines,
  [Required] List<PosTenderRequest> Tenders,
  PosChangeRequest? Change);

public sealed record CreatePosRegisterRequest(
  [Required, MaxLength(32)] string Code,
  [Required, MaxLength(120)] string Name);

public sealed record UpdatePosRegisterRequest(
  [Required, MaxLength(32)] string Code,
  [Required, MaxLength(120)] string Name,
  bool IsActive);

public sealed record PosOpeningCountRequest(
  [Required] Guid CurrencyId,
  [Range(typeof(decimal), "0", "9999999999999")] decimal Amount);

public sealed record OpenPosSessionRequest(
  [Required] Guid RegisterId,
  [Required] List<PosOpeningCountRequest> OpeningCounts,
  [MaxLength(500)] string? Notes);

public sealed record PosClosingCountRequest(
  [Required] Guid CurrencyId,
  [Range(typeof(decimal), "0", "9999999999999")] decimal CountedAmount);

public sealed record ClosePosSessionRequest(
  [Required] List<PosClosingCountRequest> ClosingCounts,
  [MaxLength(500)] string? Notes);

public sealed record PosBranchResponse(Guid Id, string Code, string Name, bool IsMainBranch);

public sealed record PosWarehouseResponse(Guid Id, string Code, string Name, Guid BranchId);

public sealed record PosCategoryResponse(Guid Id, string Name, PosCatalogItemType ItemType);

public sealed record PosProfessionalResponse(Guid Id, string Username);

public sealed record PosMoneyAccountResponse(
  Guid Id,
  string Code,
  string Name,
  MoneyAccountType Type,
  Guid BranchId,
  Guid CurrencyId,
  string CurrencyCode,
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

public sealed record PosRegisterResponse(
  Guid Id,
  string Code,
  string Name,
  Guid BranchId,
  bool IsActive);

public sealed record PosSessionCountResponse(
  Guid CurrencyId,
  string CurrencyCode,
  decimal Amount,
  decimal ExchangeRate,
  decimal BaseAmount);

public sealed record PosSessionResponse(
  Guid Id,
  string SessionNumber,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  Guid RegisterId,
  string RegisterCode,
  string RegisterName,
  Guid CashierUserId,
  string CashierUsername,
  PosSessionStatus Status,
  DateTimeOffset OpenedAtUtc,
  DateTimeOffset? ClosedAtUtc,
  Guid? ClosedByUserId,
  string? ClosedByUsername,
  string? OpeningNotes,
  string? ClosingNotes,
  List<PosSessionCountResponse> OpeningCounts);

public sealed record PosSessionListResponse(
  Guid Id,
  string SessionNumber,
  Guid RegisterId,
  string RegisterCode,
  string RegisterName,
  Guid CashierUserId,
  string CashierUsername,
  PosSessionStatus Status,
  DateTimeOffset OpenedAtUtc,
  DateTimeOffset? ClosedAtUtc,
  int SaleCount,
  decimal GrossSalesBase,
  decimal VarianceBase,
  string BaseCurrencyCode);

public sealed record PosPaymentSummaryResponse(
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  MoneyAccountType MoneyAccountType,
  Guid CurrencyId,
  string CurrencyCode,
  decimal TenderedAmount,
  decimal ChangeAmount,
  decimal NetAmount,
  decimal TenderedBaseAmount,
  decimal ChangeBaseAmount,
  decimal NetBaseAmount);

public sealed record PosDrawerSummaryResponse(
  Guid CurrencyId,
  string CurrencyCode,
  decimal OpeningAmount,
  decimal TenderedAmount,
  decimal ChangeAmount,
  decimal ExpectedAmount,
  decimal? CountedAmount,
  decimal? VarianceAmount,
  decimal OpeningBaseAmount,
  decimal TenderedBaseAmount,
  decimal ChangeBaseAmount,
  decimal ExpectedBaseAmount,
  decimal? CountedBaseAmount,
  decimal? VarianceBaseAmount);

public sealed record PosXReportResponse(
  PosSessionResponse Session,
  DateTimeOffset GeneratedAtUtc,
  int SaleCount,
  decimal ServiceSalesBase,
  decimal ProductSalesBase,
  decimal GrossSalesBase,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  List<PosPaymentSummaryResponse> Payments,
  List<PosDrawerSummaryResponse> Drawers);

public sealed record PosZReportListResponse(
  Guid Id,
  string ReportNumber,
  Guid PosSessionId,
  string SessionNumber,
  Guid RegisterId,
  string RegisterCode,
  string RegisterName,
  Guid CashierUserId,
  string CashierUsername,
  DateTimeOffset OpenedAtUtc,
  DateTimeOffset ClosedAtUtc,
  int SaleCount,
  decimal GrossSalesBase,
  decimal VarianceBase,
  string BaseCurrencyCode);

public sealed record PosZReportResponse(
  Guid Id,
  string ReportNumber,
  Guid PosSessionId,
  string SessionNumber,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  Guid RegisterId,
  string RegisterCode,
  string RegisterName,
  Guid CashierUserId,
  string CashierUsername,
  Guid ClosedByUserId,
  string ClosedByUsername,
  DateTimeOffset OpenedAtUtc,
  DateTimeOffset ClosedAtUtc,
  DateTimeOffset GeneratedAtUtc,
  int SaleCount,
  decimal ServiceSalesBase,
  decimal ProductSalesBase,
  decimal GrossSalesBase,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  List<PosPaymentSummaryResponse> Payments,
  List<PosDrawerSummaryResponse> Drawers);

public sealed record PosSaleListResponse(
  Guid Id,
  string DocumentNumber,
  DateTime CompletedAtUtc,
  Guid BranchId,
  string BranchName,
  Guid? CustomerId,
  string? CustomerName,
  decimal Total,
  string BaseCurrencyCode,
  string CashierUsername);

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
  Guid? ProfessionalUserId,
  string? ProfessionalUsername,
  decimal Quantity,
  UnitConversionOperation? ConversionOperation,
  decimal ConversionFactor,
  decimal BaseQuantity,
  decimal UnitPrice,
  decimal BaseUnitPrice,
  decimal LineTotal);

public sealed record PosTenderResponse(
  Guid Id,
  int Sequence,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal TenderedAmount,
  decimal ExchangeRate,
  decimal BaseAmount,
  Guid MoneyLedgerEntryId);

public sealed record PosChangeResponse(
  Guid Id,
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
  PosSaleStatus Status,
  Guid? PosSessionId,
  Guid SalesInvoiceId,
  Guid? CustomerId,
  string? CustomerName,
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
  decimal TenderedBaseAmount,
  decimal ChangeBaseAmount,
  decimal SettledBaseAmount,
  decimal OutstandingBaseAmount,
  PosPaymentMode PaymentMode,
  Guid CashierUserId,
  string CashierUsername,
  DateTime CompletedAtUtc,
  Guid JournalEntryId,
  List<Guid> StockMovementIds,
  List<PosSaleLineResponse> Lines,
  List<PosTenderResponse> Tenders,
  PosChangeResponse? Change);

public enum PosCatalogItemType
{
  Service,
  Product
}

public enum PosPaymentMode
{
  Paid,
  Partial,
  Credit
}
