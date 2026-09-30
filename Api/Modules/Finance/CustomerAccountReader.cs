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
    var invoices = await LoadInvoiceBalancesAsync(customerId, ct);
    var currencies = invoices.GroupBy(invoice => new { invoice.CurrencyId, invoice.CurrencyCode })
      .Select(group =>
      {
        var receivable = Money(group.Sum(invoice => invoice.EffectiveReceivable));
        var collected = Money(group.Sum(invoice => invoice.Collected));
        var net = Money(receivable - collected);
        return new CustomerAccountCurrencySummary(
          group.Key.CurrencyId, group.Key.CurrencyCode, receivable, collected, net,
          Math.Max(net, 0m), Math.Max(-net, 0m));
      })
      .OrderBy(summary => summary.CurrencyCode)
      .ToList();
    var totalReceivable = Money(invoices.Sum(invoice => invoice.EffectiveReceivableBase));
    var totalCollected = Money(invoices.Sum(invoice => invoice.CollectedBase));
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
    var entries = (await LoadStatementEntriesAsync(customerId, ct))
      .OrderBy(entry => entry.EventDate)
      .ThenBy(entry => entry.CreatedAtUtc)
      .ThenBy(entry => Rank(entry.EntryType))
      .ThenBy(entry => entry.SourceId)
      .ToList();

    var opening = Money(entries.Where(entry => entry.EventDate < request.FromDate)
      .Sum(entry => entry.SignedBaseImpact));
    var range = entries.Where(entry => entry.EventDate >= request.FromDate && entry.EventDate <= request.ToDate)
      .ToList();
    var closing = Money(opening + range.Sum(entry => entry.SignedBaseImpact));
    var pageNumber = Math.Max(request.PageNumber, 1);
    var pageSize = request.PageSize < 1 ? 25 : Math.Min(request.PageSize, PaginationRequest.MaximumPageSize);
    var skip = (int)Math.Min((long)(pageNumber - 1) * pageSize, int.MaxValue);
    var running = Money(opening + range.Take(skip).Sum(entry => entry.SignedBaseImpact));
    var page = range.Skip(skip).Take(pageSize).Select(entry =>
    {
      running = Money(running + entry.SignedBaseImpact);
      return new CustomerAccountStatementEntryResponse(
        entry.EntryType, entry.EventDate, entry.CreatedAtUtc, entry.SourceId, entry.DocumentNumber,
        entry.Origin, entry.RelatedSourceId, entry.RelatedDocumentNumber, entry.CurrencyId,
        entry.CurrencyCode, entry.Amount, entry.BaseAmount, entry.SignedBaseImpact, running);
    }).ToList();
    var paged = new PagedResult<CustomerAccountStatementEntryResponse>(page, range.Count, pageNumber, pageSize);
    return new CustomerAccountStatementResponse(
      context.Customer.Id, context.Customer.Name, context.BaseCurrencyId, context.BaseCurrencyCode,
      request.FromDate, request.ToDate, opening, closing, page, paged.ToMetadata());
  }

  private async Task<List<InvoiceBalanceRow>> LoadInvoiceBalancesAsync(Guid customerId, CancellationToken ct)
  {
    var invoices = await _db.SalesInvoices.AsNoTracking()
      .Where(invoice => invoice.CustomerId == customerId && invoice.Status == SalesInvoiceStatus.Posted)
      .Select(invoice => new
      {
        invoice.Id,
        invoice.CurrencyId,
        CurrencyCode = invoice.Currency.Code,
        invoice.Total,
        invoice.BaseTotal,
        invoice.ExchangeRate
      }).ToListAsync(ct);
    var ids = invoices.Select(invoice => invoice.Id).ToArray();
    var allocations = await _db.PaymentAllocations.AsNoTracking()
      .Where(allocation => ids.Contains(allocation.SalesInvoiceId))
      .GroupBy(allocation => allocation.SalesInvoiceId)
      .Select(group => new
      {
        Id = group.Key,
        Amount = group.Sum(allocation => allocation.Amount),
        BaseAmount = group.Sum(allocation => allocation.BaseAmount)
      }).ToDictionaryAsync(row => row.Id, ct);
    var refunds = await _db.PosRefunds.AsNoTracking()
      .Where(refund => ids.Contains(refund.SalesInvoiceId) && refund.Status == PosRefundStatus.Posted)
      .GroupBy(refund => refund.SalesInvoiceId)
      .Select(group => new { Id = group.Key, BaseAmount = group.Sum(refund => refund.ReceivableReversalBase) })
      .ToDictionaryAsync(row => row.Id, ct);
    return invoices.Select(invoice =>
    {
      var allocation = allocations.GetValueOrDefault(invoice.Id);
      var refundBase = Money(refunds.GetValueOrDefault(invoice.Id)?.BaseAmount ?? 0m);
      var refund = invoice.ExchangeRate > 0 ? Money(refundBase / invoice.ExchangeRate) : 0m;
      return new InvoiceBalanceRow(
        invoice.CurrencyId, invoice.CurrencyCode,
        Math.Max(Money(invoice.Total - refund), 0m),
        Math.Max(Money(invoice.BaseTotal - refundBase), 0m),
        Money(allocation?.Amount ?? 0m), Money(allocation?.BaseAmount ?? 0m));
    }).ToList();
  }

  private async Task<List<StatementRow>> LoadStatementEntriesAsync(Guid customerId, CancellationToken ct)
  {
    var invoices = await _db.SalesInvoices.AsNoTracking()
      .Where(invoice => invoice.CustomerId == customerId && invoice.Status == SalesInvoiceStatus.Posted)
      .Select(invoice => new
      {
        invoice.Id,
        invoice.DocumentNumber,
        invoice.InvoiceDate,
        invoice.CreatedAtUtc,
        invoice.CurrencyId,
        CurrencyCode = invoice.Currency.Code,
        invoice.Total,
        invoice.BaseTotal,
        invoice.ExchangeRate
      }).ToListAsync(ct);
    var invoiceById = invoices.ToDictionary(invoice => invoice.Id);
    var invoiceIds = invoiceById.Keys.ToArray();
    var rows = invoices.Select(invoice => new StatementRow(
      CustomerAccountEntryType.Invoice, invoice.InvoiceDate, invoice.CreatedAtUtc, invoice.Id,
      invoice.DocumentNumber, "SalesInvoice", null, null, invoice.CurrencyId, invoice.CurrencyCode,
      invoice.Total, invoice.BaseTotal, invoice.BaseTotal)).ToList();

    var payments = await _db.PaymentAllocations.AsNoTracking()
      .Where(allocation => invoiceIds.Contains(allocation.SalesInvoiceId))
      .Select(allocation => new
      {
        allocation.PaymentId,
        allocation.Payment.DocumentNumber,
        allocation.Payment.PaymentDate,
        allocation.Payment.CreatedAtUtc,
        allocation.Payment.Origin,
        allocation.Payment.SourceSalesInvoiceId,
        allocation.Payment.CurrencyId,
        CurrencyCode = allocation.Payment.Currency.Code,
        allocation.Amount,
        allocation.BaseAmount
      }).ToListAsync(ct);
    var paymentIds = payments.Select(payment => payment.PaymentId).Distinct().ToArray();
    var receiptSources = await _db.CustomerReceipts.AsNoTracking()
      .Where(receipt => receipt.PaymentId != null && paymentIds.Contains(receipt.PaymentId.Value))
      .ToDictionaryAsync(receipt => receipt.PaymentId!.Value,
        receipt => new RelatedSource(receipt.Id, receipt.DocumentNumber), ct);
    var posSources = await _db.PosSales.AsNoTracking()
      .Where(sale => sale.PaymentId != null && paymentIds.Contains(sale.PaymentId.Value))
      .ToDictionaryAsync(sale => sale.PaymentId!.Value,
        sale => new RelatedSource(sale.Id, sale.DocumentNumber), ct);
    rows.AddRange(payments.GroupBy(payment => new
      {
        payment.PaymentId,
        payment.DocumentNumber,
        payment.PaymentDate,
        payment.CreatedAtUtc,
        payment.Origin,
        payment.SourceSalesInvoiceId,
        payment.CurrencyId,
        payment.CurrencyCode
      }).Select(group =>
      {
        RelatedSource? related = group.Key.Origin switch
        {
          PaymentOrigin.CustomerReceipt => receiptSources.GetValueOrDefault(group.Key.PaymentId),
          PaymentOrigin.Pos => posSources.GetValueOrDefault(group.Key.PaymentId),
          PaymentOrigin.SalesInvoice when group.Key.SourceSalesInvoiceId is Guid invoiceId
            && invoiceById.TryGetValue(invoiceId, out var invoice) => new RelatedSource(invoice.Id, invoice.DocumentNumber),
          _ => null
        };
        var amount = Money(group.Sum(payment => payment.Amount));
        var baseAmount = Money(group.Sum(payment => payment.BaseAmount));
        return new StatementRow(
          CustomerAccountEntryType.Payment, group.Key.PaymentDate, group.Key.CreatedAtUtc,
          group.Key.PaymentId, group.Key.DocumentNumber, group.Key.Origin.ToString(), related?.Id,
          related?.DocumentNumber, group.Key.CurrencyId, group.Key.CurrencyCode, amount, baseAmount,
          -baseAmount);
      }));

    var refunds = await _db.PosRefunds.AsNoTracking()
      .Where(refund => invoiceIds.Contains(refund.SalesInvoiceId)
        && refund.Status == PosRefundStatus.Posted && refund.ReceivableReversalBase > 0)
      .Select(refund => new
      {
        refund.Id,
        refund.DocumentNumber,
        refund.SalesInvoiceId,
        refund.PosSaleId,
        PosDocumentNumber = refund.PosSale.DocumentNumber,
        refund.PostedAtUtc,
        refund.ReceivableReversalBase
      }).ToListAsync(ct);
    rows.AddRange(refunds.Select(refund =>
    {
      var invoice = invoiceById[refund.SalesInvoiceId];
      var amount = invoice.ExchangeRate > 0
        ? Money(refund.ReceivableReversalBase / invoice.ExchangeRate) : 0m;
      return new StatementRow(
        CustomerAccountEntryType.RefundReceivableAdjustment,
        DateOnly.FromDateTime(refund.PostedAtUtc), refund.PostedAtUtc, refund.Id,
        refund.DocumentNumber, "PosRefund", refund.PosSaleId, refund.PosDocumentNumber,
        invoice.CurrencyId, invoice.CurrencyCode, amount, refund.ReceivableReversalBase,
        -refund.ReceivableReversalBase);
    }));
    return rows;
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

  private static int Rank(CustomerAccountEntryType type) => type switch
  {
    CustomerAccountEntryType.Invoice => 0,
    CustomerAccountEntryType.Payment => 1,
    _ => 2
  };

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);

  private sealed record AccountContext(ContactEntity Customer, Guid BaseCurrencyId, string BaseCurrencyCode);
  private sealed record InvoiceBalanceRow(
    Guid CurrencyId, string CurrencyCode, decimal EffectiveReceivable, decimal EffectiveReceivableBase,
    decimal Collected, decimal CollectedBase);
  private sealed record RelatedSource(Guid Id, string DocumentNumber);
  private sealed record StatementRow(
    CustomerAccountEntryType EntryType,
    DateOnly EventDate,
    DateTime CreatedAtUtc,
    Guid SourceId,
    string DocumentNumber,
    string Origin,
    Guid? RelatedSourceId,
    string? RelatedDocumentNumber,
    Guid CurrencyId,
    string CurrencyCode,
    decimal Amount,
    decimal BaseAmount,
    decimal SignedBaseImpact);
}
