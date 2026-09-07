namespace Api.Modules.Dashboard;

public sealed record DashboardSummaryResponse(
  decimal TodaySalesBase,
  int TodaySalesCount,
  decimal? TodaySalesChangePercent,
  decimal TodayCashReceivedBase,
  decimal TodayCashPaidBase,
  decimal TodayNetCashMovementBase,
  decimal CustomerReceivablesBase,
  int CustomerOutstandingInvoiceCount,
  int CustomerOutstandingCustomerCount,
  decimal SupplierPayablesBase,
  int SupplierOutstandingInvoiceCount,
  int SupplierOutstandingSupplierCount,
  decimal TodayExpensesBase,
  int TodayExpenseCount,
  int OutOfStockCount,
  string BaseCurrencyCode,
  string BaseCurrencySymbol
);

public sealed record DashboardTrendItem(
  DateOnly Date,
  decimal SalesBase,
  decimal ExpensesBase,
  decimal NetBase
);

public sealed record DashboardTrendResponse(
  IReadOnlyList<DashboardTrendItem> Items,
  int Days,
  string BaseCurrencyCode,
  string BaseCurrencySymbol
);

public sealed record DashboardSalesMixResponse(
  decimal ServiceRevenueBase,
  decimal ServiceRevenuePercent,
  decimal ProductRevenueBase,
  decimal ProductRevenuePercent,
  decimal TotalRevenueBase,
  string BaseCurrencyCode,
  string BaseCurrencySymbol
);

public sealed record DashboardRecentTransactionResponse(
  Guid Id,
  string DocumentNumber,
  string TransactionType,
  DateTime TimestampUtc,
  decimal Amount,
  string CurrencyCode,
  decimal BaseAmount,
  string Direction,
  string? ContactOrDescription,
  string? TargetUrl
);

public sealed record DashboardRecentActivityResponse(
  Guid Id,
  string Username,
  string Action,
  string EntityType,
  string DocumentNumber,
  DateTime TimestampUtc,
  string? Description
);

public sealed record RecordActivityRequest(
  string Action,
  string EntityType,
  Guid EntityId,
  string DocumentNumber,
  string? Description
);
