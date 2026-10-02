using System.ComponentModel.DataAnnotations;

namespace Api.Modules.Business;

public sealed record BusinessResponse(
  Guid Id,
  string Name,
  string? LegalName,
  string PrimaryPhoneNumber,
  string? SecondaryPhoneNumber,
  string? Email,
  string? Website,
  string Address,
  string City,
  string Region,
  string Country,
  string? LogoReference,
  string TimeZoneId,
  string? ReceiptFooter,
  ReceiptPaperWidth ReceiptPaperWidth,
  Guid BaseCurrencyId,
  string BaseCurrencyCode,
  string BaseCurrencySymbol,
  int BaseCurrencyDecimalPlaces,
  bool IsSetupCompleted);

public sealed record CreateBusinessRequest(
  [Required, MaxLength(200)] string Name,
  [MaxLength(200)] string? LegalName,
  [Required, MaxLength(50)] string PrimaryPhoneNumber,
  [MaxLength(50)] string? SecondaryPhoneNumber,
  [EmailAddress, MaxLength(254)] string? Email,
  [Url, MaxLength(2048)] string? Website,
  [Required, MaxLength(500)] string Address,
  [Required, MaxLength(100)] string City,
  [Required, MaxLength(100)] string Region,
  [Required, MaxLength(100)] string Country,
  [MaxLength(2048)] string? LogoReference,
  [Required, MaxLength(100)] string TimeZoneId,
  [MaxLength(500)] string? ReceiptFooter,
  [Required, EnumDataType(typeof(ReceiptPaperWidth))] ReceiptPaperWidth ReceiptPaperWidth,
  [Required] Guid BaseCurrencyId,
  bool IsSetupCompleted);

public sealed record UpdateBusinessRequest(
  [Required, MaxLength(200)] string Name,
  [MaxLength(200)] string? LegalName,
  [Required, MaxLength(50)] string PrimaryPhoneNumber,
  [MaxLength(50)] string? SecondaryPhoneNumber,
  [EmailAddress, MaxLength(254)] string? Email,
  [Url, MaxLength(2048)] string? Website,
  [Required, MaxLength(500)] string Address,
  [Required, MaxLength(100)] string City,
  [Required, MaxLength(100)] string Region,
  [Required, MaxLength(100)] string Country,
  [MaxLength(2048)] string? LogoReference,
  [Required, MaxLength(100)] string TimeZoneId,
  [MaxLength(500)] string? ReceiptFooter,
  [Required, EnumDataType(typeof(ReceiptPaperWidth))] ReceiptPaperWidth ReceiptPaperWidth,
  [Required] Guid BaseCurrencyId,
  bool IsSetupCompleted);
