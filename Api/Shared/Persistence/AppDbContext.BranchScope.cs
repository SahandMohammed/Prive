using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Expenses;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Purchase;
using Api.Modules.Sales;
using Api.Infrastructure.Http;
using Microsoft.EntityFrameworkCore;

namespace Api.Shared.Persistence;

public sealed partial class AppDbContext
{
  public Guid? SelectedBranchId => branchContext?.BranchId;
  private Guid? CatalogBranchId => branchContext?.CatalogBranchId;

  private void ConfigureBranchFilters(ModelBuilder modelBuilder)
  {
    modelBuilder.Entity<WarehouseEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<OpeningStockDocumentEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<StockAdjustmentDocumentEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<WarehouseTransferDocumentEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<PurchaseInvoiceEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<SalesInvoiceEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<MoneyAccountEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<JournalEntryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<ExpenseDocumentEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<OpeningStockLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.Document.BranchId == SelectedBranchId);
    modelBuilder.Entity<StockAdjustmentLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.Document.BranchId == SelectedBranchId);
    modelBuilder.Entity<WarehouseTransferLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.Document.BranchId == SelectedBranchId);
    modelBuilder.Entity<StockMovementEntity>().HasQueryFilter(x => SelectedBranchId == null || x.Warehouse.BranchId == SelectedBranchId);
    modelBuilder.Entity<PurchaseInvoiceLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PurchaseInvoice.BranchId == SelectedBranchId);
    modelBuilder.Entity<SalesInvoiceLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.SalesInvoice.BranchId == SelectedBranchId);
    modelBuilder.Entity<JournalLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.JournalEntry.BranchId == SelectedBranchId);
    modelBuilder.Entity<ExpenseLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.ExpenseDocument.BranchId == SelectedBranchId);
    modelBuilder.Entity<MoneyAccountAccessEntity>().HasQueryFilter(x => SelectedBranchId == null || x.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<MoneyLedgerEntryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<MoneyTransferEntity>().HasQueryFilter(x => SelectedBranchId == null || x.SourceMoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<SupplierPaymentEntity>().HasQueryFilter(x => SelectedBranchId == null || x.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<SupplierPaymentAllocationEntity>().HasQueryFilter(x => SelectedBranchId == null || x.SupplierPayment.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<CustomerReceiptEntity>().HasQueryFilter(x => SelectedBranchId == null || x.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<CustomerReceiptAllocationEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CustomerReceipt.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosSaleEntity>().HasQueryFilter(x => SelectedBranchId == null || x.SalesInvoice.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosTenderEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PosSale.SalesInvoice.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosChangeEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PosSale.SalesInvoice.BranchId == SelectedBranchId);
    modelBuilder.Entity<ContactEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CatalogBranchId == CatalogBranchId);
    modelBuilder.Entity<ProductCategoryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CatalogBranchId == CatalogBranchId);
    modelBuilder.Entity<ProductSubcategoryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CatalogBranchId == CatalogBranchId);
    modelBuilder.Entity<UnitOfMeasureEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CatalogBranchId == CatalogBranchId);
    modelBuilder.Entity<ProductEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CatalogBranchId == CatalogBranchId);
    modelBuilder.Entity<ProductUnitConversionEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CatalogBranchId == CatalogBranchId);
    modelBuilder.Entity<ServiceCategoryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CatalogBranchId == CatalogBranchId);
    modelBuilder.Entity<ServiceEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CatalogBranchId == CatalogBranchId);
  }

  public override int SaveChanges(bool acceptAllChangesOnSuccess)
  {
    ValidateBranchWritesAsync(CancellationToken.None).GetAwaiter().GetResult();
    return base.SaveChanges(acceptAllChangesOnSuccess);
  }

  public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
  {
    await ValidateBranchWritesAsync(cancellationToken);
    return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
  }

  private async Task ValidateBranchWritesAsync(CancellationToken ct)
  {
    // Design-time tooling and startup seeding have no HTTP branch context.
    if (SelectedBranchId is not Guid branchId) return;
    var entries = ChangeTracker.Entries().Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted).ToList();
    foreach (var entry in entries)
    {
      if (entry.Entity is IBranchCatalogEntity catalog)
      {
        if (entry.State == EntityState.Added) catalog.CatalogBranchId = CatalogBranchId;
        else if (entry.Property(nameof(IBranchCatalogEntity.CatalogBranchId)).OriginalValue as Guid? != CatalogBranchId
          || catalog.CatalogBranchId != CatalogBranchId) ThrowScopeMismatch();
      }
      else if (entry.Metadata.FindProperty("BranchId") is not null && entry.Entity is not UserBranchAccessEntity)
      {
        if ((Guid)entry.Property("BranchId").CurrentValue! != branchId
          || (entry.State != EntityState.Added && (Guid)entry.Property("BranchId").OriginalValue! != branchId))
          ThrowScopeMismatch();
      }
    }

    // Validate both row ownership and referenced scoped rows, including IDs sent directly by API clients.
    var references = new Dictionary<Type, HashSet<Guid>>();
    void RequireReference(Type type, Guid id)
    {
      if (!references.TryGetValue(type, out var ids)) references[type] = ids = [];
      ids.Add(id);
    }

    foreach (var entry in entries)
    {
      if (entry.State != EntityState.Added && entry.Metadata.GetDeclaredQueryFilters().Any())
        RequireReference(entry.Metadata.ClrType, (Guid)entry.Property("Id").OriginalValue!);
      foreach (var fk in entry.Metadata.GetForeignKeys().Where(fk => fk.PrincipalEntityType.GetDeclaredQueryFilters().Any()))
      {
        if (fk.Properties.Count != 1 || entry.Property(fk.Properties[0].Name).CurrentValue is not Guid id) continue;
        var type = fk.PrincipalEntityType.ClrType;
        if (entries.Any(candidate => candidate.Metadata.ClrType == type && candidate.State == EntityState.Added
          && (Guid)candidate.Property("Id").CurrentValue! == id)) continue;
        RequireReference(type, id);
      }
    }

    // Batch by entity type so a document with many lines does not query once per line.
    foreach (var (type, ids) in references)
    {
      var method = typeof(AppDbContext).GetMethod(nameof(CountVisibleAsync), System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
      var count = await (Task<int>)method.MakeGenericMethod(type).Invoke(this, [ids.ToArray(), ct])!;
      if (count != ids.Count) ThrowScopeMismatch();
    }
  }

  // Find uses the tracking cache; filtered database queries also catch directly attached foreign rows.
  private Task<int> CountVisibleAsync<TEntity>(Guid[] ids, CancellationToken ct) where TEntity : class =>
    Set<TEntity>().AsNoTracking().CountAsync(entity => ids.Contains(EF.Property<Guid>(entity, "Id")), ct);

  private static void ThrowScopeMismatch() => throw new ForbiddenException(ErrorCodes.Branch.ScopeMismatch,
    "This record or one of its references belongs to a different branch or catalog. Select the correct branch and try again.");
}
