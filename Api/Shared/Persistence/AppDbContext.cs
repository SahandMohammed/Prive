using Api.Modules.Auth;
using Api.Modules.User;
using Api.Modules.Settings;
using Microsoft.EntityFrameworkCore;
using Api.Modules.Finance;

namespace Api.Shared.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
  public DbSet<UserEntity> Users => Set<UserEntity>();
  public DbSet<RefreshTokenEntity> RefreshTokens => Set<RefreshTokenEntity>();
  
  // Finance Module (ERP)
  public DbSet<CurrencyEntity> Currencies => Set<CurrencyEntity>();
  public DbSet<AccountEntity> Accounts => Set<AccountEntity>();
  public DbSet<ContactEntity> Contacts => Set<ContactEntity>();
  public DbSet<JournalEntryEntity> JournalEntries => Set<JournalEntryEntity>();
  public DbSet<JournalEntryLineEntity> JournalEntryLines => Set<JournalEntryLineEntity>();
  public DbSet<InvoiceEntity> Invoices => Set<InvoiceEntity>();
  public DbSet<InvoiceLineEntity> InvoiceLines => Set<InvoiceLineEntity>();
  public DbSet<VoucherEntity> Vouchers => Set<VoucherEntity>();
  public DbSet<VoucherAllocationEntity> VoucherAllocations => Set<VoucherAllocationEntity>();

  // Settings / Items Module
  public DbSet<UnitOfMeasureEntity> UnitsOfMeasure => Set<UnitOfMeasureEntity>();
  public DbSet<ItemCategoryEntity> ItemCategories => Set<ItemCategoryEntity>();
  public DbSet<ItemEntity> Items => Set<ItemEntity>();
  public DbSet<ItemUnitOfMeasureEntity> ItemUnitsOfMeasure => Set<ItemUnitOfMeasureEntity>();
  public DbSet<BusinessSettingsEntity> BusinessSettings => Set<BusinessSettingsEntity>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
  }
}
