using Api.Infrastructure.Http;
using Api.Modules.Finance;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Settings;

public interface IBusinessSettingsService
{
    Task<BusinessSettingsDto> GetSettingsAsync(CancellationToken ct = default);
    Task<BusinessSettingsDto> SetupSettingsAsync(SetupBusinessRequest req, CancellationToken ct = default);
    Task<BusinessSettingsDto> UpdateSettingsAsync(UpdateBusinessSettingsRequest req, CancellationToken ct = default);
}

public sealed class BusinessSettingsService(AppDbContext db) : IBusinessSettingsService
{
    public async Task<BusinessSettingsDto> GetSettingsAsync(CancellationToken ct = default)
    {
        var entity = await db.BusinessSettings.FirstOrDefaultAsync(x => x.Id == BusinessSettingsEntity.SingletonId, ct);
        
        if (entity == null)
        {
            // Return an uninitialized settings object rather than throwing, 
            // so the frontend knows setup is needed.
            return new BusinessSettingsDto { IsSetupCompleted = false };
        }

        return MapToDto(entity);
    }

    public async Task<BusinessSettingsDto> SetupSettingsAsync(SetupBusinessRequest req, CancellationToken ct = default)
    {
        var existing = await db.BusinessSettings.FirstOrDefaultAsync(x => x.Id == BusinessSettingsEntity.SingletonId, ct);
        if (existing != null && existing.IsSetupCompleted)
        {
            throw new ConflictException(ErrorCodes.Settings.SettingsAlreadySetup, "Business settings have already been set up.");
        }

        if (existing == null)
        {
            existing = new BusinessSettingsEntity { Id = BusinessSettingsEntity.SingletonId };
            db.BusinessSettings.Add(existing);
        }

        var references = await ValidateFinancialSettingsAsync(
            req.BaseCurrencyId,
            req.DefaultReceivableAccountId,
            req.DefaultPayableAccountId,
            ct);

        existing.BusinessName = req.BusinessName;
        existing.BaseCurrencyId = references.Currency.Id;
        existing.BaseCurrencyCode = references.Currency.Code;
        existing.DefaultReceivableAccountId = references.Receivable.Id;
        existing.DefaultPayableAccountId = references.Payable.Id;
        existing.DefaultLanguage = req.DefaultLanguage;
        
        existing.CurrencySymbol = req.CurrencySymbol;
        existing.CurrencySymbolPosition = req.CurrencySymbolPosition;
        existing.CurrencyDecimalPlaces = req.CurrencyDecimalPlaces;
        
        existing.IsSetupCompleted = true;

        await db.SaveChangesAsync(ct);
        return MapToDto(existing);
    }

    public async Task<BusinessSettingsDto> UpdateSettingsAsync(UpdateBusinessSettingsRequest req, CancellationToken ct = default)
    {
        var existing = await db.BusinessSettings.FirstOrDefaultAsync(x => x.Id == BusinessSettingsEntity.SingletonId, ct);
        if (existing == null || !existing.IsSetupCompleted)
        {
            throw new BadRequestException(ErrorCodes.Settings.SettingsNotSetup, "Business settings must be set up first.");
        }

        var references = await ValidateFinancialSettingsAsync(
            existing.BaseCurrencyId,
            req.DefaultReceivableAccountId,
            req.DefaultPayableAccountId,
            ct);

        existing.BusinessName = req.BusinessName;
        existing.Address = req.Address;
        existing.PhoneNumber = req.PhoneNumber;
        existing.TaxRegistrationNumber = req.TaxRegistrationNumber;
        existing.LogoUrl = req.LogoUrl;
        
        existing.DefaultLanguage = req.DefaultLanguage;
        existing.DateFormat = req.DateFormat;
        existing.Timezone = req.Timezone;
        
        existing.InvoiceNumberPrefix = req.InvoiceNumberPrefix;
        
        existing.CurrencySymbol = req.CurrencySymbol;
        existing.CurrencySymbolPosition = req.CurrencySymbolPosition;
        existing.CurrencyDecimalPlaces = req.CurrencyDecimalPlaces;
        existing.DefaultReceivableAccountId = references.Receivable.Id;
        existing.DefaultPayableAccountId = references.Payable.Id;

        await db.SaveChangesAsync(ct);
        return MapToDto(existing);
    }

    private static BusinessSettingsDto MapToDto(BusinessSettingsEntity entity) => new()
    {
        BaseCurrencyId = entity.BaseCurrencyId,
        BaseCurrencyCode = entity.BaseCurrencyCode,
        DefaultReceivableAccountId = entity.DefaultReceivableAccountId,
        DefaultPayableAccountId = entity.DefaultPayableAccountId,
        CurrencySymbol = entity.CurrencySymbol,
        CurrencySymbolPosition = entity.CurrencySymbolPosition,
        CurrencyDecimalPlaces = entity.CurrencyDecimalPlaces,
        BusinessName = entity.BusinessName,
        Address = entity.Address,
        PhoneNumber = entity.PhoneNumber,
        TaxRegistrationNumber = entity.TaxRegistrationNumber,
        LogoUrl = entity.LogoUrl,
        DefaultLanguage = entity.DefaultLanguage,
        DateFormat = entity.DateFormat,
        Timezone = entity.Timezone,
        InvoiceNumberPrefix = entity.InvoiceNumberPrefix,
        NextInvoiceNumber = entity.NextInvoiceNumber,
        IsSetupCompleted = entity.IsSetupCompleted
    };

    private async Task<(CurrencyEntity Currency, AccountEntity Receivable, AccountEntity Payable)> ValidateFinancialSettingsAsync(
        Guid baseCurrencyId,
        Guid receivableAccountId,
        Guid payableAccountId,
        CancellationToken ct)
    {
        var currency = await db.Currencies.SingleOrDefaultAsync(x => x.Id == baseCurrencyId, ct);
        if (currency is null || !currency.IsActive || !currency.IsBaseCurrency || currency.ExchangeRate != 1m)
        {
            throw new BadRequestException(
                ErrorCodes.Settings.InvalidBaseCurrency,
                "Base currency must reference an active base currency with an exchange rate of 1.");
        }

        var accounts = await db.Accounts
            .Where(x => x.Id == receivableAccountId || x.Id == payableAccountId)
            .ToDictionaryAsync(x => x.Id, ct);

        if (!accounts.TryGetValue(receivableAccountId, out var receivable) ||
            !receivable.IsActive || receivable.Type != AccountType.Receivable ||
            (receivable.CurrencyId.HasValue && receivable.CurrencyId != currency.Id))
        {
            throw new BadRequestException(
                ErrorCodes.Settings.InvalidReceivableAccount,
                "Default receivable account must reference an active Receivable account.");
        }

        if (!accounts.TryGetValue(payableAccountId, out var payable) ||
            !payable.IsActive || payable.Type != AccountType.Payable ||
            (payable.CurrencyId.HasValue && payable.CurrencyId != currency.Id))
        {
            throw new BadRequestException(
                ErrorCodes.Settings.InvalidPayableAccount,
                "Default payable account must reference an active Payable account.");
        }

        return (currency, receivable, payable);
    }
}
