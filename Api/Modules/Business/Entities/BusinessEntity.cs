using Api.Modules.Currency;

namespace Api.Modules.Business;

public sealed class BusinessEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public string? LegalName { get; set; }
  public string PrimaryPhoneNumber { get; set; } = string.Empty;
  public string? SecondaryPhoneNumber { get; set; }
  public string? Email { get; set; }
  public string? Website { get; set; }
  public string Address { get; set; } = string.Empty;
  public string City { get; set; } = string.Empty;
  public string Region { get; set; } = string.Empty;
  public string Country { get; set; } = string.Empty;
  public string? LogoReference { get; set; }
  public string TimeZoneId { get; set; } = "Asia/Baghdad";
  public string? ReceiptFooter { get; set; }
  public ReceiptPaperWidth ReceiptPaperWidth { get; set; } = ReceiptPaperWidth.Mm80;
  public Guid BaseCurrencyId { get; set; }
  public CurrencyEntity BaseCurrency { get; set; } = null!;
  public bool IsSetupCompleted { get; set; }
  public bool IsActive { get; set; } = true;
}

[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
public enum ReceiptPaperWidth
{
  Mm58,
  Mm80
}
