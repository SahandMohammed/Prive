namespace Api.Infrastructure.Http;

/// <summary>
/// Centralized error code catalog organized by domain.
/// Format: MODULE_REASON (SCREAMING_SNAKE_CASE).
///
/// Split into nested static classes so constants are namespaced and
/// discoverable via IntelliSense (e.g. ErrorCodes.Auth.InvalidCredentials).
/// Add a new nested class per module as the project grows.
/// </summary>
public static class ErrorCodes
{
  public static class Auth
  {
    public const string InvalidCredentials = "AUTH_INVALID_CREDENTIALS";
    public const string AccountDeactivated = "AUTH_ACCOUNT_DEACTIVATED";
    public const string AccountLocked      = "AUTH_ACCOUNT_LOCKED";
    public const string SessionExpired     = "AUTH_SESSION_EXPIRED";
    public const string NoRefreshToken     = "AUTH_NO_REFRESH_TOKEN";
    public const string WrongPassword      = "AUTH_WRONG_CURRENT_PASSWORD";
  }

  public static class User
  {
    public const string NotFound      = "USER_NOT_FOUND";
    public const string UsernameTaken = "USER_USERNAME_TAKEN";
  }

  public static class Finance
  {
    public const string CurrencyNotFound = "FINANCE_CURRENCY_NOT_FOUND";
    public const string MoneyBoxNotFound = "FINANCE_MONEY_BOX_NOT_FOUND";
    public const string AccountNotFound = "FINANCE_ACCOUNT_NOT_FOUND";
    public const string InvoiceNotFound = "FINANCE_INVOICE_NOT_FOUND";
    public const string InsufficientFunds = "FINANCE_INSUFFICIENT_FUNDS";
    public const string InvalidAmount = "FINANCE_INVALID_AMOUNT";
    public const string PaymentExceedsTotal = "FINANCE_PAYMENT_EXCEEDS_TOTAL";
    public const string VoucherNotFound = "FINANCE_VOUCHER_NOT_FOUND";
    public const string VoucherNotDraft = "FINANCE_VOUCHER_NOT_DRAFT";
    public const string VoucherNotPosted = "FINANCE_VOUCHER_NOT_POSTED";
    public const string InvalidVoucher = "FINANCE_INVALID_VOUCHER";
    public const string InvalidAllocation = "FINANCE_INVALID_ALLOCATION";
    public const string AllocationExceedsVoucher = "FINANCE_ALLOCATION_EXCEEDS_VOUCHER";
    public const string AllocationExceedsOutstanding = "FINANCE_ALLOCATION_EXCEEDS_OUTSTANDING";
    public const string BaseCurrencyRequired = "FINANCE_BASE_CURRENCY_REQUIRED";
  }

  public static class Settings
  {
    public const string ItemNotFound = "SETTINGS_ITEM_NOT_FOUND";
    public const string ItemCodeTaken = "SETTINGS_ITEM_CODE_TAKEN";
    public const string CategoryNotFound = "SETTINGS_CATEGORY_NOT_FOUND";
    public const string UnitOfMeasureNotFound = "SETTINGS_UNIT_OF_MEASURE_NOT_FOUND";
    public const string ServiceRequiresDuration = "SETTINGS_SERVICE_REQUIRES_DURATION";
    public const string MultiplePurchasingDefaults = "SETTINGS_MULTIPLE_PURCHASING_DEFAULTS";
    public const string MultipleSellingDefaults = "SETTINGS_MULTIPLE_SELLING_DEFAULTS";
    public const string SettingsAlreadySetup = "SETTINGS_ALREADY_SETUP";
    public const string SettingsNotSetup = "SETTINGS_NOT_SETUP";
    public const string WarehouseCodeTaken = "SETTINGS_WAREHOUSE_CODE_TAKEN";
    public const string ServiceCannotTrackInventory = "SETTINGS_SERVICE_CANNOT_TRACK_INVENTORY";
    public const string InvalidBaseCurrency = "SETTINGS_INVALID_BASE_CURRENCY";
    public const string InvalidReceivableAccount = "SETTINGS_INVALID_RECEIVABLE_ACCOUNT";
    public const string InvalidPayableAccount = "SETTINGS_INVALID_PAYABLE_ACCOUNT";
  }

  public static class Sales
  {
    public const string InvoiceNotFound = "SALES_INVOICE_NOT_FOUND";
    public const string InvoiceNotDraft = "SALES_INVOICE_NOT_DRAFT";
    public const string InvoiceNotPosted = "SALES_INVOICE_NOT_POSTED";
    public const string InvalidInvoice = "SALES_INVALID_INVOICE";
    public const string InvalidReturn = "SALES_INVALID_RETURN";
    public const string ReturnQuantityExceeded = "SALES_RETURN_QUANTITY_EXCEEDED";
    public const string ActiveAllocations = "SALES_INVOICE_HAS_ACTIVE_ALLOCATIONS";
    public const string PostedReturns = "SALES_INVOICE_HAS_POSTED_RETURNS";
  }

  public static class Purchases
  {
    public const string InvoiceNotFound = "PURCHASE_INVOICE_NOT_FOUND";
    public const string InvoiceNotDraft = "PURCHASE_INVOICE_NOT_DRAFT";
    public const string InvoiceNotPosted = "PURCHASE_INVOICE_NOT_POSTED";
    public const string InvalidInvoice = "PURCHASE_INVALID_INVOICE";
    public const string InvalidReturn = "PURCHASE_INVALID_RETURN";
    public const string ReturnQuantityExceeded = "PURCHASE_RETURN_QUANTITY_EXCEEDED";
    public const string ActiveAllocations = "PURCHASE_INVOICE_HAS_ACTIVE_ALLOCATIONS";
    public const string PostedReturns = "PURCHASE_INVOICE_HAS_POSTED_RETURNS";
  }

  public static class Inventory
  {
    public const string InsufficientStock = "INVENTORY_INSUFFICIENT_STOCK";
    public const string InvalidMovement = "INVENTORY_INVALID_MOVEMENT";
    public const string AdjustmentNotFound = "INVENTORY_ADJUSTMENT_NOT_FOUND";
    public const string TransferNotFound = "INVENTORY_TRANSFER_NOT_FOUND";
    public const string DocumentNotDraft = "INVENTORY_DOCUMENT_NOT_DRAFT";
    public const string DocumentNotPosted = "INVENTORY_DOCUMENT_NOT_POSTED";
  }

  public static class Common
  {
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string Unauthorized     = "UNAUTHORIZED";
    public const string Forbidden        = "FORBIDDEN";
    public const string ServerError      = "SERVER_ERROR";
    public const string TooManyRequests  = "TOO_MANY_REQUESTS";
    public const string ConcurrentOperation = "CONCURRENT_OPERATION";
  }
}
