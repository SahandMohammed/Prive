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
  Vendor = 2
}

public enum InvoiceType
{
  SalesInvoice = 1,
  SalesReturn = 2,
  PurchaseInvoice = 3,
  PurchaseReturn = 4
}

public enum VoucherType
{
  Receipt = 1,
  Payment = 2,
  InternalTransfer = 3,
  CurrencyExchange = 4,
  DirectIncome = 5,
  DirectExpense = 6
}
