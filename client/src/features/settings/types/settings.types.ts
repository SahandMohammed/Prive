export interface BusinessSettingsDto {
  baseCurrencyCode: string;
  currencySymbol: string;
  currencySymbolPosition: string;
  currencyDecimalPlaces: number;
  businessName: string;
  address: string | null;
  phoneNumber: string | null;
  taxRegistrationNumber: string | null;
  logoUrl: string | null;
  defaultLanguage: string;
  dateFormat: string;
  timezone: string;
  invoiceNumberPrefix: string | null;
  nextInvoiceNumber: number;
  isSetupCompleted: boolean;
}

export interface SetupBusinessRequest {
  businessName: string;
  baseCurrencyCode: string;
  defaultLanguage: string;
  currencySymbol: string;
  currencySymbolPosition: string;
  currencyDecimalPlaces: number;
}

export interface UpdateBusinessSettingsRequest {
  businessName: string;
  address: string | null;
  phoneNumber: string | null;
  taxRegistrationNumber: string | null;
  logoUrl: string | null;
  defaultLanguage: string;
  dateFormat: string;
  timezone: string;
  invoiceNumberPrefix: string | null;
  nextInvoiceNumber: number;
  currencySymbol: string;
  currencySymbolPosition: string;
  currencyDecimalPlaces: number;
}
