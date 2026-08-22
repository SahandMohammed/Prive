using Api.Modules.Auth;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Currency;
using Api.Modules.User;
using Api.Modules.Inventory;
using Api.Modules.Contact;
using Api.Modules.Purchase;
using Api.Modules.Finance;
using Microsoft.EntityFrameworkCore;

namespace Api.Shared.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
  public DbSet<UserEntity> Users => Set<UserEntity>();
  public DbSet<RefreshTokenEntity> RefreshTokens => Set<RefreshTokenEntity>();
  public DbSet<BusinessEntity> Businesses => Set<BusinessEntity>();
  public DbSet<BranchEntity> Branches => Set<BranchEntity>();
  public DbSet<CurrencyEntity> Currencies => Set<CurrencyEntity>();
  public DbSet<AccountEntity> Accounts => Set<AccountEntity>();
  public DbSet<JournalEntryEntity> JournalEntries => Set<JournalEntryEntity>();
  public DbSet<JournalLineEntity> JournalLines => Set<JournalLineEntity>();
  public DbSet<ProductCategoryEntity> ProductCategories => Set<ProductCategoryEntity>();
  public DbSet<UnitOfMeasureEntity> UnitsOfMeasure => Set<UnitOfMeasureEntity>();
  public DbSet<ProductEntity> Products => Set<ProductEntity>();
  public DbSet<WarehouseEntity> Warehouses => Set<WarehouseEntity>();
  public DbSet<OpeningStockDocumentEntity> OpeningStockDocuments => Set<OpeningStockDocumentEntity>();
  public DbSet<OpeningStockLineEntity> OpeningStockLines => Set<OpeningStockLineEntity>();
  public DbSet<StockAdjustmentDocumentEntity> StockAdjustmentDocuments => Set<StockAdjustmentDocumentEntity>();
  public DbSet<StockAdjustmentLineEntity> StockAdjustmentLines => Set<StockAdjustmentLineEntity>();
  public DbSet<WarehouseTransferDocumentEntity> WarehouseTransferDocuments => Set<WarehouseTransferDocumentEntity>();
  public DbSet<WarehouseTransferLineEntity> WarehouseTransferLines => Set<WarehouseTransferLineEntity>();
  public DbSet<StockMovementEntity> StockMovements => Set<StockMovementEntity>();
  public DbSet<ContactEntity> Contacts => Set<ContactEntity>();
  public DbSet<PurchaseInvoiceEntity> PurchaseInvoices => Set<PurchaseInvoiceEntity>();
  public DbSet<PurchaseInvoiceLineEntity> PurchaseInvoiceLines => Set<PurchaseInvoiceLineEntity>();
  public DbSet<MoneyAccountEntity> MoneyAccounts => Set<MoneyAccountEntity>();
  public DbSet<MoneyAccountAccessEntity> MoneyAccountAccess => Set<MoneyAccountAccessEntity>();
  public DbSet<MoneyLedgerEntryEntity> MoneyLedgerEntries => Set<MoneyLedgerEntryEntity>();
  public DbSet<ExchangeRateEntity> ExchangeRates => Set<ExchangeRateEntity>();
  public DbSet<MoneyTransferEntity> MoneyTransfers => Set<MoneyTransferEntity>();
  public DbSet<SupplierPaymentEntity> SupplierPayments => Set<SupplierPaymentEntity>();
  public DbSet<SupplierPaymentAllocationEntity> SupplierPaymentAllocations => Set<SupplierPaymentAllocationEntity>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
  }
}
