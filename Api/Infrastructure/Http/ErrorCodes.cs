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

  public static class Business
  {
    public const string NotConfigured = "BUSINESS_NOT_CONFIGURED";
    public const string AlreadyConfigured = "BUSINESS_ALREADY_CONFIGURED";
    public const string BaseCurrencyInvalid = "BUSINESS_BASE_CURRENCY_INVALID";
  }

  public static class Branch
  {
    public const string NotFound = "BRANCH_NOT_FOUND";
    public const string CodeTaken = "BRANCH_CODE_TAKEN";
    public const string MainBranchRequired = "BRANCH_MAIN_BRANCH_REQUIRED";
    public const string MainBranchDeactivationNotAllowed = "BRANCH_MAIN_BRANCH_DEACTIVATION_NOT_ALLOWED";
  }

  public static class Currency
  {
    public const string NotFound = "CURRENCY_NOT_FOUND";
    public const string CodeTaken = "CURRENCY_CODE_TAKEN";
    public const string BaseCurrencyDeactivationNotAllowed = "CURRENCY_BASE_CURRENCY_DEACTIVATION_NOT_ALLOWED";
  }

  public static class Accounting
  {
    public const string AccountNotFound = "ACCOUNTING_ACCOUNT_NOT_FOUND";
    public const string AccountCodeTaken = "ACCOUNTING_ACCOUNT_CODE_TAKEN";
    public const string AccountClassificationInvalid = "ACCOUNTING_ACCOUNT_CLASSIFICATION_INVALID";
    public const string AccountParentInvalid = "ACCOUNTING_ACCOUNT_PARENT_INVALID";
    public const string AccountParentCycle = "ACCOUNTING_ACCOUNT_PARENT_CYCLE";
    public const string AccountHasChildren = "ACCOUNTING_ACCOUNT_HAS_CHILDREN";
    public const string AccountHasHistory = "ACCOUNTING_ACCOUNT_HAS_HISTORY";
    public const string UsedAccountStructuralChangeNotAllowed = "ACCOUNTING_USED_ACCOUNT_STRUCTURAL_CHANGE_NOT_ALLOWED";
    public const string AccountInvalid = "ACCOUNTING_ACCOUNT_INVALID";
    public const string AccountNotPostable = "ACCOUNTING_ACCOUNT_NOT_POSTABLE";
    public const string BranchInvalid = "ACCOUNTING_BRANCH_INVALID";
    public const string CurrencyInvalid = "ACCOUNTING_CURRENCY_INVALID";
    public const string ExchangeRateRequired = "ACCOUNTING_EXCHANGE_RATE_REQUIRED";
    public const string JournalNotFound = "ACCOUNTING_JOURNAL_NOT_FOUND";
    public const string JournalLocked = "ACCOUNTING_JOURNAL_LOCKED";
    public const string JournalNotPosted = "ACCOUNTING_JOURNAL_NOT_POSTED";
    public const string JournalAlreadyReversed = "ACCOUNTING_JOURNAL_ALREADY_REVERSED";
    public const string JournalNeedsTwoLines = "ACCOUNTING_JOURNAL_NEEDS_TWO_LINES";
    public const string InvalidJournalLine = "ACCOUNTING_INVALID_JOURNAL_LINE";
    public const string JournalUnbalanced = "ACCOUNTING_JOURNAL_UNBALANCED";
    public const string JournalTypeInvalid = "ACCOUNTING_JOURNAL_TYPE_INVALID";
  }

  public static class Inventory
  {
    public const string CategoryNotFound = "INVENTORY_CATEGORY_NOT_FOUND"; public const string CategoryNameTaken = "INVENTORY_CATEGORY_NAME_TAKEN"; public const string CategoryInUse = "INVENTORY_CATEGORY_IN_USE"; public const string CategoryInvalid = "INVENTORY_CATEGORY_INVALID";
    public const string UnitNotFound = "INVENTORY_UNIT_NOT_FOUND"; public const string UnitCodeTaken = "INVENTORY_UNIT_CODE_TAKEN"; public const string UnitInUse = "INVENTORY_UNIT_IN_USE"; public const string UnitInvalid = "INVENTORY_UNIT_INVALID";
    public const string ProductNotFound = "INVENTORY_PRODUCT_NOT_FOUND"; public const string ProductHasHistory = "INVENTORY_PRODUCT_HAS_HISTORY"; public const string ProductNotStockable = "INVENTORY_PRODUCT_NOT_STOCKABLE"; public const string SkuTaken = "INVENTORY_SKU_TAKEN"; public const string BarcodeTaken = "INVENTORY_BARCODE_TAKEN";
    public const string WarehouseNotFound = "INVENTORY_WAREHOUSE_NOT_FOUND"; public const string WarehouseCodeTaken = "INVENTORY_WAREHOUSE_CODE_TAKEN"; public const string WarehouseInactive = "INVENTORY_WAREHOUSE_INACTIVE"; public const string WarehouseHasStock = "INVENTORY_WAREHOUSE_HAS_STOCK"; public const string WarehouseHasHistory = "INVENTORY_WAREHOUSE_HAS_HISTORY"; public const string BranchInvalid = "INVENTORY_BRANCH_INVALID";
    public const string InsufficientStock = "INVENTORY_INSUFFICIENT_STOCK"; public const string TransferSameWarehouse = "INVENTORY_TRANSFER_SAME_WAREHOUSE"; public const string UnitCostRequired = "INVENTORY_UNIT_COST_REQUIRED"; public const string DocumentLinesRequired = "INVENTORY_DOCUMENT_LINES_REQUIRED"; public const string DuplicateDocumentProduct = "INVENTORY_DUPLICATE_DOCUMENT_PRODUCT";
    public const string DocumentNotFound = "INVENTORY_DOCUMENT_NOT_FOUND"; public const string DocumentNotDraft = "INVENTORY_DOCUMENT_NOT_DRAFT"; public const string DocumentNumberConflict = "INVENTORY_DOCUMENT_NUMBER_CONFLICT"; public const string AdjustmentReasonRequired = "INVENTORY_ADJUSTMENT_REASON_REQUIRED"; public const string WarehouseBranchMismatch = "INVENTORY_WAREHOUSE_BRANCH_MISMATCH";
  }

  public static class Contact
  {
    public const string NotFound = "CONTACT_NOT_FOUND";
    public const string RoleRequired = "CONTACT_ROLE_REQUIRED";
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
