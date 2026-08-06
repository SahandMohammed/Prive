using System;

namespace Api.Modules.Settings;

public class BusinessSettingsEntity
{
    public Guid Id { get; set; }

    // Currency settings
    public string BaseCurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public string CurrencySymbolPosition { get; set; } = "Before"; 
    public int CurrencyDecimalPlaces { get; set; }

    // Business profile
    public string BusinessName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? TaxRegistrationNumber { get; set; }
    public string? LogoUrl { get; set; }

    // Localization
    public string DefaultLanguage { get; set; } = "en-US";
    public string DateFormat { get; set; } = "MM/dd/yyyy";
    public string Timezone { get; set; } = "UTC";

    // Invoice numbering
    public string? InvoiceNumberPrefix { get; set; }
    public int NextInvoiceNumber { get; set; } = 1;

    // Setup state
    public bool IsSetupCompleted { get; set; } = false;
}
