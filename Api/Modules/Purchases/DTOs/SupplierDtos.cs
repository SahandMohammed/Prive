using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Purchases;

public sealed class SupplierListQuery : PaginationRequest
{
  public string? Search { get; init; }
  public string? SortDirection { get; init; }
}

public sealed record SupplierDto(
  Guid Id,
  string Name,
  string? PhoneNumber,
  string? Email,
  string? Address,
  string? Description,
  decimal OpeningBalance,
  Guid AccountId,
  bool IsActive,
  DateTime CreatedAtUtc
);

public sealed class CreateSupplierRequest
{
  [Required, StringLength(200)]
  public string Name { get; init; } = string.Empty;

  [StringLength(30)]
  public string? PhoneNumber { get; init; }

  [EmailAddress, StringLength(320)]
  public string? Email { get; init; }

  [StringLength(500)]
  public string? Address { get; init; }

  [StringLength(2_000)]
  public string? Description { get; init; }

  [Range(typeof(decimal), "0", "999999999999.999999")]
  public decimal OpeningBalance { get; init; }
}
