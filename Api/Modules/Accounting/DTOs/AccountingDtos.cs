using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Accounting;

public sealed class AccountListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public AccountClassification? Classification { get; init; }
  public bool? IsActive { get; init; }
}

public sealed class AccountTreeQuery
{
  public string? Search { get; init; }
  public AccountClassification? Classification { get; init; }
  public bool? IsActive { get; init; }
  public bool PostingAccountsOnly { get; init; }
}

public sealed record AccountResponse(
  Guid Id,
  string Code,
  string Name,
  AccountClassification Classification,
  Guid? ParentAccountId,
  bool IsGroup,
  bool IsActive);

public sealed record CreateAccountRequest(
  [Required, MaxLength(32)] string Code,
  [Required, MaxLength(250)] string Name,
  [Required] AccountClassification Classification,
  Guid? ParentAccountId,
  bool IsGroup,
  bool IsActive = true);

public sealed record UpdateAccountRequest(
  [Required, MaxLength(32)] string Code,
  [Required, MaxLength(250)] string Name,
  [Required] AccountClassification Classification,
  Guid? ParentAccountId,
  bool IsGroup,
  bool IsActive);

public sealed class JournalListQuery : PaginationRequest
{
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public Guid? BranchId { get; init; }
  public JournalEntryStatus? Status { get; init; }
  public JournalEntryType? Type { get; init; }
  public string? Search { get; init; }
}

public sealed record JournalLineRequest(
  [Required] Guid AccountId,
  [MaxLength(1000)] string? Description,
  [Required] Guid CurrencyId,
  decimal OriginalDebitAmount,
  decimal OriginalCreditAmount,
  [Range(typeof(decimal), "0.000001", "9999999999999")] decimal ExchangeRate);

public sealed record CreateJournalEntryRequest(
  [Required] DateOnly EntryDate,
  [MaxLength(100)] string? Reference,
  [Required, MaxLength(1000)] string Description,
  [Required] Guid BranchId,
  [Required] JournalEntryType Type,
  [Required, MinLength(2)] List<JournalLineRequest> Lines);

public sealed record UpdateJournalEntryRequest(
  [Required] DateOnly EntryDate,
  [MaxLength(100)] string? Reference,
  [Required, MaxLength(1000)] string Description,
  [Required] Guid BranchId,
  [Required] JournalEntryType Type,
  [Required, MinLength(2)] List<JournalLineRequest> Lines);

public sealed record JournalLineResponse(
  Guid Id,
  Guid AccountId,
  string AccountCode,
  string AccountName,
  string? Description,
  Guid CurrencyId,
  string CurrencyCode,
  decimal ExchangeRate,
  decimal OriginalDebitAmount,
  decimal OriginalCreditAmount,
  decimal DebitBaseAmount,
  decimal CreditBaseAmount);

public sealed record JournalEntryResponse(
  Guid Id,
  DateOnly EntryDate,
  string? Reference,
  string Description,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  JournalEntryStatus Status,
  JournalEntryType Type,
  DateTime? PostedAtUtc,
  Guid? ReversalOfJournalId,
  Guid? SourcePurchaseInvoiceId,
  Guid? SourceSalesInvoiceId,
  Guid? SourceMoneyTransferId,
  Guid? SourceSupplierPaymentId,
  Guid? SourceCustomerReceiptId,
  Guid? SourcePosSaleId,
  Guid? SourceExpenseDocumentId,
  Guid? SourcePosRefundId,
  decimal TotalDebitBaseAmount,
  decimal TotalCreditBaseAmount,
  List<JournalLineResponse> Lines);

public sealed class GeneralLedgerQuery
{
  [Required] public Guid AccountId { get; init; }
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public Guid? BranchId { get; init; }
  public Guid? CurrencyId { get; init; }
}

public sealed record GeneralLedgerLineResponse(
  Guid JournalId,
  DateOnly EntryDate,
  string? Reference,
  string JournalDescription,
  string? LineDescription,
  Guid BranchId,
  string BranchCode,
  string BranchName,
  string CurrencyCode,
  decimal DebitBaseAmount,
  decimal CreditBaseAmount,
  decimal RunningBalance);

public sealed record GeneralLedgerResponse(
  Guid AccountId,
  string AccountCode,
  string AccountName,
  decimal OpeningBalance,
  List<GeneralLedgerLineResponse> Lines);

public sealed class TrialBalanceQuery
{
  public DateOnly? FromDate { get; init; }
  public DateOnly? ToDate { get; init; }
  public Guid? BranchId { get; init; }
  public bool? IsActive { get; init; }
}

public sealed record TrialBalanceLineResponse(
  Guid AccountId,
  string AccountCode,
  string AccountName,
  AccountClassification Classification,
  decimal OpeningDebit,
  decimal OpeningCredit,
  decimal DebitMovement,
  decimal CreditMovement,
  decimal ClosingDebit,
  decimal ClosingCredit);

public sealed record TrialBalanceResponse(
  DateOnly? FromDate,
  DateOnly? ToDate,
  List<TrialBalanceLineResponse> Lines,
  decimal TotalOpeningDebit,
  decimal TotalOpeningCredit,
  decimal TotalDebitMovement,
  decimal TotalCreditMovement,
  decimal TotalClosingDebit,
  decimal TotalClosingCredit);
