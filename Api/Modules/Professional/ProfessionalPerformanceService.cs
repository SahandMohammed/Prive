using Api.Infrastructure.Http;
using Api.Modules.Pos;
using Api.Modules.Sales;
using Api.Shared.Persistence;
using Api.Shared.Time;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Professional;

public sealed class ProfessionalPerformanceService
{
  private readonly AppDbContext _db;
  private readonly BranchContext _branch;

  public ProfessionalPerformanceService(AppDbContext db, BranchContext branch)
  {
    _db = db;
    _branch = branch;
  }

  public async Task<ProfessionalPerformanceResponse> GetAsync(
    ProfessionalPerformanceQuery request,
    CancellationToken ct)
  {
    if (!Enum.IsDefined(request.Period) || !Enum.IsDefined(request.Source))
      throw InvalidPeriod();
    var branchId = _branch.BranchId
      ?? throw new BadRequestException(ErrorCodes.Branch.SelectionRequired,
        "Select a branch before viewing Professional Performance.");
    var business = await _db.Businesses.AsNoTracking().Include(item => item.BaseCurrency)
      .SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.BusinessNotConfigured,
        "Complete Business Setup before viewing Professional Performance.");
    var today = BusinessTime.DateAt(business, DateTime.UtcNow);
    var (fromDate, toDate) = ResolveDates(request, today);
    var utcRange = BusinessTime.UtcRange(business, fromDate, toDate);

    var salesQuery = _db.SalesInvoiceLines.AsNoTracking()
      .Where(line => line.SalesInvoice.BranchId == branchId
        && !line.SalesInvoice.IsDeleted
        && line.SalesInvoice.Status == SalesInvoiceStatus.Posted
        && line.SalesInvoice.InvoiceDate >= fromDate
        && line.SalesInvoice.InvoiceDate <= toDate
        && line.LineType == SalesLineType.Service
        && line.ProfessionalId != null);
    if (request.ProfessionalId is Guid professionalId)
      salesQuery = salesQuery.Where(line => line.ProfessionalId == professionalId);
    if (request.ServiceId is Guid serviceId)
      salesQuery = salesQuery.Where(line => line.ServiceId == serviceId);
    salesQuery = request.Source switch
    {
      ProfessionalPerformanceSource.Pos => salesQuery.Where(line => line.SalesInvoice.PosContext != null),
      ProfessionalPerformanceSource.Manual => salesQuery.Where(line => line.SalesInvoice.PosContext == null),
      _ => salesQuery
    };
    var sales = await salesQuery.Select(line => new
    {
      ProfessionalId = line.ProfessionalId!.Value,
      ProfessionalName = line.Professional!.Name,
      InvoiceId = line.SalesInvoiceId,
      line.Quantity,
      line.BaseLineAmount
    }).ToListAsync(ct);

    var refundsQuery = _db.PosRefundLines.IgnoreQueryFilters().AsNoTracking()
      .Where(line => line.PosRefund.Status == PosRefundStatus.Posted
        && line.PosRefund.PostedAtUtc >= utcRange.FromUtc
        && line.PosRefund.PostedAtUtc < utcRange.ToUtc
        && line.OriginalSalesInvoiceLine.SalesInvoice.BranchId == branchId
        && line.LineType == SalesLineType.Service
        && line.ProfessionalId != null);
    if (request.ProfessionalId is Guid refundProfessionalId)
      refundsQuery = refundsQuery.Where(line => line.ProfessionalId == refundProfessionalId);
    if (request.ServiceId is Guid refundServiceId)
      refundsQuery = refundsQuery.Where(line => line.ServiceId == refundServiceId);
    refundsQuery = request.Source switch
    {
      ProfessionalPerformanceSource.Pos => refundsQuery.Where(line => line.OriginalSalesInvoiceLine.SalesInvoice.PosContext != null),
      ProfessionalPerformanceSource.Manual => refundsQuery.Where(line => line.OriginalSalesInvoiceLine.SalesInvoice.PosContext == null),
      _ => refundsQuery
    };
    var refunds = await refundsQuery.Select(line => new
    {
      ProfessionalId = line.ProfessionalId!.Value,
      ProfessionalName = line.ProfessionalName ?? "Professional",
      line.RefundAmountBase
    }).ToListAsync(ct);

    var professionalIds = sales.Select(row => row.ProfessionalId)
      .Concat(refunds.Select(row => row.ProfessionalId)).Distinct().ToList();
    var rows = professionalIds.Select(id =>
    {
      var professionalSales = sales.Where(row => row.ProfessionalId == id).ToList();
      var professionalRefunds = refunds.Where(row => row.ProfessionalId == id).ToList();
      var gross = Money(professionalSales.Sum(row => row.BaseLineAmount));
      var refunded = Money(professionalRefunds.Sum(row => row.RefundAmountBase));
      return new ProfessionalPerformanceRowResponse(
        id,
        professionalSales.Select(row => row.ProfessionalName).FirstOrDefault()
          ?? professionalRefunds.Select(row => row.ProfessionalName).First(),
        Quantity(professionalSales.Sum(row => row.Quantity)),
        professionalSales.Select(row => row.InvoiceId).Distinct().Count(),
        gross,
        refunded,
        Money(gross - refunded));
    }).OrderByDescending(row => row.NetValueBase)
      .ThenBy(row => row.ProfessionalName)
      .ToList();

    return new ProfessionalPerformanceResponse(
      fromDate, toDate, business.BaseCurrencyId, business.BaseCurrency.Code, rows);
  }

  private static (DateOnly FromDate, DateOnly ToDate) ResolveDates(
    ProfessionalPerformanceQuery request,
    DateOnly today) => request.Period switch
  {
    ProfessionalPerformancePeriod.Today => (today, today),
    ProfessionalPerformancePeriod.ThisWeek =>
      (today.AddDays(-(((int)today.DayOfWeek + 6) % 7)), today),
    ProfessionalPerformancePeriod.ThisMonth =>
      (new DateOnly(today.Year, today.Month, 1), today),
    ProfessionalPerformancePeriod.Custom when request.FromDate is DateOnly from
      && request.ToDate is DateOnly to && from <= to => (from, to),
    _ => throw InvalidPeriod()
  };

  private static BadRequestException InvalidPeriod() => new(
    ErrorCodes.Common.ValidationFailed,
    "Custom Professional Performance periods require a valid inclusive fromDate and toDate.");
  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
  private static decimal Quantity(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
}
