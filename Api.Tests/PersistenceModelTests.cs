using Api.Modules.Finance;
using Api.Modules.Purchases;
using Api.Modules.Sales;
using Api.Modules.Settings;
using Api.Shared.Domain;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Api.Tests;

public sealed class PersistenceModelTests
{
  [Fact]
  public void FinalModel_HasOptionalInvoiceWarehousesAndExplicitPostingSettings()
  {
    using var db = CreateContext();

    Assert.True(db.Model.FindEntityType(typeof(SalesInvoiceEntity))!
      .FindProperty(nameof(SalesInvoiceEntity.WarehouseId))!.IsNullable);
    Assert.True(db.Model.FindEntityType(typeof(PurchaseInvoiceEntity))!
      .FindProperty(nameof(PurchaseInvoiceEntity.WarehouseId))!.IsNullable);

    var model = db.GetService<IDesignTimeModel>().Model;
    var settings = model.FindEntityType(typeof(BusinessSettingsEntity))!;
    Assert.False(settings.FindProperty(nameof(BusinessSettingsEntity.BaseCurrencyId))!.IsNullable);
    Assert.False(settings.FindProperty(nameof(BusinessSettingsEntity.DefaultReceivableAccountId))!.IsNullable);
    Assert.False(settings.FindProperty(nameof(BusinessSettingsEntity.DefaultPayableAccountId))!.IsNullable);
  }

  [Fact]
  public void FinalModel_HasNoLegacyContactFinanceColumnsAndHasContactBalanceIndex()
  {
    using var db = CreateContext();
    var contact = db.Model.FindEntityType(typeof(ContactEntity))!;
    Assert.Null(contact.FindProperty("AccountId"));
    Assert.Null(contact.FindProperty("OpeningBalance"));
    Assert.Null(contact.FindProperty("CurrentBalance"));

    var transaction = db.Model.FindEntityType(typeof(AccountTransactionEntity))!;
    Assert.Contains(transaction.GetIndexes(), index =>
      index.Properties.Select(property => property.Name).SequenceEqual([
        nameof(AccountTransactionEntity.ContactId),
        nameof(AccountTransactionEntity.AccountId),
        nameof(AccountTransactionEntity.TransactionDateUtc)]));
  }

  [Fact]
  public void Context_RejectsLedgerMutationBeforeDatabaseAccess()
  {
    using var db = CreateContext();
    var transaction = new AccountTransactionEntity
    {
      AccountId = Guid.NewGuid(),
      CurrencyId = Guid.NewGuid(),
      Amount = 1m,
      BaseAmount = 1m,
      SourceType = AccountTransactionSourceType.OpeningBalance,
      SourceId = Guid.NewGuid()
    };
    db.Attach(transaction);
    transaction.Description = "changed";

    var exception = Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
    Assert.Contains("append-only", exception.Message);
  }

  [Fact]
  public void Context_RejectsEditingPostedSourceDocumentBeforeDatabaseAccess()
  {
    using var db = CreateContext();
    var invoice = new SalesInvoiceEntity
    {
      CustomerId = Guid.NewGuid(),
      CurrencyId = Guid.NewGuid(),
      InvoiceNumber = "S-1",
      Status = DocumentStatus.Posted
    };
    db.Attach(invoice);
    invoice.Notes = "changed";

    var exception = Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
    Assert.Contains("immutable", exception.Message);
  }

  [Fact]
  public void FinalModel_HasCorrectPartialUniqueIndexes()
  {
    using var db = CreateContext();

    var itemUnits = db.Model.FindEntityType(typeof(ItemUnitOfMeasureEntity))!;
    var selling = itemUnits.GetIndexes().Single(index => index.GetDatabaseName() == "UX_ItemUnitsOfMeasure_DefaultSelling");
    var purchasing = itemUnits.GetIndexes().Single(index => index.GetDatabaseName() == "UX_ItemUnitsOfMeasure_DefaultPurchasing");
    Assert.True(selling.IsUnique);
    Assert.Equal([nameof(ItemUnitOfMeasureEntity.ItemId)], selling.Properties.Select(property => property.Name));
    Assert.Equal("\"IsDefaultForSelling\"", selling.GetFilter());
    Assert.True(purchasing.IsUnique);
    Assert.Equal([nameof(ItemUnitOfMeasureEntity.ItemId)], purchasing.Properties.Select(property => property.Name));
    Assert.Equal("\"IsDefaultForPurchasing\"", purchasing.GetFilter());

    var allocations = db.Model.FindEntityType(typeof(PaymentAllocationEntity))!;
    var activeSales = allocations.GetIndexes().Single(index => index.GetDatabaseName() == "UX_PaymentAllocations_ActiveVoucherSalesInvoice");
    var activePurchases = allocations.GetIndexes().Single(index => index.GetDatabaseName() == "UX_PaymentAllocations_ActiveVoucherPurchaseInvoice");
    Assert.True(activeSales.IsUnique);
    Assert.Contains("\"IsActive\"", activeSales.GetFilter());
    Assert.True(activePurchases.IsUnique);
    Assert.Contains("\"IsActive\"", activePurchases.GetFilter());
  }

  [Fact]
  public void FinalModel_HasSingletonCurrencyEnumAndSelfReferenceConstraints()
  {
    using var db = CreateContext();
    var model = db.GetService<IDesignTimeModel>().Model;

    var settings = model.FindEntityType(typeof(BusinessSettingsEntity))!;
    Assert.Contains(settings.GetCheckConstraints(), constraint => constraint.Name == "CK_BusinessSettings_Singleton");

    var currency = model.FindEntityType(typeof(CurrencyEntity))!;
    Assert.Contains(currency.GetIndexes(), index =>
      index.IsUnique && index.Properties.Select(property => property.Name).SequenceEqual([nameof(CurrencyEntity.Code)]));

    AssertHasCheck<SalesInvoiceEntity>(model, "CK_SalesInvoices_Status");
    AssertHasCheck<PurchaseInvoiceEntity>(model, "CK_PurchaseInvoices_Status");
    AssertHasCheck<FinancialVoucherEntity>(model, "CK_FinancialVouchers_Status");
    AssertHasCheck<SalesInvoiceEntity>(model, "CK_SalesInvoices_NotSelfReturn");
    AssertHasCheck<PurchaseInvoiceEntity>(model, "CK_PurchaseInvoices_NotSelfReturn");
    AssertHasCheck<AccountTransactionEntity>(model, "CK_AccountTransactions_NotSelfReversal");
    AssertHasCheck<AccountTransactionEntity>(model, "CK_AccountTransactions_BaseCurrencyAmounts");
  }

  [Fact]
  public void PostingRules_RequireCorrectContactRolesAndActiveVoucherState()
  {
    Assert.True(ContactPostingRules.IsActiveCustomer(new ContactEntity { Type = ContactType.Customer, IsActive = true }));
    Assert.True(ContactPostingRules.IsActiveVendor(new ContactEntity { Type = ContactType.CustomerAndVendor, IsActive = true }));
    Assert.False(ContactPostingRules.IsActiveCustomer(new ContactEntity { Type = ContactType.Vendor, IsActive = true }));
    Assert.False(ContactPostingRules.IsActiveVendor(new ContactEntity { Type = ContactType.Vendor, IsActive = false }));

    var voucher = new FinancialVoucherEntity
    {
      Type = FinancialVoucherType.Receipt,
      Status = DocumentStatus.Posted,
      PostedAtUtc = DateTime.UtcNow
    };
    Assert.True(voucher.CanAcceptPaymentAllocations);
    voucher.Type = FinancialVoucherType.Transfer;
    Assert.False(voucher.CanAcceptPaymentAllocations);
    voucher.Type = FinancialVoucherType.Receipt;
    voucher.VoidedAtUtc = DateTime.UtcNow;
    Assert.False(voucher.CanAcceptPaymentAllocations);
  }

  [Fact]
  public void FinancialLedger_RejectsDifferentAmountAndBaseAmount()
  {
    using var db = CreateContext();
    var service = new FinancialLedgerService(db);

    var exception = Assert.Throws<Api.Infrastructure.Http.BadRequestException>(() => service.AddMovements([
      new FinancialMovementRequest(
        Guid.NewGuid(),
        null,
        Guid.NewGuid(),
        10m,
        9m,
        DateTime.UtcNow,
        AccountTransactionSourceType.ManualAdjustment,
        Guid.NewGuid())
    ]));

    Assert.Contains("equal Amount and BaseAmount", exception.Message);
  }

  private static void AssertHasCheck<TEntity>(IModel model, string name) where TEntity : class =>
    Assert.Contains(model.FindEntityType(typeof(TEntity))!.GetCheckConstraints(), constraint => constraint.Name == name);

  private static AppDbContext CreateContext() => new(
    new DbContextOptionsBuilder<AppDbContext>()
      .UseNpgsql("Host=localhost;Database=unused;Username=unused;Password=unused")
      .Options);
}
