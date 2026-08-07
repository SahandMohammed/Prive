namespace Api.Modules.Finance;

public enum AccountCategory
{
  Asset = 1000,
  Liability = 2000,
  Equity = 3000,
  Revenue = 4000,
  Expense = 5000
}

public enum ContactType
{
  Customer = 1,
  Vendor = 2,
  CustomerAndVendor = 3,
  Other = 4
}

/// <summary>
/// Operational purpose of an account. Balances are derived from AccountTransactions;
/// this value does not determine a debit/credit convention.
/// </summary>
public enum AccountType
{
  General = 0,
  Cash = 1,
  Bank = 2,
  Receivable = 3,
  Payable = 4,
  Income = 5,
  Expense = 6,
  Inventory = 7
}

public enum FinancialVoucherType
{
  Receipt = 1,
  Payment = 2,
  Transfer = 3
}
