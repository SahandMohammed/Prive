using Api.Infrastructure.Http;
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
    private static readonly Guid SettingsId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public async Task<BusinessSettingsDto> GetSettingsAsync(CancellationToken ct = default)
    {
        var entity = await db.BusinessSettings.FirstOrDefaultAsync(x => x.Id == SettingsId, ct);
        
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
        var existing = await db.BusinessSettings.FirstOrDefaultAsync(x => x.Id == SettingsId, ct);
        if (existing != null && existing.IsSetupCompleted)
        {
            throw new ConflictException(ErrorCodes.Settings.SettingsAlreadySetup, "Business settings have already been set up.");
        }

        if (existing == null)
        {
            existing = new BusinessSettingsEntity { Id = SettingsId };
            db.BusinessSettings.Add(existing);
        }

        existing.BusinessName = req.BusinessName;
        existing.BaseCurrencyCode = req.BaseCurrencyCode;
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
        var existing = await db.BusinessSettings.FirstOrDefaultAsync(x => x.Id == SettingsId, ct);
        if (existing == null || !existing.IsSetupCompleted)
        {
            throw new BadRequestException(ErrorCodes.Settings.SettingsNotSetup, "Business settings must be set up first.");
        }

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

        await db.SaveChangesAsync(ct);
        return MapToDto(existing);
    }

    private static BusinessSettingsDto MapToDto(BusinessSettingsEntity entity) => new()
    {
        BaseCurrencyCode = entity.BaseCurrencyCode,
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
}
