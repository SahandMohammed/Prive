using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Pos;
using Api.Modules.Professional;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Api.Shared.Time;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class ProfessionalPerformanceTests
{
  [Fact]
  public async Task Report_uses_authoritative_base_values_distinct_visits_and_half_open_refund_boundaries()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ProfessionalPerformanceService(db, new BranchContext { BranchId = data.BranchId });
    var query = new ProfessionalPerformanceQuery
    {
      Period = ProfessionalPerformancePeriod.Custom,
      FromDate = data.ReportDate,
      ToDate = data.ReportDate,
      Source = ProfessionalPerformanceSource.All
    };

    var report = await service.GetAsync(query, default);

    Assert.Equal(data.ReportDate, report.FromDate);
    Assert.Equal(data.ReportDate, report.ToDate);
    Assert.Equal("IQD", report.BaseCurrencyCode);
    var first = report.Rows.Single(row => row.ProfessionalId == data.FirstProfessionalId);
    Assert.Equal(6, first.ServiceQuantity);
    Assert.Equal(2, first.VisitsServed);
    Assert.Equal(707.4568m, first.GrossValueBase);
    Assert.Equal(100.1111m, first.RefundValueBase);
    Assert.Equal(607.3457m, first.NetValueBase);

    var refundOnly = report.Rows.Single(row => row.ProfessionalId == data.RefundOnlyProfessionalId);
    Assert.Equal(0, refundOnly.ServiceQuantity);
    Assert.Equal(0, refundOnly.VisitsServed);
    Assert.Equal(0, refundOnly.GrossValueBase);
    Assert.Equal(30, refundOnly.RefundValueBase);
    Assert.Equal(-30, refundOnly.NetValueBase);
  }

  [Fact]
  public async Task Source_and_service_filters_follow_original_invoice_and_refund_line_snapshots()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = new ProfessionalPerformanceService(db, new BranchContext { BranchId = data.BranchId });
    var baseQuery = new ProfessionalPerformanceQuery
    {
      Period = ProfessionalPerformancePeriod.Custom,
      FromDate = data.ReportDate,
      ToDate = data.ReportDate,
      ServiceId = data.ServiceId
    };

    var pos = await service.GetAsync(new ProfessionalPerformanceQuery
    {
      Period = baseQuery.Period,
      FromDate = baseQuery.FromDate,
      ToDate = baseQuery.ToDate,
      ServiceId = baseQuery.ServiceId,
      Source = ProfessionalPerformanceSource.Pos
    }, default);
    var posFirst = pos.Rows.Single(row => row.ProfessionalId == data.FirstProfessionalId);
    Assert.Equal(3, posFirst.ServiceQuantity);
    Assert.Equal(1, posFirst.VisitsServed);
    Assert.Equal(307.1235m, posFirst.GrossValueBase);
    Assert.Equal(100.1111m, posFirst.RefundValueBase);
    Assert.Equal(-30, pos.Rows.Single(row => row.ProfessionalId == data.RefundOnlyProfessionalId).NetValueBase);

    var manual = await service.GetAsync(new ProfessionalPerformanceQuery
    {
      Period = baseQuery.Period,
      FromDate = baseQuery.FromDate,
      ToDate = baseQuery.ToDate,
      ServiceId = baseQuery.ServiceId,
      Source = ProfessionalPerformanceSource.Manual
    }, default);
    var manualFirst = manual.Rows.Single(row => row.ProfessionalId == data.FirstProfessionalId);
    Assert.Equal(3, manualFirst.ServiceQuantity);
    Assert.Equal(1, manualFirst.VisitsServed);
    Assert.Equal(400.3333m, manualFirst.GrossValueBase);
    Assert.Equal(0, manualFirst.RefundValueBase);
    Assert.DoesNotContain(manual.Rows, row => row.ProfessionalId == data.RefundOnlyProfessionalId);
  }

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
    return new AppDbContext(options, new BranchContext());
  }

  private static async Task<TestData> SeedAsync(AppDbContext db)
  {
    var reportDate = new DateOnly(2026, 10, 5);
    var user = new UserEntity { Username = "manager", PasswordHash = "x", Role = UserRole.Manager };
    var iqd = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD", DecimalPlaces = 0 };
    var usd = new CurrencyEntity { Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2 };
    var business = new BusinessEntity
    {
      Name = "Prive", PrimaryPhoneNumber = "1", Address = "A", City = "C", Region = "R", Country = "IQ",
      BaseCurrency = iqd, IsSetupCompleted = true, TimeZoneId = "Asia/Baghdad"
    };
    var branch = new BranchEntity
    {
      Id = Guid.NewGuid(),
      Code = "MAIN", Name = "Main", Address = "A", City = "C", Region = "R", Country = "IQ", IsMainBranch = true
    };
    var processingBranch = new BranchEntity
    {
      Code = "OTHER", Name = "Other", Address = "A", City = "C", Region = "R", Country = "IQ"
    };
    var walkIn = new ContactEntity
    {
      Name = "Walk-in Customer", IsCustomer = true, IsActive = true, SystemRole = ContactSystemRole.WalkInCustomer
    };
    branch.WalkInCustomer = walkIn;
    var customer = new ContactEntity { Name = "Customer", IsCustomer = true, IsActive = true };
    var revenue = new AccountEntity { Code = "43121", Name = "Service Revenue", Classification = AccountClassification.Revenue };
    var category = new ServiceCategoryEntity { Name = "Hair" };
    var salonService = new ServiceEntity
    {
      Name = "Haircut", Category = category, SellingPriceBase = 100, DurationMinutes = 30, RevenueAccount = revenue
    };
    var first = new ProfessionalEntity { Name = "Sara", IsActive = false };
    var second = new ProfessionalEntity { Name = "Daban" };
    var refundOnly = new ProfessionalEntity { Name = "Historical", IsActive = false };
    db.AddRange(user, iqd, usd, business, branch, processingBranch, walkIn, customer, revenue, category,
      salonService, first, second, refundOnly);
    await db.SaveChangesAsync();

    var posInvoice = Invoice("SI-POS", reportDate, branch, customer, iqd, iqd, user, 307.1235m);
    var posLine1 = Line(posInvoice, salonService, first, 2, 180, 257.1234m);
    var posLine2 = Line(posInvoice, salonService, first, 1, 40, 50.0001m);
    posInvoice.Lines.Add(posLine1);
    posInvoice.Lines.Add(posLine2);
    posInvoice.PosContext = new PosContextEntity
    {
      SalesInvoice = posInvoice,
      SalesInvoiceId = posInvoice.Id,
      OperatorUser = user,
      OperatorUserId = user.Id,
      CompletedAtUtc = new DateTime(2026, 10, 5, 10, 0, 0, DateTimeKind.Utc)
    };

    var manualInvoice = Invoice("SI-MANUAL", reportDate, branch, customer, usd, iqd, user, 400.3333m);
    manualInvoice.ExchangeRate = 1_333.333m;
    manualInvoice.Lines.Add(Line(manualInvoice, salonService, first, 3, 0.30m, 400.3333m));

    var secondInvoice = Invoice("SI-SECOND", reportDate, branch, customer, iqd, iqd, user, 90);
    secondInvoice.Lines.Add(Line(secondInvoice, salonService, second, 1, 90, 90));
    secondInvoice.PosContext = new PosContextEntity
    {
      SalesInvoice = secondInvoice,
      SalesInvoiceId = secondInvoice.Id,
      OperatorUser = user,
      OperatorUserId = user.Id,
      CompletedAtUtc = new DateTime(2026, 10, 5, 11, 0, 0, DateTimeKind.Utc)
    };

    var oldManualInvoice = Invoice("SI-OLD", reportDate.AddDays(-4), branch, customer, iqd, iqd, user, 30);
    var oldLine = Line(oldManualInvoice, salonService, refundOnly, 1, 30, 30);
    oldManualInvoice.Lines.Add(oldLine);
    oldManualInvoice.PosContext = new PosContextEntity
    {
      SalesInvoice = oldManualInvoice,
      SalesInvoiceId = oldManualInvoice.Id,
      OperatorUser = user,
      OperatorUserId = user.Id,
      CompletedAtUtc = new DateTime(2026, 10, 1, 10, 0, 0, DateTimeKind.Utc)
    };
    var otherBranchInvoice = Invoice("SI-OTHER", reportDate, processingBranch, customer, iqd, iqd, user, 9_999);
    otherBranchInvoice.Lines.Add(Line(otherBranchInvoice, salonService, first, 100, 9_999, 9_999));
    db.AddRange(posInvoice, manualInvoice, secondInvoice, oldManualInvoice, otherBranchInvoice);
    await db.SaveChangesAsync();

    var utcRange = BusinessTime.UtcRange(business, reportDate, reportDate);
    db.PosRefunds.Add(Refund("REF-IN", posInvoice, processingBranch, customer, user, utcRange.ToUtc.AddTicks(-1),
      RefundLine(posLine1, first.Id, "Sara at posting", 100.1111m)));
    db.PosRefunds.Add(Refund("REF-NEXT", posInvoice, branch, customer, user, utcRange.ToUtc,
      RefundLine(posLine1, first.Id, "Sara at posting", 20)));
    db.PosRefunds.Add(Refund("REF-ONLY", oldManualInvoice, branch, customer, user, utcRange.FromUtc,
      RefundLine(oldLine, refundOnly.Id, "Historical snapshot", 30)));
    await db.SaveChangesAsync();

    return new(reportDate, branch.Id, salonService.Id, first.Id, refundOnly.Id);
  }

  private static SalesInvoiceEntity Invoice(
    string documentNumber,
    DateOnly date,
    BranchEntity branch,
    ContactEntity customer,
    CurrencyEntity currency,
    CurrencyEntity baseCurrency,
    UserEntity user,
    decimal baseTotal) => new()
    {
      DocumentNumber = documentNumber,
      InvoiceDate = date,
      Branch = branch,
      Customer = customer,
      Currency = currency,
      BaseCurrency = baseCurrency,
      Total = baseTotal,
      BaseTotal = baseTotal,
      Subtotal = baseTotal,
      Status = SalesInvoiceStatus.Posted,
      CreatedByUser = user,
      PostedAtUtc = DateTime.UtcNow
    };

  private static SalesInvoiceLineEntity Line(
    SalesInvoiceEntity invoice,
    ServiceEntity service,
    ProfessionalEntity professional,
    decimal quantity,
    decimal nativeAmount,
    decimal baseAmount) => new()
    {
      SalesInvoice = invoice,
      Service = service,
      LineType = SalesLineType.Service,
      Professional = professional,
      Quantity = quantity,
      BaseQuantity = quantity,
      UnitPrice = nativeAmount / quantity,
      BaseUnitPrice = baseAmount / quantity,
      LineSubtotal = nativeAmount,
      LineAmount = nativeAmount,
      BaseLineAmount = baseAmount,
      RevenueAccountId = service.RevenueAccountId
    };

  private static PosRefundLineEntity RefundLine(
    SalesInvoiceLineEntity original,
    Guid professionalId,
    string professionalName,
    decimal amount) => new()
    {
      OriginalSalesInvoiceLine = original,
      LineType = SalesLineType.Service,
      ServiceId = original.ServiceId,
      ProfessionalId = professionalId,
      ProfessionalName = professionalName,
      Description = original.Service!.Name,
      Quantity = 1,
      BaseQuantity = 1,
      RefundAmountBase = amount,
      RevenueAccountId = original.Service.RevenueAccountId
    };

  private static PosRefundEntity Refund(
    string documentNumber,
    SalesInvoiceEntity invoice,
    BranchEntity branch,
    ContactEntity customer,
    UserEntity user,
    DateTime postedAtUtc,
    PosRefundLineEntity line)
  {
    var refund = new PosRefundEntity
    {
      DocumentNumber = documentNumber,
      SalesInvoice = invoice,
      PosContext = invoice.PosContext!,
      Branch = branch,
      Customer = customer,
      Reason = PosRefundReason.CustomerComplaint,
      Status = PosRefundStatus.Posted,
      TotalRefundBase = line.RefundAmountBase,
      CashRefundBase = line.RefundAmountBase,
      CreatedByUser = user,
      ApprovedByUser = user,
      CreatedAtUtc = postedAtUtc,
      PostedAtUtc = postedAtUtc,
      JournalEntry = new JournalEntryEntity { Branch = branch, EntryDate = DateOnly.FromDateTime(postedAtUtc), Status = JournalEntryStatus.Posted }
    };
    line.PosRefund = refund;
    refund.Lines.Add(line);
    return refund;
  }

  private sealed record TestData(
    DateOnly ReportDate,
    Guid BranchId,
    Guid ServiceId,
    Guid FirstProfessionalId,
    Guid RefundOnlyProfessionalId);
}
