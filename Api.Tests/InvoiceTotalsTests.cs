using Api.Shared.Domain;

namespace Api.Tests;

public sealed class InvoiceTotalsTests
{
  [Fact]
  public void Reconcile_UsesConfiguredPrecisionAndLineDiscounts()
  {
    var lines = new[]
    {
      new InvoiceLineTotalInput(1m, 10.005m, 0.01m, 10.00m),
      new InvoiceLineTotalInput(2m, 5.001m, 1.00m, 9.00m)
    };

    Assert.True(InvoiceTotals.Reconcile(lines, 20.01m, 1.01m, 19.00m, 2));
  }

  [Fact]
  public void Reconcile_RejectsMismatchedHeaderOrLineTotals()
  {
    var lines = new[] { new InvoiceLineTotalInput(2m, 5m, 1m, 8m) };

    Assert.False(InvoiceTotals.Reconcile(lines, 10m, 1m, 9m, 2));
  }

  [Fact]
  public void Reconcile_RejectsHeaderOnlyOrExcessiveDiscounts()
  {
    var lines = new[] { new InvoiceLineTotalInput(1m, 10m, 11m, -1m) };

    Assert.False(InvoiceTotals.Reconcile(lines, 10m, 11m, -1m, 2));
  }
}
