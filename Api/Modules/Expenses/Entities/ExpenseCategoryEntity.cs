using Api.Modules.Accounting;

namespace Api.Modules.Expenses;

public sealed class ExpenseCategoryEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
  public Guid AccountingAccountId { get; set; }
  public AccountEntity AccountingAccount { get; set; } = null!;
  public bool IsActive { get; set; } = true;
  public string? Description { get; set; }
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
  public ICollection<ExpenseLineEntity> Lines { get; set; } = new List<ExpenseLineEntity>();
}
