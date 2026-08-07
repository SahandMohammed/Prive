using Api.Modules.Auth;
using Api.Modules.User;
using Api.Modules.Settings;
using Microsoft.EntityFrameworkCore;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Purchases;
using Api.Modules.Sales;
using Api.Shared.Domain;

namespace Api.Shared.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
  public DbSet<UserEntity> Users => Set<UserEntity>();
  public DbSet<RefreshTokenEntity> RefreshTokens => Set<RefreshTokenEntity>();
  
  // Finance Module (ERP)
  public DbSet<CurrencyEntity> Currencies => Set<CurrencyEntity>();
  public DbSet<AccountEntity> Accounts => Set<AccountEntity>();
  public DbSet<ContactEntity> Contacts => Set<ContactEntity>();
  public DbSet<AccountTransactionEntity> AccountTransactions => Set<AccountTransactionEntity>();
  public DbSet<FinancialVoucherEntity> FinancialVouchers => Set<FinancialVoucherEntity>();
  public DbSet<PaymentAllocationEntity> PaymentAllocations => Set<PaymentAllocationEntity>();

  // Settings / Items Module
  public DbSet<UnitOfMeasureEntity> UnitsOfMeasure => Set<UnitOfMeasureEntity>();
  public DbSet<ItemCategoryEntity> ItemCategories => Set<ItemCategoryEntity>();
  public DbSet<ItemEntity> Items => Set<ItemEntity>();
  public DbSet<ItemUnitOfMeasureEntity> ItemUnitsOfMeasure => Set<ItemUnitOfMeasureEntity>();
  public DbSet<BusinessSettingsEntity> BusinessSettings => Set<BusinessSettingsEntity>();
  public DbSet<WarehouseEntity> Warehouses => Set<WarehouseEntity>();

  // Sales and purchases own separate source documents and share the ledgers.
  public DbSet<SalesInvoiceEntity> SalesInvoices => Set<SalesInvoiceEntity>();
  public DbSet<SalesInvoiceLineEntity> SalesInvoiceLines => Set<SalesInvoiceLineEntity>();
  public DbSet<PurchaseInvoiceEntity> PurchaseInvoices => Set<PurchaseInvoiceEntity>();
  public DbSet<PurchaseInvoiceLineEntity> PurchaseInvoiceLines => Set<PurchaseInvoiceLineEntity>();
  public DbSet<StockTransactionEntity> StockTransactions => Set<StockTransactionEntity>();
  public DbSet<WarehouseTransferEntity> WarehouseTransfers => Set<WarehouseTransferEntity>();
  public DbSet<WarehouseTransferLineEntity> WarehouseTransferLines => Set<WarehouseTransferLineEntity>();
  public DbSet<StockAdjustmentEntity> StockAdjustments => Set<StockAdjustmentEntity>();
  public DbSet<StockAdjustmentLineEntity> StockAdjustmentLines => Set<StockAdjustmentLineEntity>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
  }

  public override int SaveChanges(bool acceptAllChangesOnSuccess)
  {
    EnsureLedgersAreAppendOnly();
    return base.SaveChanges(acceptAllChangesOnSuccess);
  }

  public override Task<int> SaveChangesAsync(
    bool acceptAllChangesOnSuccess,
    CancellationToken cancellationToken = default)
  {
    EnsureLedgersAreAppendOnly();
    return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
  }

  private void EnsureLedgersAreAppendOnly()
  {
    var financialMutation = ChangeTracker.Entries<AccountTransactionEntity>()
      .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted);
    var stockMutation = ChangeTracker.Entries<StockTransactionEntity>()
      .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted);

    if (financialMutation || stockMutation)
    {
      throw new InvalidOperationException(
        "Posted financial and stock ledger transactions are append-only. Create an explicit reversal instead.");
    }

    foreach (var entry in ChangeTracker.Entries<IPostableDocument>()
      .Where(entry => entry.State is EntityState.Modified or EntityState.Deleted))
    {
      var originalStatus = entry.OriginalValues.GetValue<DocumentStatus>(nameof(IPostableDocument.Status));
      var currentStatus = entry.State == EntityState.Deleted
        ? originalStatus
        : entry.CurrentValues.GetValue<DocumentStatus>(nameof(IPostableDocument.Status));

      if (originalStatus is DocumentStatus.Posted or DocumentStatus.Voided ||
          currentStatus != DocumentStatus.Draft)
      {
        throw new InvalidOperationException(
          "Posted or voided source documents are immutable. Use the controlled post or void workflow.");
      }
    }
  }
}
