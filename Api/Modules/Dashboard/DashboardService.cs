using Api.Infrastructure.Http;
using Api.Modules.Expenses;
using Api.Modules.Finance;
using Api.Modules.Pos;
using Api.Modules.Purchase;
using Api.Modules.Sales;
using Api.Shared.Persistence;
using Api.Shared.Time;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Dashboard;

public sealed class DashboardService
{
  private readonly AppDbContext _db;
  private readonly BranchContext _branchContext;

  public DashboardService(AppDbContext db, BranchContext branchContext)
  {
    _db = db;
    _branchContext = branchContext;
  }

  private Guid RequireBranchId()
  {
    return _branchContext.BranchId
      ?? throw new ForbiddenException(ErrorCodes.Branch.SelectionRequired, "Select a branch to view dashboard data.");
  }

  private async Task<(string Code, string Symbol)> GetBaseCurrencyAsync(CancellationToken ct)
  {
    var business = await _db.Businesses.AsNoTracking()
      .Include(b => b.BaseCurrency)
      .SingleOrDefaultAsync(b => b.IsActive && b.IsSetupCompleted, ct);

    if (business?.BaseCurrency != null)
    {
      var symbol = string.IsNullOrWhiteSpace(business.BaseCurrency.Symbol)
        ? business.BaseCurrency.Code
        : business.BaseCurrency.Symbol;
      return (business.BaseCurrency.Code, symbol);
    }

    var defaultCurrency = await _db.Currencies.AsNoTracking().FirstOrDefaultAsync(c => c.IsActive, ct);
    if (defaultCurrency != null)
    {
      var symbol = string.IsNullOrWhiteSpace(defaultCurrency.Symbol)
        ? defaultCurrency.Code
        : defaultCurrency.Symbol;
      return (defaultCurrency.Code, symbol);
    }

    return ("IQD", "IQD");
  }

  public async Task<DashboardSummaryResponse> GetSummaryAsync(CancellationToken ct)
  {
    var branchId = RequireBranchId();
    var business = await _db.Businesses.AsNoTracking().SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Dashboard.BusinessNotConfigured, "Complete Business Setup before viewing the dashboard.");
    var (currencyCode, currencySymbol) = await GetBaseCurrencyAsync(ct);
    var today = BusinessTime.DateAt(business, DateTime.UtcNow);
    var yesterday = today.AddDays(-1);
    var (todayStart, tomorrowStart) = BusinessTime.UtcRange(business, today, today);

    // 1. Today's Sales (Both POS and regular posted sales invoices via SalesInvoices table)
    var salesToday = await _db.SalesInvoices.AsNoTracking()
      .Where(s => s.BranchId == branchId && s.Status == SalesInvoiceStatus.Posted && s.InvoiceDate == today)
      .Select(s => s.BaseTotal)
      .ToListAsync(ct);

    var refundsTodayBase = await _db.PosRefunds.AsNoTracking()
      .Where(refund => refund.BranchId == branchId && refund.Status == PosRefundStatus.Posted
        && refund.PostedAtUtc >= todayStart && refund.PostedAtUtc < tomorrowStart)
      .SumAsync(refund => (decimal?)refund.TotalRefundBase, ct) ?? 0m;
    var todaySalesBase = salesToday.Sum() - refundsTodayBase;
    var todaySalesCount = salesToday.Count;

    var yesterdaySalesBase = await _db.SalesInvoices.AsNoTracking()
      .Where(s => s.BranchId == branchId && s.Status == SalesInvoiceStatus.Posted && s.InvoiceDate == yesterday)
      .SumAsync(s => (decimal?)s.BaseTotal, ct) ?? 0m;
    var (yesterdayStart, _) = BusinessTime.UtcRange(business, yesterday, yesterday);
    var yesterdayRefundsBase = await _db.PosRefunds.AsNoTracking()
      .Where(refund => refund.BranchId == branchId && refund.Status == PosRefundStatus.Posted
        && refund.PostedAtUtc >= yesterdayStart && refund.PostedAtUtc < todayStart)
      .SumAsync(refund => (decimal?)refund.TotalRefundBase, ct) ?? 0m;
    yesterdaySalesBase -= yesterdayRefundsBase;

    decimal? todaySalesChangePercent = null;
    if (yesterdaySalesBase > 0)
    {
      todaySalesChangePercent = Math.Round(((todaySalesBase - yesterdaySalesBase) / yesterdaySalesBase) * 100m, 1);
    }

    // 2. Net Cash Movement Today from Money Ledger
    var ledgerEntriesToday = await _db.MoneyLedgerEntries.AsNoTracking()
      .Where(m => m.MoneyAccount.BranchId == branchId && m.MovementDate == today)
      .Select(m => m.BaseAmount)
      .ToListAsync(ct);

    var todayCashReceivedBase = ledgerEntriesToday.Where(a => a > 0).Sum();
    var todayCashPaidBase = ledgerEntriesToday.Where(a => a < 0).Sum(a => -a);
    var todayNetCashMovementBase = todayCashReceivedBase - todayCashPaidBase;

    // 3. Customer Receivables (all posted invoices minus initial POS settlement and posted customer receipts)
    var unpaidCustomerInvoices = await _db.SalesInvoices.AsNoTracking()
      .Where(s => s.BranchId == branchId && s.Status == SalesInvoiceStatus.Posted)
      .Select(s => new
      {
        s.Id,
        s.CustomerId,
        s.BaseTotal,
        PosSettledBase = s.PosSale == null
          ? 0m
          : (s.PosSale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m)
            - (s.PosSale.Change == null ? 0m : s.PosSale.Change.BaseAmount),
        AllocatedBase = _db.CustomerReceiptAllocations
          .Where(a => a.SalesInvoiceId == s.Id && a.CustomerReceipt.Status == FinanceDocumentStatus.Posted)
          .Sum(a => (decimal?)a.BaseAmount) ?? 0m,
        RefundReceivableBase = _db.PosRefunds
          .Where(refund => refund.SalesInvoiceId == s.Id && refund.Status == PosRefundStatus.Posted)
          .Sum(refund => (decimal?)refund.ReceivableReversalBase) ?? 0m
      })
      .Where(s => s.BaseTotal - s.PosSettledBase - s.AllocatedBase - s.RefundReceivableBase > 0.001m)
      .ToListAsync(ct);

    var customerReceivablesBase = unpaidCustomerInvoices.Sum(s =>
      s.BaseTotal - s.PosSettledBase - s.AllocatedBase - s.RefundReceivableBase);
    var customerOutstandingInvoiceCount = unpaidCustomerInvoices.Count;
    var customerOutstandingCustomerCount = unpaidCustomerInvoices.Select(s => s.CustomerId).Where(c => c != null).Distinct().Count();

    // 4. Supplier Payables (Posted purchase invoices minus posted supplier payment allocations)
    var unpaidPurchaseInvoices = await _db.PurchaseInvoices.AsNoTracking()
      .Where(p => p.BranchId == branchId && p.Status == PurchaseInvoiceStatus.Posted)
      .Select(p => new
      {
        p.Id,
        p.SupplierId,
        p.BaseTotal,
        AllocatedBase = _db.SupplierPaymentAllocations
          .Where(a => a.PurchaseInvoiceId == p.Id && a.SupplierPayment.Status == FinanceDocumentStatus.Posted)
          .Sum(a => (decimal?)a.BaseAmount) ?? 0m
      })
      .Where(p => p.BaseTotal - p.AllocatedBase > 0.001m)
      .ToListAsync(ct);

    var supplierPayablesBase = unpaidPurchaseInvoices.Sum(p => p.BaseTotal - p.AllocatedBase);
    var supplierOutstandingInvoiceCount = unpaidPurchaseInvoices.Count;
    var supplierOutstandingSupplierCount = unpaidPurchaseInvoices.Select(p => p.SupplierId).Distinct().Count();

    // 5. Today's Expenses (Posted expenses only)
    var expensesToday = await _db.ExpenseDocuments.AsNoTracking()
      .Where(e => e.BranchId == branchId && e.Status == ExpenseDocumentStatus.Posted && e.ExpenseDate == today)
      .Select(e => e.BaseTotalAmount)
      .ToListAsync(ct);

    var todayExpensesBase = expensesToday.Sum();
    var todayExpenseCount = expensesToday.Count;

    // 6. Out of Stock count for tracked active products
    var activeTrackedProductIds = await _db.Products.AsNoTracking()
      .Where(p => p.IsActive && p.TrackInventory)
      .Select(p => p.Id)
      .ToListAsync(ct);

    var inStockProductIds = await _db.StockMovements.AsNoTracking()
      .Where(m => m.Warehouse.BranchId == branchId && activeTrackedProductIds.Contains(m.ProductId))
      .GroupBy(m => m.ProductId)
      .Where(g => g.Sum(m => m.QuantityIn - m.QuantityOut) > 0)
      .Select(g => g.Key)
      .ToListAsync(ct);

    var outOfStockCount = activeTrackedProductIds.Count - inStockProductIds.Count;

    return new DashboardSummaryResponse(
      TodaySalesBase: todaySalesBase,
      TodaySalesCount: todaySalesCount,
      TodaySalesChangePercent: todaySalesChangePercent,
      TodayCashReceivedBase: todayCashReceivedBase,
      TodayCashPaidBase: todayCashPaidBase,
      TodayNetCashMovementBase: todayNetCashMovementBase,
      CustomerReceivablesBase: customerReceivablesBase,
      CustomerOutstandingInvoiceCount: customerOutstandingInvoiceCount,
      CustomerOutstandingCustomerCount: customerOutstandingCustomerCount,
      SupplierPayablesBase: supplierPayablesBase,
      SupplierOutstandingInvoiceCount: supplierOutstandingInvoiceCount,
      SupplierOutstandingSupplierCount: supplierOutstandingSupplierCount,
      TodayExpensesBase: todayExpensesBase,
      TodayExpenseCount: todayExpenseCount,
      OutOfStockCount: outOfStockCount,
      BaseCurrencyCode: currencyCode,
      BaseCurrencySymbol: currencySymbol
    );
  }

  public async Task<DashboardTrendResponse> GetTrendsAsync(int days, CancellationToken ct)
  {
    var branchId = RequireBranchId();
    if (days is < 1 or > 90)
    {
      throw new BadRequestException(ErrorCodes.Dashboard.InvalidTrendRange, "Days must be between 1 and 90.");
    }

    var business = await _db.Businesses.AsNoTracking().SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Dashboard.BusinessNotConfigured, "Complete Business Setup before viewing the dashboard.");
    var (currencyCode, currencySymbol) = await GetBaseCurrencyAsync(ct);
    var today = BusinessTime.DateAt(business, DateTime.UtcNow);
    var startDate = today.AddDays(-days + 1);

    var salesMap = await _db.SalesInvoices.AsNoTracking()
      .Where(s => s.BranchId == branchId && s.Status == SalesInvoiceStatus.Posted && s.InvoiceDate >= startDate && s.InvoiceDate <= today)
      .GroupBy(s => s.InvoiceDate)
      .Select(g => new { Date = g.Key, Total = g.Sum(s => s.BaseTotal) })
      .ToDictionaryAsync(x => x.Date, x => x.Total, ct);
    var (trendStart, trendEnd) = BusinessTime.UtcRange(business, startDate, today);
    var refundRows = await _db.PosRefunds.AsNoTracking()
      .Where(refund => refund.BranchId == branchId && refund.Status == PosRefundStatus.Posted
        && refund.PostedAtUtc >= trendStart && refund.PostedAtUtc < trendEnd)
      .Select(refund => new { refund.PostedAtUtc, refund.TotalRefundBase })
      .ToListAsync(ct);
    var refundMap = refundRows.GroupBy(refund => BusinessTime.DateAt(business, refund.PostedAtUtc))
      .ToDictionary(group => group.Key, group => group.Sum(refund => refund.TotalRefundBase));

    var expenseMap = await _db.ExpenseDocuments.AsNoTracking()
      .Where(e => e.BranchId == branchId && e.Status == ExpenseDocumentStatus.Posted && e.ExpenseDate >= startDate && e.ExpenseDate <= today)
      .GroupBy(e => e.ExpenseDate)
      .Select(g => new { Date = g.Key, Total = g.Sum(e => e.BaseTotalAmount) })
      .ToDictionaryAsync(x => x.Date, x => x.Total, ct);

    var items = new List<DashboardTrendItem>(days);
    for (var date = startDate; date <= today; date = date.AddDays(1))
    {
      var sales = salesMap.GetValueOrDefault(date, 0m) - refundMap.GetValueOrDefault(date, 0m);
      var expenses = expenseMap.GetValueOrDefault(date, 0m);
      items.Add(new DashboardTrendItem(date, sales, expenses, sales - expenses));
    }

    return new DashboardTrendResponse(items, days, currencyCode, currencySymbol);
  }

  public async Task<DashboardSalesMixResponse> GetSalesMixAsync(CancellationToken ct)
  {
    var branchId = RequireBranchId();
    var (currencyCode, currencySymbol) = await GetBaseCurrencyAsync(ct);

    var lines = await _db.SalesInvoiceLines.AsNoTracking()
      .Where(l => l.SalesInvoice.BranchId == branchId && l.SalesInvoice.Status == SalesInvoiceStatus.Posted)
      .Select(l => new { l.LineType, l.BaseLineAmount })
      .ToListAsync(ct);

    var serviceRevenueBase = lines.Where(l => l.LineType == SalesLineType.Service).Sum(l => l.BaseLineAmount);
    var productRevenueBase = lines.Where(l => l.LineType == SalesLineType.Product).Sum(l => l.BaseLineAmount);
    var refundLines = await _db.PosRefundLines.AsNoTracking()
      .Where(line => line.PosRefund.BranchId == branchId && line.PosRefund.Status == PosRefundStatus.Posted)
      .Select(line => new { line.LineType, line.RefundAmountBase }).ToListAsync(ct);
    serviceRevenueBase = Math.Max(serviceRevenueBase
      - refundLines.Where(line => line.LineType == SalesLineType.Service).Sum(line => line.RefundAmountBase), 0);
    productRevenueBase = Math.Max(productRevenueBase
      - refundLines.Where(line => line.LineType == SalesLineType.Product).Sum(line => line.RefundAmountBase), 0);
    var totalRevenueBase = serviceRevenueBase + productRevenueBase;

    var servicePct = totalRevenueBase > 0 ? Math.Round((serviceRevenueBase / totalRevenueBase) * 100m, 1) : 0m;
    var productPct = totalRevenueBase > 0 ? Math.Round((productRevenueBase / totalRevenueBase) * 100m, 1) : 0m;

    return new DashboardSalesMixResponse(
      ServiceRevenueBase: serviceRevenueBase,
      ServiceRevenuePercent: servicePct,
      ProductRevenueBase: productRevenueBase,
      ProductRevenuePercent: productPct,
      TotalRevenueBase: totalRevenueBase,
      BaseCurrencyCode: currencyCode,
      BaseCurrencySymbol: currencySymbol
    );
  }

  public async Task<IReadOnlyList<DashboardRecentTransactionResponse>> GetRecentTransactionsAsync(int limit, CancellationToken ct)
  {
    var branchId = RequireBranchId();
    var safeLimit = Math.Clamp(limit, 1, 50);

    var transactions = new List<DashboardRecentTransactionResponse>();

    // 1. POS Sales
    var posSales = await _db.PosSales.AsNoTracking()
      .Where(p => p.SalesInvoice.BranchId == branchId)
      .OrderByDescending(p => p.CompletedAtUtc)
      .Take(safeLimit)
      .Select(p => new DashboardRecentTransactionResponse(
        p.Id,
        p.DocumentNumber,
        "POS Sale",
        p.CompletedAtUtc,
        p.SalesInvoice.Total,
        p.SalesInvoice.Currency.Code,
        p.SalesInvoice.BaseTotal,
        "in",
        p.SalesInvoice.Customer != null ? p.SalesInvoice.Customer.Name : "Walk-in Customer",
        $"/pos/sales/{p.Id}"))
      .ToListAsync(ct);
    transactions.AddRange(posSales);

    var posRefunds = await _db.PosRefunds.AsNoTracking()
      .Where(refund => refund.BranchId == branchId && refund.Status == PosRefundStatus.Posted)
      .OrderByDescending(refund => refund.PostedAtUtc)
      .Take(safeLimit)
      .Select(refund => new DashboardRecentTransactionResponse(
        refund.Id,
        refund.DocumentNumber,
        refund.IsVoid ? "POS Void" : "POS Refund",
        refund.PostedAtUtc,
        refund.TotalRefundBase,
        refund.SalesInvoice.BaseCurrency.Code,
        refund.TotalRefundBase,
        "out",
        refund.Customer != null ? refund.Customer.Name : "Walk-in Customer",
        $"/pos/refunds/{refund.Id}"))
      .ToListAsync(ct);
    transactions.AddRange(posRefunds);

    // 2. Regular Sales Invoices (non-POS)
    var salesInvoices = await _db.SalesInvoices.AsNoTracking()
      .Where(s => s.BranchId == branchId && s.Status == SalesInvoiceStatus.Posted && s.PosSale == null)
      .OrderByDescending(s => s.PostedAtUtc ?? s.CreatedAtUtc)
      .Take(safeLimit)
      .Select(s => new DashboardRecentTransactionResponse(
        s.Id,
        s.DocumentNumber,
        "Sales Invoice",
        s.PostedAtUtc ?? s.CreatedAtUtc,
        s.Total,
        s.Currency.Code,
        s.BaseTotal,
        "in",
        s.Customer != null ? s.Customer.Name : "Regular Sale",
        $"/sales/invoices/{s.Id}"))
      .ToListAsync(ct);
    transactions.AddRange(salesInvoices);

    // 3. Purchase Invoices
    var purchases = await _db.PurchaseInvoices.AsNoTracking()
      .Where(p => p.BranchId == branchId && p.Status == PurchaseInvoiceStatus.Posted)
      .OrderByDescending(p => p.PostedAtUtc ?? p.CreatedAtUtc)
      .Take(safeLimit)
      .Select(p => new DashboardRecentTransactionResponse(
        p.Id,
        p.DocumentNumber,
        "Purchase Invoice",
        p.PostedAtUtc ?? p.CreatedAtUtc,
        p.Total,
        p.Currency.Code,
        p.BaseTotal,
        "out",
        p.Supplier.Name,
        $"/purchases/invoices/{p.Id}"))
      .ToListAsync(ct);
    transactions.AddRange(purchases);

    // 4. Customer Receipts
    var receipts = await _db.CustomerReceipts.AsNoTracking()
      .Where(r => r.MoneyAccount.BranchId == branchId && r.Status == FinanceDocumentStatus.Posted)
      .OrderByDescending(r => r.PostedAtUtc ?? r.CreatedAtUtc)
      .Take(safeLimit)
      .Select(r => new DashboardRecentTransactionResponse(
        r.Id,
        r.DocumentNumber,
        "Customer Receipt",
        r.PostedAtUtc ?? r.CreatedAtUtc,
        r.TotalAmount,
        r.Currency.Code,
        r.BaseTotalAmount,
        "in",
        r.Customer.Name,
        $"/finance/customer-receipts/{r.Id}"))
      .ToListAsync(ct);
    transactions.AddRange(receipts);

    // 5. Supplier Payments
    var payments = await _db.SupplierPayments.AsNoTracking()
      .Where(p => p.MoneyAccount.BranchId == branchId && p.Status == FinanceDocumentStatus.Posted)
      .OrderByDescending(p => p.PostedAtUtc ?? p.CreatedAtUtc)
      .Take(safeLimit)
      .Select(p => new DashboardRecentTransactionResponse(
        p.Id,
        p.DocumentNumber,
        "Supplier Payment",
        p.PostedAtUtc ?? p.CreatedAtUtc,
        p.TotalAmount,
        p.Currency.Code,
        p.BaseTotalAmount,
        "out",
        p.Supplier.Name,
        $"/finance/supplier-payments/{p.Id}"))
      .ToListAsync(ct);
    transactions.AddRange(payments);

    // 6. Expenses
    var expenses = await _db.ExpenseDocuments.AsNoTracking()
      .Where(e => e.BranchId == branchId && e.Status == ExpenseDocumentStatus.Posted)
      .OrderByDescending(e => e.PostedAtUtc ?? e.CreatedAtUtc)
      .Take(safeLimit)
      .Select(e => new DashboardRecentTransactionResponse(
        e.Id,
        e.DocumentNumber,
        "Expense",
        e.PostedAtUtc ?? e.CreatedAtUtc,
        e.TotalAmount,
        e.Currency.Code,
        e.BaseTotalAmount,
        "out",
        e.PayeeName ?? (e.Contact != null ? e.Contact.Name : "General Expense"),
        $"/expenses/{e.Id}"))
      .ToListAsync(ct);
    transactions.AddRange(expenses);

    // 7. Money Transfers
    var transfers = await _db.MoneyTransfers.AsNoTracking()
      .Where(t => t.SourceMoneyAccount.BranchId == branchId && t.Status == FinanceDocumentStatus.Posted)
      .OrderByDescending(t => t.PostedAtUtc ?? t.CreatedAtUtc)
      .Take(safeLimit)
      .Select(t => new DashboardRecentTransactionResponse(
        t.Id,
        t.DocumentNumber,
        "Money Transfer",
        t.PostedAtUtc ?? t.CreatedAtUtc,
        t.Amount,
        t.SourceMoneyAccount.Currency.Code,
        t.BaseAmount,
        "neutral",
        $"{t.SourceMoneyAccount.Name} → {t.DestinationMoneyAccount.Name}",
        "/finance/transfers"))
      .ToListAsync(ct);
    transactions.AddRange(transfers);

    return transactions
      .OrderByDescending(t => t.TimestampUtc)
      .Take(safeLimit)
      .ToList();
  }

  public async Task<IReadOnlyList<DashboardRecentActivityResponse>> GetRecentActivityAsync(int limit, CancellationToken ct)
  {
    var branchId = RequireBranchId();
    var safeLimit = Math.Clamp(limit, 1, 50);

    var loggedActivities = await _db.ActivityLogs.AsNoTracking()
      .Include(a => a.User)
      .Where(a => a.BranchId == branchId)
      .OrderByDescending(a => a.TimestampUtc)
      .Take(safeLimit)
      .Select(a => new DashboardRecentActivityResponse(
        a.Id,
        a.User.Username,
        a.Action,
        a.EntityType,
        a.DocumentNumber,
        a.TimestampUtc,
        a.Description))
      .ToListAsync(ct);

    if (loggedActivities.Count >= safeLimit)
    {
      return loggedActivities;
    }

    // If activity logs are empty or fewer than requested limit, supplement with recent document activity
    var supplemental = new List<DashboardRecentActivityResponse>(loggedActivities);
    var seenDocNumbers = new HashSet<string>(loggedActivities.Select(a => a.DocumentNumber));

    // POS Sales
    var recentPos = await _db.PosSales.AsNoTracking()
      .Include(p => p.CashierUser)
      .Where(p => p.SalesInvoice.BranchId == branchId && !seenDocNumbers.Contains(p.DocumentNumber))
      .OrderByDescending(p => p.CompletedAtUtc)
      .Take(safeLimit)
      .Select(p => new DashboardRecentActivityResponse(
        p.Id,
        p.CashierUser.Username,
        "completed",
        "POS Sale",
        p.DocumentNumber,
        p.CompletedAtUtc,
        "Completed sale at POS"))
      .ToListAsync(ct);
    supplemental.AddRange(recentPos);

    // Sales Invoices
    var recentSales = await _db.SalesInvoices.AsNoTracking()
      .Include(s => s.CreatedByUser)
      .Where(s => s.BranchId == branchId && s.PosSale == null && !seenDocNumbers.Contains(s.DocumentNumber))
      .OrderByDescending(s => s.PostedAtUtc ?? s.CreatedAtUtc)
      .Take(safeLimit)
      .Select(s => new DashboardRecentActivityResponse(
        s.Id,
        s.CreatedByUser.Username,
        s.Status == SalesInvoiceStatus.Posted ? "posted" : "created",
        "Sales Invoice",
        s.DocumentNumber,
        s.PostedAtUtc ?? s.CreatedAtUtc,
        s.Status == SalesInvoiceStatus.Posted ? "Posted sales invoice" : "Created sales invoice draft"))
      .ToListAsync(ct);
    supplemental.AddRange(recentSales);

    // Expenses
    var recentExpenses = await _db.ExpenseDocuments.AsNoTracking()
      .Include(e => e.CreatedByUser)
      .Where(e => e.BranchId == branchId && !seenDocNumbers.Contains(e.DocumentNumber))
      .OrderByDescending(e => e.PostedAtUtc ?? e.CreatedAtUtc)
      .Take(safeLimit)
      .Select(e => new DashboardRecentActivityResponse(
        e.Id,
        e.CreatedByUser.Username,
        e.Status == ExpenseDocumentStatus.Posted ? "posted" : "created",
        "Expense",
        e.DocumentNumber,
        e.PostedAtUtc ?? e.CreatedAtUtc,
        e.PayeeName ?? e.Reference ?? "Recorded expense"))
      .ToListAsync(ct);
    supplemental.AddRange(recentExpenses);

    // Supplier Payments
    var recentPayments = await _db.SupplierPayments.AsNoTracking()
      .Include(p => p.CreatedByUser)
      .Where(p => p.MoneyAccount.BranchId == branchId && !seenDocNumbers.Contains(p.DocumentNumber))
      .OrderByDescending(p => p.PostedAtUtc ?? p.CreatedAtUtc)
      .Take(safeLimit)
      .Select(p => new DashboardRecentActivityResponse(
        p.Id,
        p.CreatedByUser.Username,
        p.Status == FinanceDocumentStatus.Posted ? "posted" : "created",
        "Supplier Payment",
        p.DocumentNumber,
        p.PostedAtUtc ?? p.CreatedAtUtc,
        "Recorded supplier payment"))
      .ToListAsync(ct);
    supplemental.AddRange(recentPayments);

    // Customer Receipts
    var recentReceipts = await _db.CustomerReceipts.AsNoTracking()
      .Include(r => r.CreatedByUser)
      .Where(r => r.MoneyAccount.BranchId == branchId && !seenDocNumbers.Contains(r.DocumentNumber))
      .OrderByDescending(r => r.PostedAtUtc ?? r.CreatedAtUtc)
      .Take(safeLimit)
      .Select(r => new DashboardRecentActivityResponse(
        r.Id,
        r.CreatedByUser.Username,
        r.Status == FinanceDocumentStatus.Posted ? "posted" : "created",
        "Customer Receipt",
        r.DocumentNumber,
        r.PostedAtUtc ?? r.CreatedAtUtc,
        "Recorded customer receipt"))
      .ToListAsync(ct);
    supplemental.AddRange(recentReceipts);

    // Purchase Invoices
    var recentPurchases = await _db.PurchaseInvoices.AsNoTracking()
      .Include(p => p.CreatedByUser)
      .Where(p => p.BranchId == branchId && !seenDocNumbers.Contains(p.DocumentNumber))
      .OrderByDescending(p => p.PostedAtUtc ?? p.CreatedAtUtc)
      .Take(safeLimit)
      .Select(p => new DashboardRecentActivityResponse(
        p.Id,
        p.CreatedByUser.Username,
        p.Status == PurchaseInvoiceStatus.Posted ? "posted" : "created",
        "Purchase Invoice",
        p.DocumentNumber,
        p.PostedAtUtc ?? p.CreatedAtUtc,
        "Recorded purchase invoice"))
      .ToListAsync(ct);
    supplemental.AddRange(recentPurchases);

    return supplemental
      .OrderByDescending(a => a.TimestampUtc)
      .Take(safeLimit)
      .ToList();
  }

  public async Task RecordActivityAsync(Guid branchId, Guid userId, RecordActivityRequest request, CancellationToken ct)
  {
    var activity = new ActivityLogEntity
    {
      BranchId = branchId,
      UserId = userId,
      Action = request.Action,
      EntityType = request.EntityType,
      EntityId = request.EntityId,
      DocumentNumber = request.DocumentNumber,
      Description = request.Description,
      TimestampUtc = DateTime.UtcNow
    };

    _db.ActivityLogs.Add(activity);
    await _db.SaveChangesAsync(ct);
  }
}
