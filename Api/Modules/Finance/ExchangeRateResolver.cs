using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Finance;

public static class ExchangeRateResolver
{
  public static async Task<decimal?> FindAsync(
    AppDbContext db,
    Guid currencyId,
    Guid baseCurrencyId,
    DateOnly date,
    CancellationToken ct)
  {
    if (currencyId == baseCurrencyId) return 1m;

    var effectiveAt = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
    return await FindAsync(db, currencyId, baseCurrencyId, effectiveAt, ct);
  }

  public static async Task<decimal?> FindAsync(
    AppDbContext db,
    Guid currencyId,
    Guid baseCurrencyId,
    DateTime effectiveAtUtc,
    CancellationToken ct)
  {
    if (currencyId == baseCurrencyId) return 1m;

    var effectiveAt = effectiveAtUtc.Kind == DateTimeKind.Unspecified
      ? DateTime.SpecifyKind(effectiveAtUtc, DateTimeKind.Utc)
      : effectiveAtUtc.ToUniversalTime();

    return await db.ExchangeRates.AsNoTracking()
      .Where(rate => rate.FromCurrencyId == currencyId
        && rate.ToCurrencyId == baseCurrencyId
        && rate.IsActive
        && rate.EffectiveAtUtc <= effectiveAt)
      .OrderByDescending(rate => rate.EffectiveAtUtc)
      .Select(rate => (decimal?)rate.Rate)
      .FirstOrDefaultAsync(ct);
  }
}
