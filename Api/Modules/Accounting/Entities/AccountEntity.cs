namespace Api.Modules.Accounting;

public sealed class AccountEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Code { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
  public AccountClassification Classification { get; set; }
  public Guid? ParentAccountId { get; set; }
  public AccountEntity? ParentAccount { get; set; }
  public ICollection<AccountEntity> ChildAccounts { get; set; } = new List<AccountEntity>();
  public bool IsGroup { get; set; }
  public bool IsActive { get; set; } = true;
  public ICollection<JournalLineEntity> JournalLines { get; set; } = new List<JournalLineEntity>();
}

public enum AccountClassification
{
  Asset,
  Liability,
  Equity,
  Revenue,
  Expense,
  ContraAsset
}
