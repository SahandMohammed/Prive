using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Expenses;

public sealed record ExpenseCategoryRequest(
  [Required, MaxLength(32)] string Code,
  [Required, MaxLength(100)] string Name,
  [Required] Guid AccountingAccountId,
  bool IsActive = true,
  [MaxLength(500)] string? Description = null);

public sealed record ExpenseCategoryResponse(
  Guid Id,
  string Code,
  string Name,
  Guid AccountingAccountId,
  string AccountingAccountCode,
  string AccountingAccountName,
  bool IsActive,
  string? Description,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc);

public sealed record ExpenseCategoryOptionResponse(
  Guid Id,
  string Code,
  string Name,
  Guid AccountingAccountId,
  string AccountingAccountCode,
  string AccountingAccountName);

public sealed class ExpenseCategoryListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public bool? IsActive { get; init; }
}

public sealed record ExpenseLineRequest(
  [Required] Guid ExpenseCategoryId,
  [MaxLength(500)] string? Description,
  [Required, Range(0.0001, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")] decimal Amount);

public sealed record ExpenseDraftRequest(
  [Required] Guid BranchId,
  [Required] DateOnly ExpenseDate,
  [Required] Guid MoneyAccountId,
  decimal? ExchangeRate,
  Guid? ContactId,
  [MaxLength(200)] string? PayeeName,
  [MaxLength(100)] string? Reference,
  [MaxLength(1000)] string? Notes,
  [Required, MinLength(1, ErrorMessage = "At least one expense line is required.")] List<ExpenseLineRequest> Lines);

public sealed record ExpenseLineResponse(
  Guid Id,
  Guid ExpenseCategoryId,
  string ExpenseCategoryCode,
  string ExpenseCategoryName,
  string? Description,
  decimal Amount,
  decimal BaseAmount,
  Guid? ExpenseAccountingAccountId,
  string? ExpenseAccountingAccountCode,
  string? ExpenseAccountingAccountName);

public sealed record ExpenseResponse(
  Guid Id,
  string DocumentNumber,
  ExpenseDocumentStatus Status,
  DateOnly ExpenseDate,
  Guid BranchId,
  string BranchName,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid CurrencyId,
  string CurrencyCode,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  decimal ExchangeRate,
  Guid? ContactId,
  string? ContactName,
  string? PayeeName,
  string? Reference,
  string? Notes,
  decimal TotalAmount,
  decimal BaseTotalAmount,
  Guid CreatedByUserId,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime UpdatedAtUtc,
  DateTime? PostedAtUtc,
  Guid? PostedByUserId,
  string? PostedByUsername,
  Guid? JournalEntryId,
  Guid? MoneyLedgerEntryId,
  List<ExpenseLineResponse> Lines);

public sealed record ExpenseListSummaryResponse(
  Guid Id,
  string DocumentNumber,
  ExpenseDocumentStatus Status,
  DateOnly ExpenseDate,
  Guid BranchId,
  string BranchName,
  Guid MoneyAccountId,
  string MoneyAccountCode,
  string MoneyAccountName,
  Guid CurrencyId,
  string CurrencyCode,
  decimal ExchangeRate,
  Guid? ContactId,
  string? ContactName,
  string? PayeeName,
  string? Reference,
  decimal TotalAmount,
  decimal BaseTotalAmount,
  string CreatedByUsername,
  DateTime CreatedAtUtc,
  DateTime? PostedAtUtc);

public sealed class ExpenseListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public DateOnly? DateFrom { get; init; }
  public DateOnly? DateTo { get; init; }
  public ExpenseDocumentStatus? Status { get; init; }
  public Guid? BranchId { get; init; }
  public Guid? MoneyAccountId { get; init; }
  public Guid? ExpenseCategoryId { get; init; }
  public Guid? ContactId { get; init; }
}

public sealed record ExpenseSummaryResponse(
  decimal TotalExpenses,
  decimal BaseTotalExpenses,
  int Count);
