using Api.Modules.Accounting;

namespace Api.Modules.Expenses;

public sealed class ExpenseLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid ExpenseDocumentId { get; set; }
  public ExpenseDocumentEntity ExpenseDocument { get; set; } = null!;
  public Guid ExpenseCategoryId { get; set; }
  public ExpenseCategoryEntity ExpenseCategory { get; set; } = null!;
  public string? Description { get; set; }
  public decimal Amount { get; set; }
  public decimal BaseAmount { get; set; }
  public Guid? ExpenseAccountingAccountId { get; set; }
  public AccountEntity? ExpenseAccountingAccount { get; set; }
}
