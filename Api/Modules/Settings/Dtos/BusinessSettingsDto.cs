using System.ComponentModel.DataAnnotations;

namespace Api.Modules.Settings;

public class BusinessSettingsDto
{
    public Guid BaseCurrencyId { get; set; }
    public string BaseCurrencyCode { get; set; } = string.Empty;
    public Guid DefaultReceivableAccountId { get; set; }
    public Guid DefaultPayableAccountId { get; set; }
    public string CurrencySymbol { get; set; } = string.Empty;
    public string CurrencySymbolPosition { get; set; } = string.Empty;
    public int CurrencyDecimalPlaces { get; set; }

    public string BusinessName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? TaxRegistrationNumber { get; set; }
    public string? LogoUrl { get; set; }

    public string DefaultLanguage { get; set; } = string.Empty;
    public string DateFormat { get; set; } = string.Empty;
    public string Timezone { get; set; } = string.Empty;

    public string? InvoiceNumberPrefix { get; set; }
    public int NextInvoiceNumber { get; set; }

    public bool IsSetupCompleted { get; set; }
}

public class SetupBusinessRequest
{
    [Required]
    public string BusinessName { get; set; } = string.Empty;
    
    public Guid BaseCurrencyId { get; set; }
    public Guid DefaultReceivableAccountId { get; set; }
    public Guid DefaultPayableAccountId { get; set; }
    
    [Required]
    public string DefaultLanguage { get; set; } = string.Empty;

    public string CurrencySymbol { get; set; } = string.Empty;
    public string CurrencySymbolPosition { get; set; } = "Before";
    [Range(0, 6)]
    public int CurrencyDecimalPlaces { get; set; }
}

public class UpdateBusinessSettingsRequest
{
    [Required]
    public string BusinessName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? TaxRegistrationNumber { get; set; }
    public string? LogoUrl { get; set; }

    [Required]
    public string DefaultLanguage { get; set; } = string.Empty;
    [Required]
    public string DateFormat { get; set; } = string.Empty;
    [Required]
    public string Timezone { get; set; } = string.Empty;

    public string? InvoiceNumberPrefix { get; set; }
    public int NextInvoiceNumber { get; set; }

    public Guid DefaultReceivableAccountId { get; set; }
    public Guid DefaultPayableAccountId { get; set; }

    // Currency symbol and decimals can be changed maybe? The prompt says "Base currency is not editable".
    // Let's allow changing the symbol, position and decimals, but NOT the code.
    [Required]
    public string CurrencySymbol { get; set; } = string.Empty;
    [Required]
    public string CurrencySymbolPosition { get; set; } = "Before";
    [Range(0, 6)]
    public int CurrencyDecimalPlaces { get; set; }
}
