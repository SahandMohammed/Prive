using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Finance;

public sealed class MoneyAccountListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public MoneyAccountType? Type { get; init; }
  public Guid? BranchId { get; init; }
  public Guid? CurrencyId { get; init; }
  public bool? IsActive { get; init; }
}

public sealed record MoneyAccountRequest(
  [Required, MaxLength(32)] string Code,
  [Required, MaxLength(200)] string Name,
  [Required] MoneyAccountType Type,
  [Required] Guid BranchId,
  [Required] Guid CurrencyId,
  [Required] Guid AccountingAccountId,
  bool IsActive,
  [MaxLength(1000)] string? Notes,
  [MaxLength(200)] string? BankName,
  [MaxLength(100)] string? AccountNumberOrIban);

public sealed record MoneyAccountResponse(
  Guid Id,
  string Code,
  string Name,
  MoneyAccountType Type,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  Guid CurrencyId,
  string CurrencyCode,
  Guid AccountingAccountId,
  string AccountingAccountCode,
  string AccountingAccountName,
  decimal Balance,
  bool IsActive,
  string? Notes,
  string? BankName,
  string? AccountNumberOrIban,
  MoneyAccountAccessLevel? CurrentUserAccess,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc);

public sealed record MoneyAccountAccessRequest(
  [Required] Guid UserId,
  [Required] MoneyAccountAccessLevel AccessLevel);

public sealed record ReplaceMoneyAccountAccessRequest(
  [Required] List<MoneyAccountAccessRequest> Assignments);

public sealed record MoneyAccountAccessResponse(
  Guid UserId,
  string Username,
  MoneyAccountAccessLevel AccessLevel);

public sealed record OpeningMoneyBalanceRequest(
  [Required] DateOnly Date,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount,
  decimal? ExchangeRate,
  [MaxLength(1000)] string? Notes);

public sealed class MoneyLedgerQuery : PaginationRequest
{
  public Guid? MoneyAccountId { get; init; }
  public Guid? BranchId { get; init; }
  public Guid? CurrencyId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public MoneyLedgerSourceType? SourceType { get; init; }
  public string? DocumentNumber { get; init; }
}

public sealed record MoneyLedgerEntryResponse(
  Guid Id,
  DateOnly MovementDate,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid BranchId,
  string BranchName,
  Guid CurrencyId,
  string CurrencyCode,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  MoneyLedgerSourceType SourceType,
  Guid SourceDocumentId,
  string DocumentNumber,
  decimal AmountIn,
  decimal AmountOut,
  decimal Amount,
  decimal BaseAmount,
  decimal ExchangeRate,
  Guid JournalEntryId,
  Guid PerformedByUserId,
  string PerformedByUsername,
  string? Notes,
  DateTime PostedAtUtc);

public sealed class ExchangeRateListQuery : PaginationRequest
{
  public Guid? FromCurrencyId { get; init; }
  public Guid? ToCurrencyId { get; init; }
  public bool? IsActive { get; init; }
}

public sealed record CreateExchangeRateRequest(
  [Required] Guid FromCurrencyId,
  [Required] Guid ToCurrencyId,
  [Range(typeof(decimal), "0.000001", "9999999999999")] decimal Rate,
  [Required] DateTime EffectiveAtUtc);

public sealed record ExchangeRateResponse(
  Guid Id,
  Guid FromCurrencyId,
  string FromCurrencyCode,
  Guid ToCurrencyId,
  string ToCurrencyCode,
  decimal Rate,
  DateTime EffectiveAtUtc,
  bool IsActive,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc);

public sealed class MoneyTransferListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? MoneyAccountId { get; init; }
  public Guid? CurrencyId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public FinanceDocumentStatus? Status { get; init; }
}

public sealed record MoneyTransferDraftRequest(
  [Required] DateOnly TransferDate,
  [Required] Guid SourceMoneyAccountId,
  [Required] Guid DestinationMoneyAccountId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount,
  [MaxLength(1000)] string? Notes);

public sealed record MoneyTransferResponse(
  Guid Id,
  string DocumentNumber,
  DateOnly TransferDate,
  Guid SourceMoneyAccountId,
  string SourceMoneyAccountCode,
  string SourceMoneyAccountName,
  Guid DestinationMoneyAccountId,
  string DestinationMoneyAccountCode,
  string DestinationMoneyAccountName,
  Guid CurrencyId,
  string CurrencyCode,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  decimal Amount,
  decimal ExchangeRate,
  decimal BaseAmount,
  FinanceDocumentStatus Status,
  string? Notes,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc,
  DateTime? PostedAtUtc,
  Guid? JournalEntryId);

public sealed class SupplierPaymentListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? SupplierId { get; init; }
  public Guid? MoneyAccountId { get; init; }
  public Guid? CurrencyId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public FinanceDocumentStatus? Status { get; init; }
}

public sealed record SupplierPaymentAllocationRequest(
  [Required] Guid PurchaseInvoiceId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount);

public sealed record SupplierPaymentDraftRequest(
  [Required] Guid SupplierId,
  [Required] DateOnly PaymentDate,
  [Required] Guid MoneyAccountId,
  decimal? ExchangeRate,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal TotalAmount,
  [MaxLength(1000)] string? Notes,
  [Required, MinLength(1)] List<SupplierPaymentAllocationRequest> Allocations);

public sealed record SupplierPaymentAllocationResponse(
  Guid Id,
  Guid PurchaseInvoiceId,
  string PurchaseInvoiceDocumentNumber,
  decimal Amount,
  decimal BaseAmount);

public sealed record SupplierPaymentResponse(
  Guid Id,
  string DocumentNumber,
  Guid SupplierId,
  string SupplierName,
  DateOnly PaymentDate,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid CurrencyId,
  string CurrencyCode,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  decimal ExchangeRate,
  decimal TotalAmount,
  decimal BaseTotalAmount,
  FinanceDocumentStatus Status,
  string? Notes,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc,
  DateTime? PostedAtUtc,
  Guid? JournalEntryId,
  List<SupplierPaymentAllocationResponse> Allocations);

public sealed record OutstandingPurchaseInvoiceResponse(
  Guid Id,
  string DocumentNumber,
  DateOnly InvoiceDate,
  Guid SupplierId,
  string SupplierName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal ExchangeRate,
  decimal OriginalTotal,
  decimal PaidAmount,
  decimal OutstandingAmount);

public sealed record FinanceSupplierResponse(Guid Id, string Name);

public sealed class CustomerReceiptListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public Guid? CustomerId { get; init; }
  public Guid? BranchId { get; init; }
  public Guid? MoneyAccountId { get; init; }
  public Guid? CurrencyId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public FinanceDocumentStatus? Status { get; init; }
}

public sealed record CustomerReceiptAllocationRequest(
  [Required] Guid SalesInvoiceId,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal Amount);

public sealed record CustomerReceiptDraftRequest(
  [Required] Guid CustomerId,
  [Required] DateOnly ReceiptDate,
  [Required] Guid MoneyAccountId,
  decimal? ExchangeRate,
  [Range(typeof(decimal), "0.0001", "9999999999999")] decimal TotalAmount,
  [MaxLength(1000)] string? Notes,
  [Required, MinLength(1)] List<CustomerReceiptAllocationRequest> Allocations);

public sealed record CustomerReceiptAllocationResponse(
  Guid Id,
  Guid SalesInvoiceId,
  string SalesInvoiceDocumentNumber,
  DateOnly SalesInvoiceDate,
  decimal SalesInvoiceTotal,
  decimal Amount,
  decimal BaseAmount);

public sealed record CustomerReceiptListResponse(
  Guid Id,
  string DocumentNumber,
  Guid CustomerId,
  string CustomerName,
  DateOnly ReceiptDate,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid BranchId,
  string BranchName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal TotalAmount,
  FinanceDocumentStatus Status,
  Guid CreatedByUserId,
  string CreatedByUsername);

public sealed record CustomerReceiptResponse(
  Guid Id,
  string DocumentNumber,
  Guid CustomerId,
  string CustomerName,
  DateOnly ReceiptDate,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid BranchId,
  string BranchName,
  Guid CurrencyId,
  string CurrencyCode,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  decimal ExchangeRate,
  decimal TotalAmount,
  decimal BaseTotalAmount,
  FinanceDocumentStatus Status,
  string? Notes,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc,
  DateTime? PostedAtUtc,
  Guid? JournalEntryId,
  Guid? MoneyLedgerEntryId,
  List<CustomerReceiptAllocationResponse> Allocations);

public sealed record OutstandingSalesInvoiceResponse(
  Guid Id,
  string DocumentNumber,
  DateOnly InvoiceDate,
  Guid CustomerId,
  string CustomerName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal ExchangeRate,
  decimal OriginalTotal,
  decimal ReceivedAmount,
  decimal OutstandingAmount);

public sealed record FinanceCustomerResponse(Guid Id, string Name);
