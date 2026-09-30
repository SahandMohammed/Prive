using Api.Modules.Pos;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Finance;

public sealed record InvoiceSettlement(
  Guid SalesInvoiceId,
  decimal CollectedAmount,
  decimal CollectedBaseAmount,
  decimal ReceivableReductionAmount,
  decimal ReceivableReductionBaseAmount,
  decimal EffectiveReceivable,
  decimal EffectiveReceivableBaseAmount,
  decimal OutstandingAmount,
  decimal OutstandingBaseAmount,
  decimal OverpaidAmount,
  decimal OverpaidBaseAmount);

/// <summary>
/// The single settlement projection for Sales Invoices. It deliberately reads only
/// active Payment allocations and posted refund AR reductions.
/// </summary>
public sealed class InvoiceSettlementReader
{
  private readonly AppDbContext _db;

  public InvoiceSettlementReader(AppDbContext db) => _db = db;

  public async Task<InvoiceSettlement> GetAsync(Guid invoiceId, CancellationToken ct = default) =>
    (await GetManyAsync([invoiceId], ct)).GetValueOrDefault(invoiceId)
    ?? throw new InvalidOperationException($"Sales Invoice '{invoiceId}' was not found.");

  public async Task<IReadOnlyDictionary<Guid, InvoiceSettlement>> GetManyAsync(
    IReadOnlyCollection<Guid> invoiceIds,
    CancellationToken ct = default)
  {
    if (invoiceIds.Count == 0) return new Dictionary<Guid, InvoiceSettlement>();

    var invoices = await _db.SalesInvoices.AsNoTracking()
      .Where(invoice => invoiceIds.Contains(invoice.Id))
      .Select(invoice => new { invoice.Id, invoice.Total, invoice.BaseTotal, invoice.ExchangeRate })
      .ToListAsync(ct);
    var allocations = await _db.PaymentAllocations.AsNoTracking()
      .Where(allocation => invoiceIds.Contains(allocation.SalesInvoiceId))
      .GroupBy(allocation => allocation.SalesInvoiceId)
      .Select(group => new
      {
        SalesInvoiceId = group.Key,
        Amount = group.Sum(allocation => allocation.Amount),
        BaseAmount = group.Sum(allocation => allocation.BaseAmount)
      })
      .ToDictionaryAsync(row => row.SalesInvoiceId, ct);
    var refunds = await _db.PosRefunds.AsNoTracking()
      .Where(refund => invoiceIds.Contains(refund.SalesInvoiceId)
        && refund.Status == PosRefundStatus.Posted)
      .GroupBy(refund => refund.SalesInvoiceId)
      .Select(group => new
      {
        SalesInvoiceId = group.Key,
        BaseAmount = group.Sum(refund => refund.ReceivableReversalBase)
      })
      .ToDictionaryAsync(row => row.SalesInvoiceId, ct);

    return invoices.ToDictionary(invoice => invoice.Id, invoice =>
    {
      var collected = allocations.GetValueOrDefault(invoice.Id);
      var reductionBase = Money(refunds.GetValueOrDefault(invoice.Id)?.BaseAmount ?? 0m);
      var reduction = invoice.ExchangeRate > 0 ? Money(reductionBase / invoice.ExchangeRate) : 0m;
      var collectedAmount = Money(collected?.Amount ?? 0m);
      var collectedBase = Money(collected?.BaseAmount ?? 0m);
      var effective = Math.Max(Money(invoice.Total - reduction), 0m);
      var effectiveBase = Math.Max(Money(invoice.BaseTotal - reductionBase), 0m);
      return new InvoiceSettlement(
        invoice.Id,
        collectedAmount,
        collectedBase,
        reduction,
        reductionBase,
        effective,
        effectiveBase,
        Math.Max(Money(effective - collectedAmount), 0m),
        Math.Max(Money(effectiveBase - collectedBase), 0m),
        Math.Max(Money(collectedAmount - effective), 0m),
        Math.Max(Money(collectedBase - effectiveBase), 0m));
    });
  }

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
}
