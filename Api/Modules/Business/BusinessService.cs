using Api.Infrastructure.Http;
using Api.Modules.Currency;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Business;

public sealed class BusinessService
{
  private readonly AppDbContext _db;

  public BusinessService(AppDbContext db) => _db = db;

  public async Task<BusinessResponse> GetCurrentAsync(CancellationToken ct = default)
  {
    var business = await _db.Businesses
      .AsNoTracking()
      .Include(business => business.BaseCurrency)
      .SingleOrDefaultAsync(business => business.IsActive, ct)
      ?? throw new NotFoundException(ErrorCodes.Business.NotConfigured, "The business has not been configured yet.");

    return ToResponse(business);
  }

  public async Task<BusinessResponse> CreateAsync(CreateBusinessRequest request, CancellationToken ct = default)
  {
    if (await _db.Businesses.AnyAsync(business => business.IsActive, ct))
      throw new ConflictException(ErrorCodes.Business.AlreadyConfigured, "An active business configuration already exists.");

    var baseCurrency = await GetActiveCurrencyAsync(request.BaseCurrencyId, ct);
    var business = new BusinessEntity { BaseCurrencyId = baseCurrency.Id };
    Apply(business, request);

    _db.Businesses.Add(business);
    await _db.SaveChangesAsync(ct);
    business.BaseCurrency = baseCurrency;
    return ToResponse(business);
  }

  public async Task<BusinessResponse> UpdateCurrentAsync(UpdateBusinessRequest request, CancellationToken ct = default)
  {
    var business = await _db.Businesses.SingleOrDefaultAsync(business => business.IsActive, ct)
      ?? throw new NotFoundException(ErrorCodes.Business.NotConfigured, "The business has not been configured yet.");
    var baseCurrency = await GetActiveCurrencyAsync(request.BaseCurrencyId, ct);

    Apply(business, request);
    business.BaseCurrencyId = baseCurrency.Id;
    business.BaseCurrency = baseCurrency;

    await _db.SaveChangesAsync(ct);
    return ToResponse(business);
  }

  private async Task<CurrencyEntity> GetActiveCurrencyAsync(Guid currencyId, CancellationToken ct)
  {
    return await _db.Currencies.SingleOrDefaultAsync(currency => currency.Id == currencyId && currency.IsActive, ct)
      ?? throw new BadRequestException(
        ErrorCodes.Business.BaseCurrencyInvalid,
        "The selected base currency does not exist or is inactive.");
  }

  private static void Apply(BusinessEntity business, CreateBusinessRequest request)
  {
    business.Name = request.Name.Trim();
    business.LegalName = TrimOrNull(request.LegalName);
    business.PrimaryPhoneNumber = request.PrimaryPhoneNumber.Trim();
    business.SecondaryPhoneNumber = TrimOrNull(request.SecondaryPhoneNumber);
    business.Email = TrimOrNull(request.Email);
    business.Website = TrimOrNull(request.Website);
    business.Address = request.Address.Trim();
    business.City = request.City.Trim();
    business.Region = request.Region.Trim();
    business.Country = request.Country.Trim();
    business.LogoReference = TrimOrNull(request.LogoReference);
    business.IsSetupCompleted = request.IsSetupCompleted;
  }

  private static void Apply(BusinessEntity business, UpdateBusinessRequest request) => Apply(business, new CreateBusinessRequest(
    request.Name,
    request.LegalName,
    request.PrimaryPhoneNumber,
    request.SecondaryPhoneNumber,
    request.Email,
    request.Website,
    request.Address,
    request.City,
    request.Region,
    request.Country,
    request.LogoReference,
    request.BaseCurrencyId,
    request.IsSetupCompleted));

  private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private static BusinessResponse ToResponse(BusinessEntity business) => new(
    business.Id,
    business.Name,
    business.LegalName,
    business.PrimaryPhoneNumber,
    business.SecondaryPhoneNumber,
    business.Email,
    business.Website,
    business.Address,
    business.City,
    business.Region,
    business.Country,
    business.LogoReference,
    business.BaseCurrencyId,
    business.BaseCurrency.Code,
    business.IsSetupCompleted);
}
