using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Dashboard;
using Api.Modules.Expenses;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Purchase;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Api.Shared.Time;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class DashboardWorkflowTests
{
  private static DbContextOptions<AppDbContext> CreateOptions() =>
    new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;

  private static DateOnly BusinessToday() => BusinessTime.DateAt(new BusinessEntity(), DateTime.UtcNow);

  [Fact]
  public async Task Summary_respects_branch_isolation_and_excludes_other_branches()
  {
    var options = CreateOptions();
    var branchA = new BranchEntity { Name = "Branch A", Code = "BR-A", IsMainBranch = true };
    var branchB = new BranchEntity { Name = "Branch B", Code = "BR-B" };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD" };
    var user = new UserEntity { Username = "ahmed", Role = UserRole.Owner };
    var today = BusinessToday();

    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(branchA, branchB, currency, user);
      var business = new BusinessEntity
      {
        Name = "Prive Salons",
        BaseCurrencyId = currency.Id,
        IsActive = true,
        IsSetupCompleted = true
      };
      seed.Add(business);

      // Branch A Sales
      var saleA = new SalesInvoiceEntity
      {
        BranchId = branchA.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "INV-A-1",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Posted,
        Total = 50_000m,
        BaseTotal = 50_000m,
        CreatedByUserId = user.Id
      };

      // Branch B Sales (should not appear in Branch A dashboard)
      var saleB = new SalesInvoiceEntity
      {
        BranchId = branchB.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "INV-B-1",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Posted,
        Total = 150_000m,
        BaseTotal = 150_000m,
        CreatedByUserId = user.Id
      };

      seed.AddRange(saleA, saleB);
      await seed.SaveChangesAsync();
    }

    var branchContextA = new BranchContext { BranchId = branchA.Id };
    await using var dbA = new AppDbContext(options, branchContextA);
    var dashboardServiceA = new DashboardService(dbA, branchContextA);

    var summaryA = await dashboardServiceA.GetSummaryAsync(default);
    Assert.Equal(50_000m, summaryA.TodaySalesBase);
    Assert.Equal(1, summaryA.TodaySalesCount);
    Assert.Equal("IQD", summaryA.BaseCurrencyCode);

    // Now switch to branch B
    var branchContextB = new BranchContext { BranchId = branchB.Id };
    await using var dbB = new AppDbContext(options, branchContextB);
    var dashboardServiceB = new DashboardService(dbB, branchContextB);

    var summaryB = await dashboardServiceB.GetSummaryAsync(default);
    Assert.Equal(150_000m, summaryB.TodaySalesBase);
    Assert.Equal(1, summaryB.TodaySalesCount);
  }

  [Fact]
  public async Task Sales_KPI_includes_POS_and_regular_sales_without_double_counting()
  {
    var options = CreateOptions();
    var branch = new BranchEntity { Name = "Branch A", Code = "BR-A", IsMainBranch = true };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD" };
    var user = new UserEntity { Username = "cashier1", Role = UserRole.Cashier };
    var today = BusinessToday();

    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(branch, currency, user);
      seed.Add(new BusinessEntity { Name = "Prive", BaseCurrencyId = currency.Id, IsActive = true, IsSetupCompleted = true });

      // 1. Regular posted sales invoice
      var regularSale = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "INV-REG-1",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Posted,
        Total = 40_000m,
        BaseTotal = 40_000m,
        CreatedByUserId = user.Id
      };

      // 2. POS sales invoice + PosSaleEntity linked to it
      var posInvoice = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "POS-001",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Posted,
        Total = 25_000m,
        BaseTotal = 25_000m,
        CreatedByUserId = user.Id
      };
      var posSale = new PosSaleEntity
      {
        DocumentNumber = "POS-001",
        SalesInvoice = posInvoice,
        CashierUserId = user.Id,
        Status = PosSaleStatus.Completed,
        CompletedAtUtc = DateTime.UtcNow
      };

      // 3. Draft regular sales invoice (MUST BE EXCLUDED)
      var draftSale = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "INV-DRAFT-1",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Draft,
        Total = 100_000m,
        BaseTotal = 100_000m,
        CreatedByUserId = user.Id
      };

      seed.AddRange(regularSale, posInvoice, posSale, draftSale);
      await seed.SaveChangesAsync();
    }

    var branchContext = new BranchContext { BranchId = branch.Id };
    await using var db = new AppDbContext(options, branchContext);
    var dashboardService = new DashboardService(db, branchContext);

    var summary = await dashboardService.GetSummaryAsync(default);

    // 40,000 (regular) + 25,000 (POS) = 65,000. Draft (100,000) is excluded. POS sale is NOT counted twice!
    Assert.Equal(65_000m, summary.TodaySalesBase);
    Assert.Equal(2, summary.TodaySalesCount);
  }

  [Fact]
  public async Task Money_ledger_calculates_received_paid_and_net_cash_movement()
  {
    var options = CreateOptions();
    var branch = new BranchEntity { Name = "Main Branch", Code = "MAIN", IsMainBranch = true };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD" };
    var user = new UserEntity { Username = "manager", Role = UserRole.Manager };
    var today = BusinessToday();

    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(branch, currency, user);
      seed.Add(new BusinessEntity { Name = "Prive", BaseCurrencyId = currency.Id, IsActive = true, IsSetupCompleted = true });

      var account = new AccountEntity { Code = "1000", Name = "Cash", Classification = AccountClassification.Asset };
      seed.Add(account);
      var moneyAccount = new MoneyAccountEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        AccountingAccountId = account.Id,
        Code = "CASHBOX-1",
        Name = "Main Cashbox"
      };
      seed.Add(moneyAccount);

      var journal = new JournalEntryEntity { BranchId = branch.Id, EntryDate = today };
      seed.Add(journal);

      // Money in: +1,500,000
      var entryIn = new MoneyLedgerEntryEntity
      {
        MoneyAccountId = moneyAccount.Id,
        MovementDate = today,
        Amount = 1_500_000m,
        BaseAmount = 1_500_000m,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "REC-01",
        JournalEntryId = journal.Id,
        PerformedByUserId = user.Id
      };

      // Money out: -300,000
      var entryOut = new MoneyLedgerEntryEntity
      {
        MoneyAccountId = moneyAccount.Id,
        MovementDate = today,
        Amount = -300_000m,
        BaseAmount = -300_000m,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "PAY-01",
        JournalEntryId = journal.Id,
        PerformedByUserId = user.Id
      };

      // Yesterday's entry: +200,000 (should not affect today)
      var entryYesterday = new MoneyLedgerEntryEntity
      {
        MoneyAccountId = moneyAccount.Id,
        MovementDate = today.AddDays(-1),
        Amount = 200_000m,
        BaseAmount = 200_000m,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "REC-OLD",
        JournalEntryId = journal.Id,
        PerformedByUserId = user.Id
      };

      seed.AddRange(entryIn, entryOut, entryYesterday);
      await seed.SaveChangesAsync();
    }

    var branchContext = new BranchContext { BranchId = branch.Id };
    await using var db = new AppDbContext(options, branchContext);
    var dashboardService = new DashboardService(db, branchContext);

    var summary = await dashboardService.GetSummaryAsync(default);

    Assert.Equal(1_500_000m, summary.TodayCashReceivedBase);
    Assert.Equal(300_000m, summary.TodayCashPaidBase);
    Assert.Equal(1_200_000m, summary.TodayNetCashMovementBase);
  }

  [Fact]
  public async Task Customer_receivables_and_supplier_payables_calculate_accurately()
  {
    var options = CreateOptions();
    var branch = new BranchEntity { Name = "Main", Code = "MAIN", IsMainBranch = true };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD" };
    var user = new UserEntity { Username = "owner", Role = UserRole.Owner };
    var customer = new ContactEntity { Name = "Daban", IsCustomer = true };
    var supplier = new ContactEntity { Name = "Beauty Supply Co", IsSupplier = true };
    var today = BusinessToday();

    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(branch, currency, user, customer, supplier);
      seed.Add(new BusinessEntity { Name = "Prive", BaseCurrencyId = currency.Id, IsActive = true, IsSetupCompleted = true });

      var account = new AccountEntity { Code = "1001", Name = "Cash", Classification = AccountClassification.Asset };
      seed.Add(account);
      var moneyAccount = new MoneyAccountEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        AccountingAccountId = account.Id,
        Code = "CASHBOX-2",
        Name = "Vault"
      };
      seed.Add(moneyAccount);

      // Customer Invoice 1: 100,000 total, 40,000 allocated -> 60,000 outstanding
      var customerInvoice1 = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        CustomerId = customer.Id,
        DocumentNumber = "INV-CUST-1",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Posted,
        Total = 100_000m,
        BaseTotal = 100_000m,
        CreatedByUserId = user.Id
      };

      var receipt = new CustomerReceiptEntity
      {
        CustomerId = customer.Id,
        MoneyAccountId = moneyAccount.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "REC-001",
        ReceiptDate = today,
        Status = FinanceDocumentStatus.Posted,
        TotalAmount = 40_000m,
        BaseTotalAmount = 40_000m,
        CreatedByUserId = user.Id
      };
      var receiptAlloc = new CustomerReceiptAllocationEntity
      {
        CustomerReceipt = receipt,
        SalesInvoice = customerInvoice1,
        Amount = 40_000m,
        BaseAmount = 40_000m
      };

      // Customer Invoice 2: 50,000 total, fully settled -> 0 outstanding (should NOT be counted)
      var customerInvoice2 = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        CustomerId = customer.Id,
        DocumentNumber = "INV-CUST-2",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Posted,
        Total = 50_000m,
        BaseTotal = 50_000m,
        CreatedByUserId = user.Id
      };
      var receipt2 = new CustomerReceiptEntity
      {
        CustomerId = customer.Id,
        MoneyAccountId = moneyAccount.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "REC-002",
        ReceiptDate = today,
        Status = FinanceDocumentStatus.Posted,
        TotalAmount = 50_000m,
        BaseTotalAmount = 50_000m,
        CreatedByUserId = user.Id
      };
      var receiptAlloc2 = new CustomerReceiptAllocationEntity
      {
        CustomerReceipt = receipt2,
        SalesInvoice = customerInvoice2,
        Amount = 50_000m,
        BaseAmount = 50_000m
      };

      // Supplier Purchase Invoice 1: 80,000 total, 30,000 paid -> 50,000 outstanding
      var purchaseInvoice1 = new PurchaseInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        SupplierId = supplier.Id,
        DocumentNumber = "PUR-001",
        InvoiceDate = today,
        Status = PurchaseInvoiceStatus.Posted,
        Total = 80_000m,
        BaseTotal = 80_000m,
        CreatedByUserId = user.Id
      };
      var payment = new SupplierPaymentEntity
      {
        SupplierId = supplier.Id,
        MoneyAccountId = moneyAccount.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "PAY-SUP-01",
        PaymentDate = today,
        Status = FinanceDocumentStatus.Posted,
        TotalAmount = 30_000m,
        BaseTotalAmount = 30_000m,
        CreatedByUserId = user.Id
      };
      var paymentAlloc = new SupplierPaymentAllocationEntity
      {
        SupplierPayment = payment,
        PurchaseInvoice = purchaseInvoice1,
        Amount = 30_000m,
        BaseAmount = 30_000m
      };

      seed.AddRange(
        customerInvoice1, receipt, receiptAlloc,
        customerInvoice2, receipt2, receiptAlloc2,
        purchaseInvoice1, payment, paymentAlloc);
      await seed.SaveChangesAsync();
    }

    var branchContext = new BranchContext { BranchId = branch.Id };
    await using var db = new AppDbContext(options, branchContext);
    var dashboardService = new DashboardService(db, branchContext);

    var summary = await dashboardService.GetSummaryAsync(default);

    // Customer receivables: 60,000 outstanding on 1 invoice
    Assert.Equal(60_000m, summary.CustomerReceivablesBase);
    Assert.Equal(1, summary.CustomerOutstandingInvoiceCount);
    Assert.Equal(1, summary.CustomerOutstandingCustomerCount);

    // Supplier payables: 50,000 outstanding on 1 invoice
    Assert.Equal(50_000m, summary.SupplierPayablesBase);
    Assert.Equal(1, summary.SupplierOutstandingInvoiceCount);
    Assert.Equal(1, summary.SupplierOutstandingSupplierCount);
  }

  [Fact]
  public async Task Expenses_KPI_includes_posted_expenses_and_excludes_drafts()
  {
    var options = CreateOptions();
    var branch = new BranchEntity { Name = "Main", Code = "MAIN", IsMainBranch = true };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD" };
    var user = new UserEntity { Username = "sahand", Role = UserRole.Owner };
    var today = BusinessToday();

    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(branch, currency, user);
      seed.Add(new BusinessEntity { Name = "Prive", BaseCurrencyId = currency.Id, IsActive = true, IsSetupCompleted = true });

      var account = new AccountEntity { Code = "1002", Name = "Cash", Classification = AccountClassification.Asset };
      seed.Add(account);
      var moneyAccount = new MoneyAccountEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        AccountingAccountId = account.Id,
        Code = "CASHBOX-3",
        Name = "Register"
      };
      seed.Add(moneyAccount);

      var postedExpense = new ExpenseDocumentEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        MoneyAccountId = moneyAccount.Id,
        DocumentNumber = "EXP-POSTED-1",
        ExpenseDate = today,
        Status = ExpenseDocumentStatus.Posted,
        TotalAmount = 45_000m,
        BaseTotalAmount = 45_000m,
        CreatedByUserId = user.Id
      };

      var draftExpense = new ExpenseDocumentEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        MoneyAccountId = moneyAccount.Id,
        DocumentNumber = "EXP-DRAFT-1",
        ExpenseDate = today,
        Status = ExpenseDocumentStatus.Draft,
        TotalAmount = 150_000m,
        BaseTotalAmount = 150_000m,
        CreatedByUserId = user.Id
      };

      seed.AddRange(postedExpense, draftExpense);
      await seed.SaveChangesAsync();
    }

    var branchContext = new BranchContext { BranchId = branch.Id };
    await using var db = new AppDbContext(options, branchContext);
    var dashboardService = new DashboardService(db, branchContext);

    var summary = await dashboardService.GetSummaryAsync(default);

    Assert.Equal(45_000m, summary.TodayExpensesBase);
    Assert.Equal(1, summary.TodayExpenseCount);
  }

  [Fact]
  public async Task Trends_returns_daily_totals_for_configured_days()
  {
    var options = CreateOptions();
    var branch = new BranchEntity { Name = "Main", Code = "MAIN", IsMainBranch = true };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD" };
    var user = new UserEntity { Username = "user", Role = UserRole.Owner };
    var today = BusinessToday();

    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(branch, currency, user);
      seed.Add(new BusinessEntity { Name = "Prive", BaseCurrencyId = currency.Id, IsActive = true, IsSetupCompleted = true });

      var saleToday = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "INV-TR-1",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Posted,
        Total = 100_000m,
        BaseTotal = 100_000m,
        CreatedByUserId = user.Id
      };

      var sale3DaysAgo = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "INV-TR-2",
        InvoiceDate = today.AddDays(-3),
        Status = SalesInvoiceStatus.Posted,
        Total = 75_000m,
        BaseTotal = 75_000m,
        CreatedByUserId = user.Id
      };

      seed.AddRange(saleToday, sale3DaysAgo);
      await seed.SaveChangesAsync();
    }

    var branchContext = new BranchContext { BranchId = branch.Id };
    await using var db = new AppDbContext(options, branchContext);
    var dashboardService = new DashboardService(db, branchContext);

    var trends = await dashboardService.GetTrendsAsync(7, default);
    Assert.Equal(7, trends.Items.Count);
    Assert.Equal(100_000m, trends.Items.Last().SalesBase);
    Assert.Equal(75_000m, trends.Items[^4].SalesBase);
    Assert.Equal(0m, trends.Items[^2].SalesBase);
  }

  [Fact]
  public async Task Sales_mix_calculates_service_and_product_revenue_split()
  {
    var options = CreateOptions();
    var branch = new BranchEntity { Name = "Main", Code = "MAIN", IsMainBranch = true };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD" };
    var user = new UserEntity { Username = "user", Role = UserRole.Owner };
    var today = BusinessToday();

    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(branch, currency, user);
      seed.Add(new BusinessEntity { Name = "Prive", BaseCurrencyId = currency.Id, IsActive = true, IsSetupCompleted = true });

      var invoice = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "INV-MIX",
        InvoiceDate = today,
        Status = SalesInvoiceStatus.Posted,
        Total = 100_000m,
        BaseTotal = 100_000m,
        CreatedByUserId = user.Id
      };

      var lineService = new SalesInvoiceLineEntity
      {
        SalesInvoice = invoice,
        LineType = SalesLineType.Service,
        BaseLineAmount = 70_000m,
        LineAmount = 70_000m
      };

      var lineProduct = new SalesInvoiceLineEntity
      {
        SalesInvoice = invoice,
        LineType = SalesLineType.Product,
        BaseLineAmount = 30_000m,
        LineAmount = 30_000m
      };

      seed.AddRange(invoice, lineService, lineProduct);
      await seed.SaveChangesAsync();
    }

    var branchContext = new BranchContext { BranchId = branch.Id };
    await using var db = new AppDbContext(options, branchContext);
    var dashboardService = new DashboardService(db, branchContext);

    var mix = await dashboardService.GetSalesMixAsync(default);
    Assert.Equal(70_000m, mix.ServiceRevenueBase);
    Assert.Equal(70m, mix.ServiceRevenuePercent);
    Assert.Equal(30_000m, mix.ProductRevenueBase);
    Assert.Equal(30m, mix.ProductRevenuePercent);
    Assert.Equal(100_000m, mix.TotalRevenueBase);
  }

  [Fact]
  public async Task Recent_transactions_combines_sources_and_orders_by_timestamp()
  {
    var options = CreateOptions();
    var branch = new BranchEntity { Name = "Main", Code = "MAIN", IsMainBranch = true };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD" };
    var user = new UserEntity { Username = "user", Role = UserRole.Owner };
    var now = DateTime.UtcNow;

    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(branch, currency, user);
      seed.Add(new BusinessEntity { Name = "Prive", BaseCurrencyId = currency.Id, IsActive = true, IsSetupCompleted = true });

      var sale = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "INV-RECENT",
        InvoiceDate = DateOnly.FromDateTime(now),
        Status = SalesInvoiceStatus.Posted,
        Total = 25_000m,
        BaseTotal = 25_000m,
        CreatedByUserId = user.Id,
        CreatedAtUtc = now.AddMinutes(-10),
        PostedAtUtc = now.AddMinutes(-10)
      };

      var posInvoice = new SalesInvoiceEntity
      {
        BranchId = branch.Id,
        CurrencyId = currency.Id,
        BaseCurrencyId = currency.Id,
        DocumentNumber = "POS-RECENT",
        InvoiceDate = DateOnly.FromDateTime(now),
        Status = SalesInvoiceStatus.Posted,
        Total = 15_000m,
        BaseTotal = 15_000m,
        CreatedByUserId = user.Id,
        CreatedAtUtc = now.AddMinutes(-5),
        PostedAtUtc = now.AddMinutes(-5)
      };
      var pos = new PosSaleEntity
      {
        DocumentNumber = "POS-RECENT",
        SalesInvoice = posInvoice,
        CashierUserId = user.Id,
        Status = PosSaleStatus.Completed,
        CompletedAtUtc = now.AddMinutes(-5)
      };

      seed.AddRange(sale, posInvoice, pos);
      await seed.SaveChangesAsync();
    }

    var branchContext = new BranchContext { BranchId = branch.Id };
    await using var db = new AppDbContext(options, branchContext);
    var dashboardService = new DashboardService(db, branchContext);

    var transactions = await dashboardService.GetRecentTransactionsAsync(10, default);
    Assert.Equal(2, transactions.Count);
    Assert.Equal("POS-RECENT", transactions[0].DocumentNumber);
    Assert.Equal("INV-RECENT", transactions[1].DocumentNumber);
  }
}
