using Api.Modules.Auth;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Currency;
using Api.Modules.User;
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

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
  }
}
