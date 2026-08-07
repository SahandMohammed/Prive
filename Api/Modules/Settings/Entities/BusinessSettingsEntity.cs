using Api.Modules.Finance;

namespace Api.Modules.Settings;

public class BusinessSettingsEntity
{
    public static readonly Guid SingletonId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; }

    // Currency settings
    public Guid BaseCurrencyId { get; set; }
    public CurrencyEntity BaseCurrency { get; set; } = null!;
    public string BaseCurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public string CurrencySymbolPosition { get; set; } = "Before"; 
    public int CurrencyDecimalPlaces { get; set; }

    // Required shared control accounts used by invoice posting.
    public Guid DefaultReceivableAccountId { get; set; }
    public AccountEntity DefaultReceivableAccount { get; set; } = null!;
    public Guid DefaultPayableAccountId { get; set; }
    public AccountEntity DefaultPayableAccount { get; set; } = null!;

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
