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
    modelBuilder.Entity<SalesInvoiceEntity>().HasQueryFilter(x => !x.IsDeleted && (SelectedBranchId == null || x.BranchId == SelectedBranchId));
    modelBuilder.Entity<MoneyAccountEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<JournalEntryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<ExpenseDocumentEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<OpeningStockLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.Document.BranchId == SelectedBranchId);
    modelBuilder.Entity<StockAdjustmentLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.Document.BranchId == SelectedBranchId);
    modelBuilder.Entity<WarehouseTransferLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.Document.BranchId == SelectedBranchId);
    modelBuilder.Entity<StockMovementEntity>().HasQueryFilter(x => SelectedBranchId == null || x.Warehouse.BranchId == SelectedBranchId);
    modelBuilder.Entity<PurchaseInvoiceLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PurchaseInvoice.BranchId == SelectedBranchId);
    modelBuilder.Entity<SalesInvoiceLineEntity>().HasQueryFilter(x => !x.SalesInvoice.IsDeleted && (SelectedBranchId == null || x.SalesInvoice.BranchId == SelectedBranchId));
    modelBuilder.Entity<JournalLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.JournalEntry.BranchId == SelectedBranchId);
    modelBuilder.Entity<ExpenseLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.ExpenseDocument.BranchId == SelectedBranchId);
    modelBuilder.Entity<MoneyAccountAccessEntity>().HasQueryFilter(x => SelectedBranchId == null || x.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<MoneyLedgerEntryEntity>().HasQueryFilter(x => SelectedBranchId == null || x.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<MoneyTransferEntity>().HasQueryFilter(x => SelectedBranchId == null || x.SourceMoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<SupplierPaymentEntity>().HasQueryFilter(x => SelectedBranchId == null || x.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<SupplierPaymentAllocationEntity>().HasQueryFilter(x => SelectedBranchId == null || x.SupplierPayment.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<CustomerReceiptEntity>().HasQueryFilter(x => !x.IsDeleted && (SelectedBranchId == null || x.MoneyAccount.BranchId == SelectedBranchId));
    modelBuilder.Entity<CustomerReceiptDraftAllocationEntity>().HasQueryFilter(x => SelectedBranchId == null || x.CustomerReceipt.MoneyAccount.BranchId == SelectedBranchId);
    modelBuilder.Entity<PaymentEntity>().HasQueryFilter(x => !x.IsDeleted && (SelectedBranchId == null || x.BranchId == SelectedBranchId));
    modelBuilder.Entity<PaymentAllocationEntity>().HasQueryFilter(x => !x.Payment.IsDeleted && (SelectedBranchId == null || x.Payment.BranchId == SelectedBranchId));
    modelBuilder.Entity<PaymentMoneyLineEntity>().HasQueryFilter(x => !x.Payment.IsDeleted && (SelectedBranchId == null || x.Payment.BranchId == SelectedBranchId));
    modelBuilder.Entity<PosContextEntity>().HasQueryFilter(x => SelectedBranchId == null || x.SalesInvoice.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosRefundEntity>().HasQueryFilter(x => SelectedBranchId == null || x.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosRefundLineEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PosRefund.BranchId == SelectedBranchId);
    modelBuilder.Entity<PosRefundPayoutEntity>().HasQueryFilter(x => SelectedBranchId == null || x.PosRefund.BranchId == SelectedBranchId);
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
    EnsureActivityLogsAreAppendOnly();
    ValidateBranchWritesAsync(CancellationToken.None).GetAwaiter().GetResult();
    RecordAutomaticActivityLogs();
    return base.SaveChanges(acceptAllChangesOnSuccess);
  }

  public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
  {
    EnsureActivityLogsAreAppendOnly();
    await ValidateBranchWritesAsync(cancellationToken);
    RecordAutomaticActivityLogs();
    return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
  }

  private void EnsureActivityLogsAreAppendOnly()
  {
    if (ChangeTracker.Entries<ActivityLogEntity>()
      .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted))
      throw new InvalidOperationException("Activity logs are append-only and cannot be modified or deleted.");
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
        if (entry.State == EntityState.Added
          && entry.Entity is ContactEntity { SystemRole: not null })
        {
          // Protected system contacts are provisioned explicitly for either the shared
          // catalog or a newly created separate catalog branch.
        }
        else if (entry.State == EntityState.Added) catalog.CatalogBranchId = CatalogBranchId;
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
    var references = new Dictionary<(Type Type, string KeyProperty), HashSet<Guid>>();
    void RequireReference(Type type, string keyProperty, Guid id)
    {
      if (!references.TryGetValue((type, keyProperty), out var ids))
        references[(type, keyProperty)] = ids = [];
      ids.Add(id);
    }

    foreach (var entry in entries)
    {
      if (entry.State == EntityState.Modified && entry.Metadata.GetDeclaredQueryFilters().Any())
      {
        var key = entry.Metadata.FindPrimaryKey();
        if (key?.Properties.Count == 1
          && entry.Property(key.Properties[0].Name).OriginalValue is Guid id)
          RequireReference(entry.Metadata.ClrType, key.Properties[0].Name, id);
      }
      foreach (var fk in entry.Metadata.GetForeignKeys().Where(fk => fk.PrincipalEntityType.GetDeclaredQueryFilters().Any()))
      {
        var keyIndex = fk.PrincipalKey.Properties.ToList().FindIndex(property => property.Name == "Id");
        if (keyIndex < 0 && fk.PrincipalKey.Properties.Count == 1) keyIndex = 0;
        if (keyIndex < 0 || entry.Property(fk.Properties[keyIndex].Name).CurrentValue is not Guid id) continue;
        var type = fk.PrincipalEntityType.ClrType;
        var keyProperty = fk.PrincipalKey.Properties[keyIndex].Name;
        if (entries.Any(candidate => candidate.Metadata.ClrType == type && candidate.State == EntityState.Added
          && candidate.Property(keyProperty).CurrentValue is Guid candidateId && candidateId == id)) continue;
        RequireReference(type, keyProperty, id);
      }
    }

    // Batch by entity type so a document with many lines does not query once per line.
    foreach (var ((type, keyProperty), ids) in references)
    {
      var method = typeof(AppDbContext).GetMethod(nameof(CountVisibleAsync), System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
      var count = await (Task<int>)method.MakeGenericMethod(type).Invoke(this, [ids.ToArray(), keyProperty, ct])!;
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
  private Task<int> CountVisibleAsync<TEntity>(Guid[] ids, string keyProperty, CancellationToken ct) where TEntity : class =>
    Set<TEntity>().AsNoTracking().CountAsync(entity => ids.Contains(EF.Property<Guid>(entity, keyProperty)), ct);

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
      if (entry.Entity is PosContextEntity posContext && entry.State == EntityState.Added)
      {
        ActivityLogs.Add(new ActivityLogEntity
        {
          BranchId = branchId,
          UserId = posContext.OperatorUserId,
          Action = "completed",
          EntityType = "POS Sale",
          EntityId = posContext.SalesInvoiceId,
          DocumentNumber = posContext.SalesInvoice.DocumentNumber,
          Description = "Completed POS sale",
          TimestampUtc = posContext.CompletedAtUtc
        });
      }
      else if (entry.Entity is PosRefundEntity refund && entry.State == EntityState.Added)
      {
        ActivityLogs.Add(new ActivityLogEntity
        {
          BranchId = branchId,
          UserId = refund.ApprovedByUserId,
          Action = refund.IsVoid ? "voided" : "refunded",
          EntityType = "POS Refund",
          EntityId = refund.Id,
          DocumentNumber = refund.DocumentNumber,
          Description = refund.IsVoid ? "Voided remaining POS sale" : "Posted POS refund",
          TimestampUtc = refund.PostedAtUtc
        });
      }
      else if (entry.Entity is SalesInvoiceEntity sale)
      {
        if (entry.State == EntityState.Added && sale.PosContext == null)
        {
          ActivityLogs.Add(new ActivityLogEntity
          {
            BranchId = branchId,
            UserId = sale.CreatedByUserId,
            // An active Sales Invoice is internally Posted so existing effect
            // generation can be reused, but its user-facing lifecycle starts
            // with one creation activity, never a separate posting activity.
            Action = "created",
            EntityType = "Sales Invoice",
            EntityId = sale.Id,
            DocumentNumber = sale.DocumentNumber,
            Description = "Created sales invoice",
            TimestampUtc = sale.PostedAtUtc ?? sale.CreatedAtUtc
          });
        }
        else if (entry.State == EntityState.Modified && sale.PosContext == null)
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
