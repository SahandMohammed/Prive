using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Expenses;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Purchase;
using Api.Modules.Sales;
using Api.Modules.Dashboard;
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
    modelBuilder.Entity<PosRegisterEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosSessionEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosSessionOpeningCountEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PosSession.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosSessionClosingCountEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PosSession.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosZReportEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosZPaymentSummaryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PosZReport.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosZDrawerSummaryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PosZReport.BranchId == SelectedBranchId);
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
    modelBuilder.Entity<ActivityLogEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
  }

  public override int SaveChanges(bool acceptAllChangesOnSuccess)
  {
    ValidateBranchWritesAsync(CancellationToken.None).GetAwaiter().GetResult();
    RecordAutomaticActivityLogs();
    return base.SaveChanges(acceptAllChangesOnSuccess);
  }

  public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
  {
    await ValidateBranchWritesAsync(cancellationToken);
    RecordAutomaticActivityLogs();
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

    await ValidateGlobalOperationalCodesAsync(entries, ct);

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

  private async Task ValidateGlobalOperationalCodesAsync(IReadOnlyCollection<Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry> entries, CancellationToken ct)
  {
    var moneyAccounts = entries.Where(entry => entry.State is EntityState.Added or EntityState.Modified)
      .Select(entry => entry.Entity).OfType<MoneyAccountEntity>().ToList();
    foreach (var account in moneyAccounts)
    {
      if (moneyAccounts.Any(other => other.Id != account.Id && other.Code == account.Code)
        || await MoneyAccounts.IgnoreQueryFilters().AsNoTracking().AnyAsync(other => other.Id != account.Id && other.Code == account.Code, ct))
        throw new ConflictException(ErrorCodes.Finance.MoneyAccountCodeTaken, $"Money Account code '{account.Code}' is already in use.");
    }

    var warehouses = entries.Where(entry => entry.State is EntityState.Added or EntityState.Modified)
      .Select(entry => entry.Entity).OfType<WarehouseEntity>().ToList();
    foreach (var warehouse in warehouses)
    {
      if (warehouses.Any(other => other.Id != warehouse.Id && other.Code == warehouse.Code)
        || await Warehouses.IgnoreQueryFilters().AsNoTracking().AnyAsync(other => other.Id != warehouse.Id && other.Code == warehouse.Code, ct))
        throw new ConflictException(ErrorCodes.Inventory.WarehouseCodeTaken, $"Warehouse code '{warehouse.Code}' is already in use.");
    }
  }

  // Find uses the tracking cache; filtered database queries also catch directly attached foreign rows.
  private Task<int> CountVisibleAsync<TEntity>(Guid[] ids, CancellationToken ct) where TEntity : class =>
    Set<TEntity>().AsNoTracking().CountAsync(entity => ids.Contains(EF.Property<Guid>(entity, "Id")), ct);

  private static void ThrowScopeMismatch() => throw new ForbiddenException(ErrorCodes.Branch.ScopeMismatch,
    "This record or one of its references belongs to a different branch or catalog. Select the correct branch and try again.");

  private void RecordAutomaticActivityLogs()
  {
    if (SelectedBranchId is not Guid branchId) return;

    var entries = ChangeTracker.Entries()
      .Where(e => e.Entity is not ActivityLogEntity && (e.State == EntityState.Added || e.State == EntityState.Modified))
      .ToList();

    foreach (var entry in entries)
    {
      if (entry.Entity is PosSaleEntity posSale && entry.State == EntityState.Added)
      {
        ActivityLogs.Add(new ActivityLogEntity
        {
          BranchId = branchId,
          UserId = posSale.CashierUserId,
          Action = "completed",
          EntityType = "POS Sale",
          EntityId = posSale.Id,
          DocumentNumber = posSale.DocumentNumber,
          Description = "Completed POS sale",
          TimestampUtc = posSale.CompletedAtUtc
        });
      }
      else if (entry.Entity is SalesInvoiceEntity sale)
      {
        if (entry.State == EntityState.Added && sale.PosSale == null)
        {
          ActivityLogs.Add(new ActivityLogEntity
          {
            BranchId = branchId,
            UserId = sale.CreatedByUserId,
            Action = sale.Status == SalesInvoiceStatus.Posted ? "posted" : "created",
            EntityType = "Sales Invoice",
            EntityId = sale.Id,
            DocumentNumber = sale.DocumentNumber,
            Description = sale.Status == SalesInvoiceStatus.Posted ? "Posted sales invoice" : "Created sales invoice draft",
            TimestampUtc = sale.PostedAtUtc ?? sale.CreatedAtUtc
          });
        }
        else if (entry.State == EntityState.Modified && sale.PosSale == null)
        {
          var statusProp = entry.Property(nameof(SalesInvoiceEntity.Status));
          if (statusProp.IsModified && sale.Status == SalesInvoiceStatus.Posted && (SalesInvoiceStatus)statusProp.OriginalValue! != SalesInvoiceStatus.Posted)
          {
            ActivityLogs.Add(new ActivityLogEntity
            {
              BranchId = branchId,
              UserId = sale.CreatedByUserId,
              Action = "posted",
              EntityType = "Sales Invoice",
              EntityId = sale.Id,
              DocumentNumber = sale.DocumentNumber,
              Description = "Posted sales invoice",
              TimestampUtc = sale.PostedAtUtc ?? DateTime.UtcNow
            });
          }
        }
      }
      else if (entry.Entity is ExpenseDocumentEntity expense)
      {
        if (entry.State == EntityState.Added)
        {
          ActivityLogs.Add(new ActivityLogEntity
          {
            BranchId = branchId,
            UserId = expense.CreatedByUserId,
            Action = expense.Status == ExpenseDocumentStatus.Posted ? "posted" : "created",
            EntityType = "Expense",
            EntityId = expense.Id,
            DocumentNumber = expense.DocumentNumber,
            Description = expense.PayeeName ?? expense.Reference ?? "Recorded expense",
            TimestampUtc = expense.PostedAtUtc ?? expense.CreatedAtUtc
          });
        }
        else if (entry.State == EntityState.Modified)
        {
          var statusProp = entry.Property(nameof(ExpenseDocumentEntity.Status));
          if (statusProp.IsModified && expense.Status == ExpenseDocumentStatus.Posted && (ExpenseDocumentStatus)statusProp.OriginalValue! != ExpenseDocumentStatus.Posted)
          {
            ActivityLogs.Add(new ActivityLogEntity
            {
              BranchId = branchId,
              UserId = expense.PostedByUserId ?? expense.CreatedByUserId,
              Action = "posted",
              EntityType = "Expense",
              EntityId = expense.Id,
              DocumentNumber = expense.DocumentNumber,
              Description = expense.PayeeName ?? expense.Reference ?? "Posted expense",
              TimestampUtc = expense.PostedAtUtc ?? DateTime.UtcNow
            });
          }
        }
      }
      else if (entry.Entity is CustomerReceiptEntity receipt)
      {
        if (entry.State == EntityState.Added)
        {
          ActivityLogs.Add(new ActivityLogEntity
          {
            BranchId = branchId,
            UserId = receipt.CreatedByUserId,
            Action = receipt.Status == FinanceDocumentStatus.Posted ? "posted" : "created",
            EntityType = "Customer Receipt",
            EntityId = receipt.Id,
            DocumentNumber = receipt.DocumentNumber,
            Description = "Recorded customer receipt",
            TimestampUtc = receipt.PostedAtUtc ?? receipt.CreatedAtUtc
          });
        }
        else if (entry.State == EntityState.Modified)
        {
          var statusProp = entry.Property(nameof(CustomerReceiptEntity.Status));
          if (statusProp.IsModified && receipt.Status == FinanceDocumentStatus.Posted && (FinanceDocumentStatus)statusProp.OriginalValue! != FinanceDocumentStatus.Posted)
          {
            ActivityLogs.Add(new ActivityLogEntity
            {
              BranchId = branchId,
              UserId = receipt.CreatedByUserId,
              Action = "posted",
              EntityType = "Customer Receipt",
              EntityId = receipt.Id,
              DocumentNumber = receipt.DocumentNumber,
              Description = "Posted customer receipt",
              TimestampUtc = receipt.PostedAtUtc ?? DateTime.UtcNow
            });
          }
        }
      }
      else if (entry.Entity is SupplierPaymentEntity payment)
      {
        if (entry.State == EntityState.Added)
        {
          ActivityLogs.Add(new ActivityLogEntity
          {
            BranchId = branchId,
            UserId = payment.CreatedByUserId,
            Action = payment.Status == FinanceDocumentStatus.Posted ? "posted" : "created",
            EntityType = "Supplier Payment",
            EntityId = payment.Id,
            DocumentNumber = payment.DocumentNumber,
            Description = "Recorded supplier payment",
            TimestampUtc = payment.PostedAtUtc ?? payment.CreatedAtUtc
          });
        }
        else if (entry.State == EntityState.Modified)
        {
          var statusProp = entry.Property(nameof(SupplierPaymentEntity.Status));
          if (statusProp.IsModified && payment.Status == FinanceDocumentStatus.Posted && (FinanceDocumentStatus)statusProp.OriginalValue! != FinanceDocumentStatus.Posted)
          {
            ActivityLogs.Add(new ActivityLogEntity
            {
              BranchId = branchId,
              UserId = payment.CreatedByUserId,
              Action = "posted",
              EntityType = "Supplier Payment",
              EntityId = payment.Id,
              DocumentNumber = payment.DocumentNumber,
              Description = "Posted supplier payment",
              TimestampUtc = payment.PostedAtUtc ?? DateTime.UtcNow
            });
          }
        }
      }
      else if (entry.Entity is PurchaseInvoiceEntity purchase)
      {
        if (entry.State == EntityState.Added)
        {
          ActivityLogs.Add(new ActivityLogEntity
          {
            BranchId = branchId,
            UserId = purchase.CreatedByUserId,
            Action = purchase.Status == PurchaseInvoiceStatus.Posted ? "posted" : "created",
            EntityType = "Purchase Invoice",
            EntityId = purchase.Id,
            DocumentNumber = purchase.DocumentNumber,
            Description = "Recorded purchase invoice",
            TimestampUtc = purchase.PostedAtUtc ?? purchase.CreatedAtUtc
          });
        }
        else if (entry.State == EntityState.Modified)
        {
          var statusProp = entry.Property(nameof(PurchaseInvoiceEntity.Status));
          if (statusProp.IsModified && purchase.Status == PurchaseInvoiceStatus.Posted && (PurchaseInvoiceStatus)statusProp.OriginalValue! != PurchaseInvoiceStatus.Posted)
          {
            ActivityLogs.Add(new ActivityLogEntity
            {
              BranchId = branchId,
              UserId = purchase.CreatedByUserId,
              Action = "posted",
              EntityType = "Purchase Invoice",
              EntityId = purchase.Id,
              DocumentNumber = purchase.DocumentNumber,
              Description = "Posted purchase invoice",
              TimestampUtc = purchase.PostedAtUtc ?? DateTime.UtcNow
            });
          }
        }
      }
      else if (entry.Entity is MoneyTransferEntity transfer && entry.State == EntityState.Modified)
      {
        var statusProp = entry.Property(nameof(MoneyTransferEntity.Status));
        if (statusProp.IsModified && transfer.Status == FinanceDocumentStatus.Posted && (FinanceDocumentStatus)statusProp.OriginalValue! != FinanceDocumentStatus.Posted)
        {
          ActivityLogs.Add(new ActivityLogEntity
          {
            BranchId = branchId,
            UserId = transfer.CreatedByUserId,
            Action = "posted",
            EntityType = "Money Transfer",
            EntityId = transfer.Id,
            DocumentNumber = transfer.DocumentNumber,
            Description = "Posted money transfer",
            TimestampUtc = transfer.PostedAtUtc ?? DateTime.UtcNow
          });
        }
      }
    }
  }
}
