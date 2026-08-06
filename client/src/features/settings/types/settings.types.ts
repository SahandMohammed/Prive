export type ItemType = 'Product' | 'Service';

export interface ItemUnitOfMeasure {
  id: string;
  unitOfMeasureId: string;
  unitOfMeasureName: string;
  conversionFactor: number;
  isDefaultForPurchasing: boolean;
  isDefaultForSelling: boolean;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  type: ItemType;
  basePrice: number;
  baseCost: number;
  categoryId: string;
  categoryName: string;
  baseUnitOfMeasureId: string;
  baseUnitOfMeasureName: string;
  durationMinutes: number | null;
  description: string | null;
  isActive: boolean;
  additionalUnits: ItemUnitOfMeasure[];
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string | null;
  isActive: boolean;
}

export interface ItemCategory {
  id: string;
  name: string;
  parentCategoryId: string | null;
  isActive: boolean;
}

export interface CreateItemUnitRequest {
  unitOfMeasureId: string;
  conversionFactor: number;
  isDefaultForPurchasing: boolean;
  isDefaultForSelling: boolean;
}

export interface CreateItemRequest {
  code: string;
  name: string;
  type: ItemType;
  basePrice: number;
  baseCost: number;
  categoryId: string;
  baseUnitOfMeasureId: string;
  durationMinutes: number | null;
  description: string | null;
  additionalUnits: CreateItemUnitRequest[];
}

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
