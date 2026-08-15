using System.ComponentModel.DataAnnotations;
using Api.Shared.Pagination;

namespace Api.Modules.Contact;

public sealed class ContactListQuery : PaginationRequest
{
  public string? Search { get; init; }

  [EnumDataType(typeof(ContactRole))]
  public ContactRole? Role { get; init; }

  public bool? IsActive { get; init; }

  [EnumDataType(typeof(ContactKind))]
  public ContactKind? Kind { get; init; }
}

public sealed record ContactResponse(
  Guid Id,
  string Name,
  ContactKind Kind,
  bool IsCustomer,
  bool IsSupplier,
  string? PrimaryPhoneNumber,
  string? SecondaryPhoneNumber,
  string? Email,
  string? Address,
  string? City,
  string? Region,
  string? Country,
  string? Notes,
  bool IsActive);

public sealed record CreateContactRequest(
  [Required, MaxLength(200)] string Name,
  [EnumDataType(typeof(ContactKind))] ContactKind Kind,
  bool IsCustomer,
  bool IsSupplier,
  [MaxLength(50)] string? PrimaryPhoneNumber,
  [MaxLength(50)] string? SecondaryPhoneNumber,
  [EmailAddress, MaxLength(254)] string? Email,
  [MaxLength(500)] string? Address,
  [MaxLength(100)] string? City,
  [MaxLength(100)] string? Region,
  [MaxLength(100)] string? Country,
  [MaxLength(2000)] string? Notes,
  bool IsActive = true);

public sealed record UpdateContactRequest(
  [Required, MaxLength(200)] string Name,
  [EnumDataType(typeof(ContactKind))] ContactKind Kind,
  bool IsCustomer,
  bool IsSupplier,
  [MaxLength(50)] string? PrimaryPhoneNumber,
  [MaxLength(50)] string? SecondaryPhoneNumber,
  [EmailAddress, MaxLength(254)] string? Email,
  [MaxLength(500)] string? Address,
  [MaxLength(100)] string? City,
  [MaxLength(100)] string? Region,
  [MaxLength(100)] string? Country,
  [MaxLength(2000)] string? Notes,
  bool IsActive);
