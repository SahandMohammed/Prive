using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Business;
using Api.Modules.Contact;
using Api.Modules.Currency;
using Api.Modules.Inventory;
using Api.Modules.Purchase;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed class PurchaseWorkflowTests
{
  [Fact]
  public async Task Draft_create_edit_and_delete_have_no_inventory_or_accounting_effect()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var request = Request(data, data.BaseCurrencyId, null, [new(data.ProductAId, data.UnitId, 2, 10)]);

    var draft = await service.CreateAsync(request, data.UserId, default);
    Assert.Equal("PI-000001", draft.DocumentNumber);
    Assert.Equal(PurchaseInvoiceStatus.Draft, draft.Status);
    Assert.Equal(20, draft.Total);
    Assert.Equal(20, draft.BaseTotal);
    Assert.Empty(db.StockMovements);
    Assert.Empty(db.JournalEntries);

    await service.UpdateAsync(draft.Id, request with { Lines = [new(data.ProductAId, data.UnitId, 3, 12)] }, default);
    Assert.Empty(db.StockMovements);
    Assert.Empty(db.JournalEntries);

    await service.DeleteAsync(draft.Id, default);
    Assert.Empty(db.PurchaseInvoices);
    Assert.Empty(db.StockMovements);
    Assert.Empty(db.JournalEntries);
  }

  [Fact]
  public async Task Posting_multiple_lines_updates_stock_weighted_average_and_creates_one_balanced_journal()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    db.StockMovements.Add(new StockMovementEntity
    {
      ProductId = data.ProductAId,
      WarehouseId = data.WarehouseId,
      Type = StockMovementType.OpeningStock,
      MovementDate = DateOnly.FromDateTime(DateTime.UtcNow),
      QuantityIn = 10,
      UnitCostBase = 10,
      PerformedByUserId = data.UserId
    });
    await db.SaveChangesAsync();

    var service = CreateService(db);
    var draft = await service.CreateAsync(
      Request(data, data.BaseCurrencyId, null,
        [new(data.ProductAId, data.UnitId, 10, 12), new(data.ProductBId, data.UnitId, 5, 8)]),
      data.UserId,
      default);

    var posted = await service.PostAsync(draft.Id, data.UserId, default);

    Assert.Equal(PurchaseInvoiceStatus.Posted, posted.Status);
    Assert.NotNull(posted.PostedAtUtc);
    Assert.NotNull(posted.JournalEntryId);
    Assert.Equal(2, posted.StockMovementIds.Count);
    var purchaseMovements = await db.StockMovements.Where(movement => movement.PurchaseInvoiceId == draft.Id).ToListAsync();
    Assert.Equal(2, purchaseMovements.Count);
    Assert.All(purchaseMovements, movement => Assert.NotNull(movement.PurchaseInvoiceLineId));
    Assert.Equal(20, await QuantityAsync(db, data.WarehouseId, data.ProductAId));
    Assert.Equal(11, await AverageCostAsync(db, data.WarehouseId, data.ProductAId));

    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync(entry => entry.Id == posted.JournalEntryId);
    Assert.Equal(JournalEntryStatus.Posted, journal.Status);
    Assert.Equal(draft.DocumentNumber, journal.Reference);
    Assert.Equal(160, journal.Lines.Sum(line => line.DebitBaseAmount));
    Assert.Equal(160, journal.Lines.Sum(line => line.CreditBaseAmount));
    Assert.Equal(data.InventoryAccountId, journal.Lines.Single(line => line.DebitBaseAmount > 0).AccountId);
    Assert.Equal(data.PayableAccountId, journal.Lines.Single(line => line.CreditBaseAmount > 0).AccountId);

    await Assert.ThrowsAsync<ConflictException>(() => service.PostAsync(draft.Id, data.UserId, default));
    await Assert.ThrowsAsync<ConflictException>(() => service.UpdateAsync(draft.Id, Request(data, data.BaseCurrencyId, null, [new(data.ProductAId, data.UnitId, 1, 1)]), default));
    await Assert.ThrowsAsync<ConflictException>(() => service.DeleteAsync(draft.Id, default));

    (await db.Contacts.FindAsync(data.SupplierId))!.IsActive = false;
    await db.SaveChangesAsync();
    Assert.Equal("Supplier", (await service.GetByIdAsync(draft.Id, default)).SupplierName);
    await Assert.ThrowsAsync<BadRequestException>(() => new ContactService(db).DeleteAsync(data.SupplierId));
  }

  [Fact]
  public async Task Supplier_must_be_active_and_have_supplier_role()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var request = Request(data, data.BaseCurrencyId, null, [new(data.ProductAId, data.UnitId, 1, 1)]);

    var supplier = await db.Contacts.FindAsync(data.SupplierId);
    supplier!.IsSupplier = false;
    await db.SaveChangesAsync();
    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(request, data.UserId, default));

    supplier.IsSupplier = true;
    supplier.IsActive = false;
    await db.SaveChangesAsync();
    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(request, data.UserId, default));
  }

  [Fact]
  public async Task Foreign_currency_requires_and_preserves_rate_and_posts_base_currency_values()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var line = new PurchaseInvoiceLineRequest(data.ProductAId, data.UnitId, 10, 8);

    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(Request(data, data.ForeignCurrencyId, null, [line]), data.UserId, default));
    var draft = await service.CreateAsync(Request(data, data.ForeignCurrencyId, 1310, [line]), data.UserId, default);
    Assert.Equal(80, draft.Total);
    Assert.Equal(104800, draft.BaseTotal);

    var posted = await service.PostAsync(draft.Id, data.UserId, default);
    Assert.Equal(data.ForeignCurrencyId, posted.CurrencyId);
    Assert.Equal(data.BaseCurrencyId, posted.BaseCurrencyId);
    Assert.Equal(1310, posted.ExchangeRate);
    Assert.Equal(104800, (await db.StockMovements.SingleAsync(movement => movement.PurchaseInvoiceId == draft.Id)).UnitCostBase * 10);

    (await db.Businesses.SingleAsync()).BaseCurrencyId = data.ForeignCurrencyId;
    await db.SaveChangesAsync();
    var historical = await service.GetByIdAsync(draft.Id, default);
    Assert.Equal(data.BaseCurrencyId, historical.BaseCurrencyId);
    Assert.Equal(1310, historical.ExchangeRate);
    Assert.Equal(104800, historical.BaseTotal);
  }

  [Fact]
  public async Task Invalid_inventory_or_account_mapping_prevents_every_posting_effect()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var invalidInventory = await service.CreateAsync(
      Request(data, data.BaseCurrencyId, null, [new(data.ProductAId, data.UnitId, 1, 10), new(data.ProductBId, data.UnitId, 1, 20)]),
      data.UserId,
      default);
    (await db.Products.FindAsync(data.ProductBId))!.IsActive = false;
    await db.SaveChangesAsync();

    await Assert.ThrowsAsync<BadRequestException>(() => service.PostAsync(invalidInventory.Id, data.UserId, default));
    Assert.Empty(db.StockMovements);
    Assert.Empty(db.JournalEntries);
    Assert.Equal(PurchaseInvoiceStatus.Draft, (await db.PurchaseInvoices.FindAsync(invalidInventory.Id))!.Status);

    (await db.Products.FindAsync(data.ProductBId))!.IsActive = true;
    var invalidAccounting = await service.CreateAsync(
      Request(data, data.BaseCurrencyId, null, [new(data.ProductAId, data.UnitId, 1, 10)]),
      data.UserId,
      default);
    (await db.Accounts.FindAsync(data.PayableAccountId))!.IsActive = false;
    await db.SaveChangesAsync();

    await Assert.ThrowsAsync<BadRequestException>(() => service.PostAsync(invalidAccounting.Id, data.UserId, default));
    Assert.Empty(db.StockMovements);
    Assert.Empty(db.JournalEntries);
    Assert.Equal(PurchaseInvoiceStatus.Draft, (await db.PurchaseInvoices.FindAsync(invalidAccounting.Id))!.Status);
  }

  [Fact]
  public async Task Purchase_generated_journal_cannot_be_reversed_directly_from_accounting()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var purchaseService = CreateService(db);
    var accountingService = new AccountingService(db);
    var draft = await purchaseService.CreateAsync(
      Request(data, data.BaseCurrencyId, null, [new(data.ProductAId, data.UnitId, 3, 12)]),
      data.UserId,
      default);
    var posted = await purchaseService.PostAsync(draft.Id, data.UserId, default);
    var journalId = Assert.IsType<Guid>(posted.JournalEntryId);

    var movementCountBefore = await db.StockMovements.CountAsync();
    var stockQuantityBefore = await QuantityAsync(db, data.WarehouseId, data.ProductAId);
    var stockValueBefore = await db.StockMovements.SumAsync(movement =>
      movement.QuantityIn * movement.UnitCostBase - movement.QuantityOut * movement.UnitCostBase);
    var inventoryBalanceBefore = await AccountBalanceAsync(db, data.InventoryAccountId);
    var payableBalanceBefore = await AccountBalanceAsync(db, data.PayableAccountId);

    var exception = await Assert.ThrowsAsync<BadRequestException>(() =>
      accountingService.ReverseJournalAsync(journalId, default));

    Assert.Equal(ErrorCodes.Purchase.JournalDirectReversalNotAllowed, exception.Code);
    Assert.Equal("This journal was generated by a Purchase Invoice and cannot be reversed directly.", exception.Message);
    db.ChangeTracker.Clear();
    Assert.Equal(PurchaseInvoiceStatus.Posted, (await db.PurchaseInvoices.FindAsync(draft.Id))!.Status);
    Assert.Equal(JournalEntryStatus.Posted, (await db.JournalEntries.FindAsync(journalId))!.Status);
    Assert.False(await db.JournalEntries.AnyAsync(entry => entry.ReversalOfJournalId == journalId));
    Assert.Equal(movementCountBefore, await db.StockMovements.CountAsync());
    Assert.Equal(stockQuantityBefore, await QuantityAsync(db, data.WarehouseId, data.ProductAId));
    Assert.Equal(stockValueBefore, await db.StockMovements.SumAsync(movement =>
      movement.QuantityIn * movement.UnitCostBase - movement.QuantityOut * movement.UnitCostBase));
    Assert.Equal(inventoryBalanceBefore, await AccountBalanceAsync(db, data.InventoryAccountId));
    Assert.Equal(payableBalanceBefore, await AccountBalanceAsync(db, data.PayableAccountId));
  }

  [Fact]
  public async Task Manual_journal_can_still_be_reversed_from_accounting()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var accountingService = new AccountingService(db);
    var journal = await accountingService.CreateJournalAsync(
      new CreateJournalEntryRequest(
        DateOnly.FromDateTime(DateTime.UtcNow),
        "MANUAL-001",
        "Manual correction",
        data.BranchId,
        JournalEntryType.Standard,
        [
          new JournalLineRequest(data.InventoryAccountId, null, data.BaseCurrencyId, 10, 0, 1),
          new JournalLineRequest(data.PayableAccountId, null, data.BaseCurrencyId, 0, 10, 1)
        ]),
      default);
    await accountingService.PostJournalAsync(journal.Id, default);

    var reversal = await accountingService.ReverseJournalAsync(journal.Id, default);

    Assert.Equal(JournalEntryStatus.Posted, reversal.Status);
    Assert.Equal(journal.Id, reversal.ReversalOfJournalId);
    Assert.Equal(JournalEntryStatus.Reversed, (await db.JournalEntries.FindAsync(journal.Id))!.Status);
  }

  [Fact]
  public async Task Base_currency_forces_rate_one_and_duplicate_products_are_rejected()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var line = new PurchaseInvoiceLineRequest(data.ProductAId, data.UnitId, 1, 5);

    var draft = await service.CreateAsync(Request(data, data.BaseCurrencyId, 999, [line]), data.UserId, default);
    Assert.Equal(1, draft.ExchangeRate);
    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(Request(data, data.BaseCurrencyId, null, [line, line]), data.UserId, default));
  }

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new AppDbContext(options);
  }

  private static PurchaseService CreateService(AppDbContext db) => new(
    db,
    Options.Create(new PurchaseOptions
    {
      InventoryAccountCode = "1317",
      AccountsPayableAccountCode = "23214"
    }));

  private static PurchaseInvoiceDraftRequest Request(
    TestData data,
    Guid currencyId,
    decimal? exchangeRate,
    List<PurchaseInvoiceLineRequest> lines) => new(
      data.SupplierId,
      DateOnly.FromDateTime(DateTime.UtcNow),
      "SUP-REF",
      data.BranchId,
      data.WarehouseId,
      currencyId,
      exchangeRate,
      "Test purchase",
      lines);

  private static async Task<TestData> SeedAsync(AppDbContext db)
  {
    var user = new UserEntity { Username = "manager", PasswordHash = "test", Role = UserRole.Manager };
    var iqd = new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "IQD", DecimalPlaces = 0 };
    var usd = new CurrencyEntity { Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2 };
    var business = new BusinessEntity
    {
      Name = "Prive",
      PrimaryPhoneNumber = "1",
      Address = "A",
      City = "C",
      Region = "R",
      Country = "IQ",
      BaseCurrency = iqd,
      IsSetupCompleted = true
    };
    var branch = new BranchEntity { Code = "MAIN", Name = "Main", Address = "A", City = "C", Region = "R", Country = "IQ", IsMainBranch = true };
    var supplier = new ContactEntity { Name = "Supplier", IsSupplier = true, IsActive = true };
    var category = new ProductCategoryEntity { Name = "Retail" };
    var unit = new UnitOfMeasureEntity { Name = "Piece", Code = "PC" };
    var warehouse = new WarehouseEntity { Code = "MAIN", Name = "Main Warehouse", Branch = branch };
    var productA = new ProductEntity { Name = "A", SKU = "A", Category = category, UnitOfMeasure = unit, TrackInventory = true };
    var productB = new ProductEntity { Name = "B", SKU = "B", Category = category, UnitOfMeasure = unit, TrackInventory = true };
    var inventory = new AccountEntity { Code = "1317", Name = "Inventory", Classification = AccountClassification.Asset };
    var payable = new AccountEntity { Code = "23214", Name = "Accounts Payable", Classification = AccountClassification.Liability };
    db.AddRange(user, iqd, usd, business, branch, supplier, category, unit, warehouse, productA, productB, inventory, payable);
    await db.SaveChangesAsync();
    return new(user.Id, supplier.Id, branch.Id, warehouse.Id, iqd.Id, usd.Id, unit.Id, productA.Id, productB.Id, inventory.Id, payable.Id);
  }

  private static Task<decimal> QuantityAsync(AppDbContext db, Guid warehouseId, Guid productId) =>
    db.StockMovements.Where(movement => movement.WarehouseId == warehouseId && movement.ProductId == productId)
      .SumAsync(movement => movement.QuantityIn - movement.QuantityOut);

  private static async Task<decimal> AverageCostAsync(AppDbContext db, Guid warehouseId, Guid productId)
  {
    var movements = db.StockMovements.Where(movement => movement.WarehouseId == warehouseId && movement.ProductId == productId);
    var quantity = await movements.SumAsync(movement => movement.QuantityIn - movement.QuantityOut);
    return await movements.SumAsync(movement => movement.QuantityIn * movement.UnitCostBase - movement.QuantityOut * movement.UnitCostBase) / quantity;
  }

  private static Task<decimal> AccountBalanceAsync(AppDbContext db, Guid accountId) =>
    db.JournalLines
      .Where(line => line.AccountId == accountId && line.JournalEntry.PostedAtUtc != null)
      .SumAsync(line => line.DebitBaseAmount - line.CreditBaseAmount);

  private sealed record TestData(
    Guid UserId,
    Guid SupplierId,
    Guid BranchId,
    Guid WarehouseId,
    Guid BaseCurrencyId,
    Guid ForeignCurrencyId,
    Guid UnitId,
    Guid ProductAId,
    Guid ProductBId,
    Guid InventoryAccountId,
    Guid PayableAccountId);
}
