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
    public const string AccountOwnedByMoneyAccount = "ACCOUNTING_ACCOUNT_OWNED_BY_MONEY_ACCOUNT";
    public const string FinanceOwnedAccountProtected = "ACCOUNTING_FINANCE_OWNED_ACCOUNT_PROTECTED";
  }

  public static class Inventory
  {
    public const string CategoryNotFound = "INVENTORY_CATEGORY_NOT_FOUND"; public const string CategoryNameTaken = "INVENTORY_CATEGORY_NAME_TAKEN"; public const string CategoryInUse = "INVENTORY_CATEGORY_IN_USE"; public const string CategoryInvalid = "INVENTORY_CATEGORY_INVALID";
    public const string SubcategoryNotFound = "INVENTORY_SUBCATEGORY_NOT_FOUND"; public const string SubcategoryNameTaken = "INVENTORY_SUBCATEGORY_NAME_TAKEN"; public const string SubcategoryInUse = "INVENTORY_SUBCATEGORY_IN_USE"; public const string SubcategoryInvalid = "INVENTORY_SUBCATEGORY_INVALID";
    public const string UnitNotFound = "INVENTORY_UNIT_NOT_FOUND"; public const string UnitCodeTaken = "INVENTORY_UNIT_CODE_TAKEN"; public const string UnitInUse = "INVENTORY_UNIT_IN_USE"; public const string UnitInvalid = "INVENTORY_UNIT_INVALID";
    public const string ProductNotFound = "INVENTORY_PRODUCT_NOT_FOUND"; public const string ProductHasHistory = "INVENTORY_PRODUCT_HAS_HISTORY"; public const string ProductNotStockable = "INVENTORY_PRODUCT_NOT_STOCKABLE"; public const string SkuTaken = "INVENTORY_SKU_TAKEN"; public const string BarcodeTaken = "INVENTORY_BARCODE_TAKEN"; public const string BaseUnitChangeNotAllowed = "INVENTORY_BASE_UNIT_CHANGE_NOT_ALLOWED"; public const string UnitConversionInvalid = "INVENTORY_UNIT_CONVERSION_INVALID"; public const string UnitConversionDuplicate = "INVENTORY_UNIT_CONVERSION_DUPLICATE";
    public const string WarehouseNotFound = "INVENTORY_WAREHOUSE_NOT_FOUND"; public const string WarehouseCodeTaken = "INVENTORY_WAREHOUSE_CODE_TAKEN"; public const string WarehouseInactive = "INVENTORY_WAREHOUSE_INACTIVE"; public const string WarehouseHasStock = "INVENTORY_WAREHOUSE_HAS_STOCK"; public const string WarehouseHasHistory = "INVENTORY_WAREHOUSE_HAS_HISTORY"; public const string BranchInvalid = "INVENTORY_BRANCH_INVALID";
    public const string InsufficientStock = "INVENTORY_INSUFFICIENT_STOCK"; public const string TransferSameWarehouse = "INVENTORY_TRANSFER_SAME_WAREHOUSE"; public const string UnitCostRequired = "INVENTORY_UNIT_COST_REQUIRED"; public const string DocumentLinesRequired = "INVENTORY_DOCUMENT_LINES_REQUIRED"; public const string DuplicateDocumentProduct = "INVENTORY_DUPLICATE_DOCUMENT_PRODUCT";
    public const string DocumentNotFound = "INVENTORY_DOCUMENT_NOT_FOUND"; public const string DocumentNotDraft = "INVENTORY_DOCUMENT_NOT_DRAFT"; public const string DocumentNumberConflict = "INVENTORY_DOCUMENT_NUMBER_CONFLICT"; public const string AdjustmentReasonRequired = "INVENTORY_ADJUSTMENT_REASON_REQUIRED"; public const string WarehouseBranchMismatch = "INVENTORY_WAREHOUSE_BRANCH_MISMATCH";
  }

  public static class Contact
  {
    public const string NotFound = "CONTACT_NOT_FOUND";
    public const string RoleRequired = "CONTACT_ROLE_REQUIRED";
    public const string HasHistory = "CONTACT_HAS_HISTORY";
  }

  public static class Purchase
  {
    public const string NotFound = "PURCHASE_INVOICE_NOT_FOUND";
    public const string DocumentNotDraft = "PURCHASE_INVOICE_NOT_DRAFT";
    public const string DocumentNumberConflict = "PURCHASE_DOCUMENT_NUMBER_CONFLICT";
    public const string SupplierInvalid = "PURCHASE_SUPPLIER_INVALID";
    public const string BranchInvalid = "PURCHASE_BRANCH_INVALID";
    public const string WarehouseInvalid = "PURCHASE_WAREHOUSE_INVALID";
    public const string WarehouseBranchMismatch = "PURCHASE_WAREHOUSE_BRANCH_MISMATCH";
    public const string CurrencyInvalid = "PURCHASE_CURRENCY_INVALID";
    public const string ExchangeRateRequired = "PURCHASE_EXCHANGE_RATE_REQUIRED";
    public const string BusinessNotConfigured = "PURCHASE_BUSINESS_NOT_CONFIGURED";
    public const string LinesRequired = "PURCHASE_LINES_REQUIRED";
    public const string DuplicateProduct = "PURCHASE_DUPLICATE_PRODUCT";
    public const string ProductInvalid = "PURCHASE_PRODUCT_INVALID";
    public const string UnitInvalid = "PURCHASE_UNIT_INVALID";
    public const string QuantityInvalid = "PURCHASE_QUANTITY_INVALID";
    public const string UnitCostInvalid = "PURCHASE_UNIT_COST_INVALID";
    public const string AccountMappingInvalid = "PURCHASE_ACCOUNT_MAPPING_INVALID";
    public const string JournalDirectReversalNotAllowed = "PURCHASE_JOURNAL_DIRECT_REVERSAL_NOT_ALLOWED";
  }

  public static class Finance
  {
    public const string MoneyAccountNotFound = "FINANCE_MONEY_ACCOUNT_NOT_FOUND";
    public const string MoneyAccountCodeTaken = "FINANCE_MONEY_ACCOUNT_CODE_TAKEN";
    public const string MoneyAccountTypeInvalid = "FINANCE_MONEY_ACCOUNT_TYPE_INVALID";
    public const string MoneyAccountInvalid = "FINANCE_MONEY_ACCOUNT_INVALID";
    public const string MoneyAccountInactive = "FINANCE_MONEY_ACCOUNT_INACTIVE";
    public const string MoneyAccountStructuralChangeNotAllowed = "FINANCE_MONEY_ACCOUNT_STRUCTURAL_CHANGE_NOT_ALLOWED";
    public const string MoneyAccountAccessDenied = "FINANCE_MONEY_ACCOUNT_ACCESS_DENIED";
    public const string AccessAssignmentDuplicate = "FINANCE_ACCESS_ASSIGNMENT_DUPLICATE";
    public const string AccessLevelInvalid = "FINANCE_ACCESS_LEVEL_INVALID";
    public const string AccessUserInvalid = "FINANCE_ACCESS_USER_INVALID";
    public const string BranchInvalid = "FINANCE_BRANCH_INVALID";
    public const string CurrencyInvalid = "FINANCE_CURRENCY_INVALID";
    public const string BusinessNotConfigured = "FINANCE_BUSINESS_NOT_CONFIGURED";
    public const string AccountMappingInvalid = "FINANCE_ACCOUNT_MAPPING_INVALID";
    public const string OpeningBalanceAlreadyRecorded = "FINANCE_OPENING_BALANCE_ALREADY_RECORDED";
    public const string ExchangeRateRequired = "FINANCE_EXCHANGE_RATE_REQUIRED";
    public const string ExchangeRateNotFound = "FINANCE_EXCHANGE_RATE_NOT_FOUND";
    public const string ExchangeRatePairInvalid = "FINANCE_EXCHANGE_RATE_PAIR_INVALID";
    public const string ExchangeRateConflict = "FINANCE_EXCHANGE_RATE_CONFLICT";
    public const string MoneyTransferNotFound = "FINANCE_MONEY_TRANSFER_NOT_FOUND";
    public const string TransferSameAccount = "FINANCE_TRANSFER_SAME_ACCOUNT";
    public const string TransferCurrencyMismatch = "FINANCE_TRANSFER_CURRENCY_MISMATCH";
    public const string TransferBranchMismatch = "FINANCE_TRANSFER_BRANCH_MISMATCH";
    public const string TransferDocumentNumberConflict = "FINANCE_TRANSFER_DOCUMENT_NUMBER_CONFLICT";
    public const string SupplierPaymentNotFound = "FINANCE_SUPPLIER_PAYMENT_NOT_FOUND";
    public const string SupplierPaymentDocumentNumberConflict = "FINANCE_SUPPLIER_PAYMENT_DOCUMENT_NUMBER_CONFLICT";
    public const string SupplierInvalid = "FINANCE_SUPPLIER_INVALID";
    public const string PurchaseInvoiceInvalid = "FINANCE_PURCHASE_INVOICE_INVALID";
    public const string PaymentAllocationsRequired = "FINANCE_PAYMENT_ALLOCATIONS_REQUIRED";
    public const string PaymentAllocationDuplicate = "FINANCE_PAYMENT_ALLOCATION_DUPLICATE";
    public const string PaymentAllocationInvalid = "FINANCE_PAYMENT_ALLOCATION_INVALID";
    public const string PaymentMustBeFullyAllocated = "FINANCE_PAYMENT_MUST_BE_FULLY_ALLOCATED";
    public const string PaymentSupplierMismatch = "FINANCE_PAYMENT_SUPPLIER_MISMATCH";
    public const string PaymentCurrencyMismatch = "FINANCE_PAYMENT_CURRENCY_MISMATCH";
    public const string PaymentExchangeRateMismatch = "FINANCE_PAYMENT_EXCHANGE_RATE_MISMATCH";
    public const string PaymentAllocationExceedsOutstanding = "FINANCE_PAYMENT_ALLOCATION_EXCEEDS_OUTSTANDING";
    public const string CustomerReceiptNotFound = "FINANCE_CUSTOMER_RECEIPT_NOT_FOUND";
    public const string CustomerReceiptDocumentNumberConflict = "FINANCE_CUSTOMER_RECEIPT_DOCUMENT_NUMBER_CONFLICT";
    public const string CustomerInvalid = "FINANCE_CUSTOMER_INVALID";
    public const string SalesInvoiceInvalid = "FINANCE_SALES_INVOICE_INVALID";
    public const string ReceiptAllocationsRequired = "FINANCE_RECEIPT_ALLOCATIONS_REQUIRED";
    public const string ReceiptAllocationDuplicate = "FINANCE_RECEIPT_ALLOCATION_DUPLICATE";
    public const string ReceiptAllocationInvalid = "FINANCE_RECEIPT_ALLOCATION_INVALID";
    public const string ReceiptMustBeFullyAllocated = "FINANCE_RECEIPT_MUST_BE_FULLY_ALLOCATED";
    public const string ReceiptCustomerMismatch = "FINANCE_RECEIPT_CUSTOMER_MISMATCH";
    public const string ReceiptCurrencyMismatch = "FINANCE_RECEIPT_CURRENCY_MISMATCH";
    public const string ReceiptExchangeRateMismatch = "FINANCE_RECEIPT_EXCHANGE_RATE_MISMATCH";
    public const string ReceiptAllocationExceedsOutstanding = "FINANCE_RECEIPT_ALLOCATION_EXCEEDS_OUTSTANDING";
    public const string InsufficientBalance = "FINANCE_INSUFFICIENT_BALANCE";
    public const string DocumentNotDraft = "FINANCE_DOCUMENT_NOT_DRAFT";
    public const string JournalDirectReversalNotAllowed = "FINANCE_JOURNAL_DIRECT_REVERSAL_NOT_ALLOWED";
  }

  public static class Sales
  {
    public const string ServiceCategoryNotFound = "SALES_SERVICE_CATEGORY_NOT_FOUND";
    public const string ServiceCategoryNameTaken = "SALES_SERVICE_CATEGORY_NAME_TAKEN";
    public const string ServiceCategoryInUse = "SALES_SERVICE_CATEGORY_IN_USE";
    public const string ServiceCategoryInvalid = "SALES_SERVICE_CATEGORY_INVALID";
    public const string ServiceNotFound = "SALES_SERVICE_NOT_FOUND";
    public const string ServiceInvalid = "SALES_SERVICE_INVALID";
    public const string ServiceHasHistory = "SALES_SERVICE_HAS_HISTORY";
    public const string ServicePriceInvalid = "SALES_SERVICE_PRICE_INVALID";
    public const string ServiceDurationInvalid = "SALES_SERVICE_DURATION_INVALID";
    public const string ServiceRevenueAccountInvalid = "SALES_SERVICE_REVENUE_ACCOUNT_INVALID";
    public const string ProfessionalInvalid = "SALES_PROFESSIONAL_INVALID";
    public const string InvoiceNotFound = "SALES_INVOICE_NOT_FOUND";
    public const string DocumentNotDraft = "SALES_INVOICE_NOT_DRAFT";
    public const string DocumentNumberConflict = "SALES_DOCUMENT_NUMBER_CONFLICT";
    public const string CustomerRequired = "SALES_CUSTOMER_REQUIRED";
    public const string CustomerInvalid = "SALES_CUSTOMER_INVALID";
    public const string BranchInvalid = "SALES_BRANCH_INVALID";
    public const string WarehouseRequired = "SALES_WAREHOUSE_REQUIRED";
    public const string WarehouseInvalid = "SALES_WAREHOUSE_INVALID";
    public const string WarehouseBranchMismatch = "SALES_WAREHOUSE_BRANCH_MISMATCH";
    public const string CurrencyInvalid = "SALES_CURRENCY_INVALID";
    public const string ExchangeRateRequired = "SALES_EXCHANGE_RATE_REQUIRED";
    public const string BusinessNotConfigured = "SALES_BUSINESS_NOT_CONFIGURED";
    public const string LinesRequired = "SALES_LINES_REQUIRED";
    public const string LineTypeInvalid = "SALES_LINE_TYPE_INVALID";
    public const string DuplicateLine = "SALES_DUPLICATE_LINE";
    public const string ProductInvalid = "SALES_PRODUCT_INVALID";
    public const string UnitInvalid = "SALES_UNIT_INVALID";
    public const string QuantityInvalid = "SALES_QUANTITY_INVALID";
    public const string UnitPriceInvalid = "SALES_UNIT_PRICE_INVALID";
    public const string InsufficientStock = "SALES_INSUFFICIENT_STOCK";
    public const string AccountMappingInvalid = "SALES_ACCOUNT_MAPPING_INVALID";
    public const string JournalDirectReversalNotAllowed = "SALES_JOURNAL_DIRECT_REVERSAL_NOT_ALLOWED";
  }

  public static class Pos
  {
    public const string SaleNotFound = "POS_SALE_NOT_FOUND";
    public const string BusinessNotConfigured = "POS_BUSINESS_NOT_CONFIGURED";
    public const string LinesRequired = "POS_LINES_REQUIRED";
    public const string LineInvalid = "POS_LINE_INVALID";
    public const string DuplicateLine = "POS_DUPLICATE_LINE";
    public const string TenderRequired = "POS_TENDER_REQUIRED";
    public const string TenderInvalid = "POS_TENDER_INVALID";
    public const string MoneyAccountInvalid = "POS_MONEY_ACCOUNT_INVALID";
    public const string MoneyAccountBranchMismatch = "POS_MONEY_ACCOUNT_BRANCH_MISMATCH";
    public const string Underpayment = "POS_UNDERPAYMENT";
    public const string ChangeRequired = "POS_CHANGE_REQUIRED";
    public const string ChangeNotDue = "POS_CHANGE_NOT_DUE";
    public const string ChangeMismatch = "POS_CHANGE_MISMATCH";
    public const string ChangeBalanceInsufficient = "POS_CHANGE_BALANCE_INSUFFICIENT";
    public const string ConcurrentCheckout = "POS_CONCURRENT_CHECKOUT";
    public const string JournalDirectReversalNotAllowed = "POS_JOURNAL_DIRECT_REVERSAL_NOT_ALLOWED";
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
