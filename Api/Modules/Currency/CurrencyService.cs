using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Currency;

public sealed class CurrencyService
{
  private readonly AppDbContext _db;

  public CurrencyService(AppDbContext db) => _db = db;

  public async Task<PagedResult<CurrencyResponse>> GetAllAsync(CurrencyListQuery request, CancellationToken ct = default)
  {
    var query = _db.Currencies.AsNoTracking().AsQueryable();
    if (request.IsActive is not null)
      query = query.Where(currency => currency.IsActive == request.IsActive);

    return await query
      .OrderBy(currency => currency.Code)
      .Select(currency => ToResponse(currency))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<CurrencyResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
  {
    var currency = await _db.Currencies.AsNoTracking().SingleOrDefaultAsync(currency => currency.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Currency.NotFound, $"Currency with id '{id}' was not found.");

    return ToResponse(currency);
  }

  public async Task<CurrencyResponse> CreateAsync(CreateCurrencyRequest request, CancellationToken ct = default)
  {
    var code = NormalizeCode(request.Code);
    if (await _db.Currencies.AnyAsync(currency => currency.Code == code, ct))
      throw new ConflictException(ErrorCodes.Currency.CodeTaken, $"Currency code '{code}' is already in use.");

    var currency = new CurrencyEntity
    {
      Code = code,
      Name = request.Name.Trim(),
      Symbol = request.Symbol.Trim(),
      DecimalPlaces = request.DecimalPlaces,
      IsActive = request.IsActive
    };

    _db.Currencies.Add(currency);
    await _db.SaveChangesAsync(ct);
    return ToResponse(currency);
  }

  public async Task<CurrencyResponse> UpdateAsync(Guid id, UpdateCurrencyRequest request, CancellationToken ct = default)
  {
    var currency = await _db.Currencies.SingleOrDefaultAsync(currency => currency.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Currency.NotFound, $"Currency with id '{id}' was not found.");
    var code = NormalizeCode(request.Code);

    if (code != currency.Code && await _db.Currencies.AnyAsync(other => other.Code == code && other.Id != id, ct))
      throw new ConflictException(ErrorCodes.Currency.CodeTaken, $"Currency code '{code}' is already in use.");

    if (!request.IsActive && await _db.Businesses.AnyAsync(business => business.IsActive && business.BaseCurrencyId == id, ct))
      throw new BadRequestException(
        ErrorCodes.Currency.BaseCurrencyDeactivationNotAllowed,
        "The business base currency cannot be deactivated. Choose another base currency first.");

    currency.Code = code;
    currency.Name = request.Name.Trim();
    currency.Symbol = request.Symbol.Trim();
    currency.DecimalPlaces = request.DecimalPlaces;
    currency.IsActive = request.IsActive;

    await _db.SaveChangesAsync(ct);
    return ToResponse(currency);
  }

  private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();

  private static CurrencyResponse ToResponse(CurrencyEntity currency) => new(
    currency.Id,
    currency.Code,
    currency.Name,
    currency.Symbol,
    currency.DecimalPlaces,
    currency.IsActive);
}
