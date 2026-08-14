using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Currency;

public sealed class CurrencyListQuery : PaginationRequest
{
  public bool? IsActive { get; init; }
}

public sealed record CurrencyResponse(
  Guid Id,
  string Code,
  string Name,
  string Symbol,
  int DecimalPlaces,
  bool IsActive);

public sealed record CreateCurrencyRequest(
  [Required, StringLength(3, MinimumLength = 3)] string Code,
  [Required, MaxLength(100)] string Name,
  [Required, MaxLength(10)] string Symbol,
  [Range(0, 6)] int DecimalPlaces,
  bool IsActive = true);

public sealed record UpdateCurrencyRequest(
  [Required, StringLength(3, MinimumLength = 3)] string Code,
  [Required, MaxLength(100)] string Name,
  [Required, MaxLength(10)] string Symbol,
  [Range(0, 6)] int DecimalPlaces,
  bool IsActive);
