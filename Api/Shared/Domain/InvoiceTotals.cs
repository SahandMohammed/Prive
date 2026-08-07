namespace Api.Shared.Domain;

public sealed record InvoiceLineTotalInput(
  decimal Quantity,
  decimal UnitPrice,
  decimal DiscountAmount,
  decimal LineTotal);

public static class InvoiceTotals
{
  public static bool Reconcile(
    IEnumerable<InvoiceLineTotalInput> lines,
    decimal invoiceSubtotal,
    decimal invoiceDiscountTotal,
    decimal invoiceTotal,
    int precision)
  {
    if (precision is < 0 or > 6 || invoiceTotal <= 0) return false;

    var subtotal = 0m;
    var discounts = 0m;
    var total = 0m;
    foreach (var line in lines)
    {
      var lineSubtotal = decimal.Round(line.Quantity * line.UnitPrice, precision, MidpointRounding.AwayFromZero);
      var lineTotal = lineSubtotal - line.DiscountAmount;
      if (line.DiscountAmount < 0 || line.DiscountAmount > lineSubtotal || line.LineTotal != lineTotal)
      {
        return false;
      }

      subtotal += lineSubtotal;
      discounts += line.DiscountAmount;
      total += lineTotal;
    }

    return invoiceSubtotal == subtotal &&
           invoiceDiscountTotal == discounts &&
           invoiceTotal == total;
  }
}
