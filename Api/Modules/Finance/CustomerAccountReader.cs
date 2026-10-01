using Api.Infrastructure.Http;
using Api.Modules.Contact;
using Api.Modules.Pos;
using Api.Modules.Sales;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Finance;

/// <summary>Derived customer receivable projection. No balance is stored on Customer.</summary>
public sealed class CustomerAccountReader
{
  private readonly AppDbContext _db;

  public CustomerAccountReader(AppDbContext db) => _db = db;

  public async Task<CustomerAccountSummaryResponse> GetSummaryAsync(Guid customerId, CancellationToken ct)
  {
    var context = await RequireContextAsync(customerId, ct);
    var invoiceTotals = await _db.SalesInvoices.AsNoTracking()
      .Where(invoice => invoice.CustomerId == customerId && invoice.Status == SalesInvoiceStatus.Posted)
      .GroupBy(invoice => new { invoice.CurrencyId, invoice.Currency.Code })
      .Select(group => new
      {
        group.Key.CurrencyId,
        CurrencyCode = group.Key.Code,
        Amount = group.Sum(invoice => invoice.Total),
        BaseAmount = group.Sum(invoice => invoice.BaseTotal)
      })
      .OrderBy(item => item.CurrencyCode)
      .ToListAsync(ct);

    var refundTotals = await _db.PosRefunds.AsNoTracking()
      .Where(refund => refund.SalesInvoice.CustomerId == customerId
        && refund.SalesInvoice.Status == SalesInvoiceStatus.Posted
        && refund.Status == PosRefundStatus.Posted)
      .GroupBy(refund => refund.SalesInvoice.CurrencyId)
      .Select(group => new
      {
        CurrencyId = group.Key,
        Amount = group.Sum(refund => refund.SalesInvoice.ExchangeRate > 0m
          ? refund.ReceivableReversalBase / refund.SalesInvoice.ExchangeRate : 0m),
        BaseAmount = group.Sum(refund => refund.ReceivableReversalBase)
      })
      .ToDictionaryAsync(item => item.CurrencyId, ct);

    var collectionTotals = await _db.PaymentAllocations.AsNoTracking()
      .Where(allocation => allocation.SalesInvoice.CustomerId == customerId
        && allocation.SalesInvoice.Status == SalesInvoiceStatus.Posted
        && !allocation.Payment.IsDeleted)
      .GroupBy(allocation => allocation.SalesInvoice.CurrencyId)
      .Select(group => new
      {
        CurrencyId = group.Key,
        Amount = group.Sum(allocation => allocation.Amount),
        BaseAmount = group.Sum(allocation => allocation.BaseAmount)
      })
      .ToDictionaryAsync(item => item.CurrencyId, ct);

    var rows = invoiceTotals.Select(row =>
    {
      var refund = refundTotals.GetValueOrDefault(row.CurrencyId);
      var collected = collectionTotals.GetValueOrDefault(row.CurrencyId);
      return new CurrencyBalance(
        row.CurrencyId,
        row.CurrencyCode,
        Math.Max(row.Amount - (refund?.Amount ?? 0m), 0m),
        Math.Max(row.BaseAmount - (refund?.BaseAmount ?? 0m), 0m),
        collected?.Amount ?? 0m,
        collected?.BaseAmount ?? 0m);
    }).ToList();

    var currencies = rows.Select(row =>
    {
      var receivable = Money(row.Receivable);
      var collected = Money(row.Collected);
      var net = Money(receivable - collected);
      return new CustomerAccountCurrencySummary(
        row.CurrencyId, row.CurrencyCode, receivable, collected, net,
        Math.Max(net, 0m), Math.Max(-net, 0m));
    }).ToList();
    var totalReceivable = Money(rows.Sum(row => row.ReceivableBase));
    var totalCollected = Money(rows.Sum(row => row.CollectedBase));
    var netBalance = Money(totalReceivable - totalCollected);
    return new CustomerAccountSummaryResponse(
      context.Customer.Id, context.Customer.Name, context.BaseCurrencyId, context.BaseCurrencyCode,
      totalReceivable, totalCollected, netBalance, Math.Max(netBalance, 0m), Math.Max(-netBalance, 0m),
      currencies);
  }

  public async Task<CustomerAccountStatementResponse> GetStatementAsync(
    Guid customerId,
    CustomerAccountStatementQuery request,
    CancellationToken ct)
  {
    if (request.FromDate == default || request.ToDate == default || request.FromDate > request.ToDate)
      throw new BadRequestException(ErrorCodes.Finance.CustomerAccountDateRangeInvalid,
        "Choose an inclusive statement date range where fromDate is not after toDate.");

    var context = await RequireContextAsync(customerId, ct);
    var entries = StatementEntries(customerId);
    var opening = Money(await entries.Where(entry => entry.EventDate < request.FromDate)
      .SumAsync(entry => (decimal?)entry.SignedBaseImpact, ct) ?? 0m);
    var range = entries.Where(entry => entry.EventDate >= request.FromDate && entry.EventDate <= request.ToDate);
    var totalCount = await range.CountAsync(ct);
    var rangeImpact = await range.SumAsync(entry => (decimal?)entry.SignedBaseImpact, ct) ?? 0m;
    var closing = Money(opening + rangeImpact);
    var pageNumber = Math.Max(request.PageNumber, 1);
    var pageSize = request.PageSize < 1 ? 25 : Math.Min(request.PageSize, PaginationRequest.MaximumPageSize);
    var skip = (int)Math.Min((long)(pageNumber - 1) * pageSize, int.MaxValue);
    var ordered = range.OrderBy(entry => entry.EventDate)
      .ThenBy(entry => entry.CreatedAtUtc)
      .ThenBy(entry => entry.EntryRank)
      .ThenBy(entry => entry.SourceId);
    var priorPageImpact = skip == 0
      ? 0m
      : await ordered.Take(skip).SumAsync(entry => (decimal?)entry.SignedBaseImpact, ct) ?? 0m;
    var rows = await ordered.Skip(skip).Take(pageSize).ToListAsync(ct);
    var pagePaymentIds = rows
      .Where(entry => entry.EntryType == CustomerAccountEntryType.Payment)
      .Select(entry => entry.SourceId)
      .ToArray();
    var paymentSources = pagePaymentIds.Length == 0
      ? new Dictionary<Guid, PaymentSourceMetadata>()
      : await _db.Payments.AsNoTracking()
        .Where(payment => pagePaymentIds.Contains(payment.Id))
        .Select(payment => new PaymentSourceMetadata
        {
          PaymentId = payment.Id,
          Origin = payment.Origin,
          SourceId = payment.Origin == PaymentOrigin.CustomerReceipt
            ? payment.SourceCustomerReceipt != null ? (Guid?)payment.SourceCustomerReceipt.Id : null
            : payment.SourceSalesInvoiceId,
          DocumentNumber = payment.Origin == PaymentOrigin.CustomerReceipt
            ? payment.SourceCustomerReceipt != null ? payment.SourceCustomerReceipt.DocumentNumber : null
            : payment.SourceSalesInvoice != null ? payment.SourceSalesInvoice.DocumentNumber : null
        })
        .ToDictionaryAsync(item => item.PaymentId, ct);

    var running = Money(opening + priorPageImpact);
    var page = rows.Select(entry =>
    {
      running = Money(running + entry.SignedBaseImpact);
      paymentSources.TryGetValue(entry.SourceId, out var paymentSource);
      var origin = entry.EntryType switch
      {
        CustomerAccountEntryType.Payment => paymentSource?.Origin switch
        {
          PaymentOrigin.CustomerReceipt => "CustomerReceipt",
          PaymentOrigin.Pos => "Pos",
          _ => "SalesInvoice"
        },
        CustomerAccountEntryType.RefundReceivableAdjustment => "PosRefund",
        _ => "SalesInvoice"
      };
      return new CustomerAccountStatementEntryResponse(
        entry.EntryType, entry.EventDate, entry.CreatedAtUtc, entry.SourceId, entry.DocumentNumber,
        origin, paymentSource?.SourceId ?? entry.RelatedSourceId,
        paymentSource?.DocumentNumber ?? entry.RelatedDocumentNumber, entry.CurrencyId,
        entry.CurrencyCode, Money(entry.Amount), Money(entry.BaseAmount),
        Money(entry.SignedBaseImpact), running);
    }).ToList();
    var paged = new PagedResult<CustomerAccountStatementEntryResponse>(page, totalCount, pageNumber, pageSize);
    return new CustomerAccountStatementResponse(
      context.Customer.Id, context.Customer.Name, context.BaseCurrencyId, context.BaseCurrencyCode,
      request.FromDate, request.ToDate, opening, closing, page, paged.ToMetadata());
  }

  private IQueryable<StatementRow> StatementEntries(Guid customerId)
  {
    var invoices = _db.SalesInvoices.AsNoTracking()
      .Where(invoice => invoice.CustomerId == customerId && invoice.Status == SalesInvoiceStatus.Posted)
      .Select(invoice => new StatementRow
      {
        EntryType = CustomerAccountEntryType.Invoice,
        EntryRank = 0,
        EventDate = invoice.InvoiceDate,
        CreatedAtUtc = invoice.CreatedAtUtc,
        SourceId = invoice.Id,
        DocumentNumber = invoice.DocumentNumber,
        RelatedSourceId = null,
        RelatedDocumentNumber = null,
        CurrencyId = invoice.CurrencyId,
        CurrencyCode = invoice.Currency.Code,
        Amount = invoice.Total,
        BaseAmount = invoice.BaseTotal,
        SignedBaseImpact = invoice.BaseTotal
      });

    var payments = _db.PaymentAllocations.AsNoTracking()
      .Where(allocation => allocation.SalesInvoice.CustomerId == customerId
        && allocation.SalesInvoice.Status == SalesInvoiceStatus.Posted
        && !allocation.Payment.IsDeleted)
      .GroupBy(allocation => new
      {
        allocation.PaymentId,
        allocation.Payment.DocumentNumber,
        allocation.Payment.PaymentDate,
        allocation.Payment.CreatedAtUtc,
        allocation.Payment.CurrencyId,
        CurrencyCode = allocation.Payment.Currency.Code
      })
      .Select(group => new StatementRow
      {
        EntryType = CustomerAccountEntryType.Payment,
        EntryRank = 1,
        EventDate = group.Key.PaymentDate,
        CreatedAtUtc = group.Key.CreatedAtUtc,
        SourceId = group.Key.PaymentId,
        DocumentNumber = group.Key.DocumentNumber,
        RelatedSourceId = null,
        RelatedDocumentNumber = null,
        CurrencyId = group.Key.CurrencyId,
        CurrencyCode = group.Key.CurrencyCode,
        Amount = group.Sum(item => item.Amount),
        BaseAmount = group.Sum(item => item.BaseAmount),
        SignedBaseImpact = -group.Sum(item => item.BaseAmount)
      });

    var refunds = _db.PosRefunds.AsNoTracking()
      .Where(refund => refund.SalesInvoice.CustomerId == customerId
        && refund.SalesInvoice.Status == SalesInvoiceStatus.Posted
        && refund.Status == PosRefundStatus.Posted
        && refund.ReceivableReversalBase > 0m)
      .Select(refund => new StatementRow
      {
        EntryType = CustomerAccountEntryType.RefundReceivableAdjustment,
        EntryRank = 2,
        EventDate = DateOnly.FromDateTime(refund.PostedAtUtc),
        CreatedAtUtc = refund.PostedAtUtc,
        SourceId = refund.Id,
        DocumentNumber = refund.DocumentNumber,
        RelatedSourceId = refund.SalesInvoiceId,
        RelatedDocumentNumber = refund.SalesInvoice.DocumentNumber,
        CurrencyId = refund.SalesInvoice.CurrencyId,
        CurrencyCode = refund.SalesInvoice.Currency.Code,
        Amount = refund.SalesInvoice.ExchangeRate > 0m
          ? refund.ReceivableReversalBase / refund.SalesInvoice.ExchangeRate : 0m,
        BaseAmount = refund.ReceivableReversalBase,
        SignedBaseImpact = -refund.ReceivableReversalBase
      });

    return invoices.Concat(payments).Concat(refunds);
  }

  private async Task<AccountContext> RequireContextAsync(Guid customerId, CancellationToken ct)
  {
    var customer = await _db.Contacts.AsNoTracking().SingleOrDefaultAsync(contact =>
      contact.Id == customerId && contact.IsActive && contact.IsCustomer, ct)
      ?? throw new NotFoundException(ErrorCodes.Finance.CustomerInvalid, "Active customer contact not found.");
    var business = await _db.Businesses.AsNoTracking()
      .Where(item => item.IsActive && item.IsSetupCompleted)
      .Select(item => new { item.BaseCurrencyId, BaseCurrencyCode = item.BaseCurrency.Code })
      .SingleOrDefaultAsync(ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.BusinessNotConfigured,
        "Complete Business Setup before viewing customer accounts.");
    return new AccountContext(customer, business.BaseCurrencyId, business.BaseCurrencyCode);
  }

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);

  private sealed record AccountContext(ContactEntity Customer, Guid BaseCurrencyId, string BaseCurrencyCode);
  private sealed record CurrencyBalance(
    Guid CurrencyId, string CurrencyCode, decimal Receivable, decimal ReceivableBase,
    decimal Collected, decimal CollectedBase);
  private sealed class StatementRow
  {
    public CustomerAccountEntryType EntryType { get; init; }
    public int EntryRank { get; init; }
    public DateOnly EventDate { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public Guid SourceId { get; init; }
    public string DocumentNumber { get; init; } = string.Empty;
    public Guid? RelatedSourceId { get; init; }
    public string? RelatedDocumentNumber { get; init; }
    public Guid CurrencyId { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public decimal BaseAmount { get; init; }
    public decimal SignedBaseImpact { get; init; }
  }

  private sealed class PaymentSourceMetadata
  {
    public Guid PaymentId { get; init; }
    public PaymentOrigin Origin { get; init; }
    public Guid? SourceId { get; init; }
    public string? DocumentNumber { get; init; }
  }
}
