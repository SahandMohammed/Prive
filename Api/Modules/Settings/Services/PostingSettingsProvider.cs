using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Settings;

public sealed record PostingSettingsSnapshot(
  Guid BaseCurrencyId,
  int MonetaryDecimalPlaces,
  Guid DefaultReceivableAccountId,
  Guid DefaultPayableAccountId);

public interface IPostingSettingsProvider
{
  Task<PostingSettingsSnapshot> GetRequiredAsync(CancellationToken ct = default);
}

public sealed class PostingSettingsProvider(Api.Shared.Persistence.AppDbContext db) : IPostingSettingsProvider
{
  public async Task<PostingSettingsSnapshot> GetRequiredAsync(CancellationToken ct = default)
  {
    var settings = await db.BusinessSettings
      .AsNoTracking()
      .Include(x => x.BaseCurrency)
      .Include(x => x.DefaultReceivableAccount)
      .Include(x => x.DefaultPayableAccount)
      .SingleOrDefaultAsync(x => x.IsSetupCompleted, ct);

    if (settings is null)
    {
      throw new BadRequestException(
        ErrorCodes.Settings.SettingsNotSetup,
        "Business settings must be completed before posting documents.");
    }

    if (!settings.BaseCurrency.IsActive ||
        !settings.BaseCurrency.IsBaseCurrency ||
        settings.BaseCurrency.ExchangeRate != 1m)
    {
      throw new BadRequestException(
        ErrorCodes.Settings.InvalidBaseCurrency,
        "The configured base currency must be active and have an exchange rate of 1.");
    }

    if (!settings.DefaultReceivableAccount.IsActive ||
        settings.DefaultReceivableAccount.Type != AccountType.Receivable ||
        (settings.DefaultReceivableAccount.CurrencyId.HasValue && settings.DefaultReceivableAccount.CurrencyId != settings.BaseCurrencyId))
    {
      throw new BadRequestException(
        ErrorCodes.Settings.InvalidReceivableAccount,
        "The configured default receivable account is missing, inactive, or not a Receivable account.");
    }

    if (!settings.DefaultPayableAccount.IsActive ||
        settings.DefaultPayableAccount.Type != AccountType.Payable ||
        (settings.DefaultPayableAccount.CurrencyId.HasValue && settings.DefaultPayableAccount.CurrencyId != settings.BaseCurrencyId))
    {
      throw new BadRequestException(
        ErrorCodes.Settings.InvalidPayableAccount,
        "The configured default payable account is missing, inactive, or not a Payable account.");
    }

    return new PostingSettingsSnapshot(
      settings.BaseCurrencyId,
      settings.CurrencyDecimalPlaces,
      settings.DefaultReceivableAccountId,
      settings.DefaultPayableAccountId);
  }
}
