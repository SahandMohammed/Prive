using Api.Modules.Purchases;
using Api.Modules.Sales;
using Api.Shared.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Finance;

public enum AccountTransactionSourceType
{
  SalesInvoice = 1,
  PurchaseInvoice = 2,
  FinancialVoucher = 3,
  OpeningBalance = 4,
  ManualAdjustment = 5,
  Reversal = 6
}

/// <summary>
/// Immutable signed financial movement. Account and contact balances are always
/// derived from SUM(BaseAmount); no mutable balance column is authoritative.
/// </summary>
public sealed class AccountTransactionEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid AccountId { get; set; }
  public AccountEntity Account { get; set; } = null!;
  public Guid? ContactId { get; set; }
  public ContactEntity? Contact { get; set; }
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public decimal Amount { get; set; }
  public decimal BaseAmount { get; set; }
  public DateTime TransactionDateUtc { get; set; }
  public AccountTransactionSourceType SourceType { get; set; }
  public Guid SourceId { get; set; }
  public string? Description { get; set; }
  public Guid? ReversesTransactionId { get; set; }
  public AccountTransactionEntity? ReversesTransaction { get; set; }
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class FinancialVoucherEntity : IPostableDocument
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string VoucherNumber { get; set; } = string.Empty;
  public FinancialVoucherType Type { get; set; }
  public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
  public DateTime VoucherDateUtc { get; set; }
  /// <summary>Cash/bank account for receipts/payments; source account for transfers.</summary>
  public Guid AccountId { get; set; }
  public AccountEntity Account { get; set; } = null!;
  /// <summary>Receivable/payable/expense account, or destination account for transfers.</summary>
  public Guid CounterpartyAccountId { get; set; }
  public AccountEntity CounterpartyAccount { get; set; } = null!;
  public Guid? ContactId { get; set; }
  public ContactEntity? Contact { get; set; }
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public decimal Amount { get; set; }
  public string? Description { get; set; }
  public string? ReferenceNumber { get; set; }
  public DateTime? PostedAtUtc { get; set; }
  public DateTime? VoidedAtUtc { get; set; }
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public ICollection<PaymentAllocationEntity> Allocations { get; set; } = new List<PaymentAllocationEntity>();

  public bool CanAcceptPaymentAllocations =>
    Status == DocumentStatus.Posted &&
    PostedAtUtc.HasValue &&
    !VoidedAtUtc.HasValue &&
    Type != FinancialVoucherType.Transfer;
}

/// <summary>Settlement metadata only. Creating or changing it never posts money.</summary>
public sealed class PaymentAllocationEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid FinancialVoucherId { get; set; }
  public FinancialVoucherEntity FinancialVoucher { get; set; } = null!;
  public Guid? SalesInvoiceId { get; set; }
  public SalesInvoiceEntity? SalesInvoice { get; set; }
  public Guid? PurchaseInvoiceId { get; set; }
  public PurchaseInvoiceEntity? PurchaseInvoice { get; set; }
  public decimal AllocatedAmount { get; set; }
  public bool IsActive { get; set; } = true;
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class AccountEntityConfiguration : IEntityTypeConfiguration<AccountEntity>
{
  public void Configure(EntityTypeBuilder<AccountEntity> builder)
  {
    builder.ToTable("Accounts", table =>
    {
      table.HasCheckConstraint("CK_Accounts_Category", "\"Category\" IN (1000, 2000, 3000, 4000, 5000)");
      table.HasCheckConstraint("CK_Accounts_Type", "\"Type\" BETWEEN 0 AND 7");
      table.HasCheckConstraint("CK_Accounts_NotSelfParent", "\"ParentAccountId\" IS NULL OR \"ParentAccountId\" <> \"Id\"");
    });
    builder.Property(account => account.Code).HasMaxLength(50).IsRequired();
    builder.Property(account => account.Name).HasMaxLength(200).IsRequired();
    builder.HasIndex(account => account.Code).IsUnique();
  }
}

public sealed class AccountTransactionEntityConfiguration : IEntityTypeConfiguration<AccountTransactionEntity>
{
  public void Configure(EntityTypeBuilder<AccountTransactionEntity> builder)
  {
    builder.ToTable("AccountTransactions", table =>
    {
      table.HasCheckConstraint("CK_AccountTransactions_NonZero", "\"Amount\" <> 0 AND \"BaseAmount\" <> 0");
      table.HasCheckConstraint("CK_AccountTransactions_BaseCurrencyAmounts", "\"Amount\" = \"BaseAmount\"");
      table.HasCheckConstraint("CK_AccountTransactions_SourceType", "\"SourceType\" BETWEEN 1 AND 6");
      table.HasCheckConstraint("CK_AccountTransactions_NotSelfReversal", "\"ReversesTransactionId\" IS NULL OR \"ReversesTransactionId\" <> \"Id\"");
    });
    builder.Property(transaction => transaction.Amount).HasPrecision(18, 6);
    builder.Property(transaction => transaction.BaseAmount).HasPrecision(18, 6);
    builder.Property(transaction => transaction.Description).HasMaxLength(2_000);
    builder.HasIndex(transaction => new { transaction.AccountId, transaction.TransactionDateUtc });
    builder.HasIndex(transaction => new { transaction.ContactId, transaction.TransactionDateUtc });
    builder.HasIndex(transaction => new { transaction.ContactId, transaction.AccountId, transaction.TransactionDateUtc });
    builder.HasIndex(transaction => new { transaction.SourceType, transaction.SourceId });
    builder.HasIndex(transaction => transaction.ReversesTransactionId)
      .IsUnique()
      .HasFilter("\"ReversesTransactionId\" IS NOT NULL");
    builder.HasOne(transaction => transaction.Account).WithMany().HasForeignKey(transaction => transaction.AccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transaction => transaction.Contact).WithMany().HasForeignKey(transaction => transaction.ContactId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transaction => transaction.Currency).WithMany().HasForeignKey(transaction => transaction.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transaction => transaction.ReversesTransaction).WithMany().HasForeignKey(transaction => transaction.ReversesTransactionId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class FinancialVoucherEntityConfiguration : IEntityTypeConfiguration<FinancialVoucherEntity>
{
  public void Configure(EntityTypeBuilder<FinancialVoucherEntity> builder)
  {
    builder.ToTable("FinancialVouchers", table =>
    {
      table.HasCheckConstraint("CK_FinancialVouchers_Amount", "\"Amount\" > 0");
      table.HasCheckConstraint("CK_FinancialVouchers_DifferentAccounts", "\"AccountId\" <> \"CounterpartyAccountId\"");
      table.HasCheckConstraint("CK_FinancialVouchers_TransferContact", "\"Type\" <> 3 OR \"ContactId\" IS NULL");
      table.HasCheckConstraint("CK_FinancialVouchers_Type", "\"Type\" BETWEEN 1 AND 3");
      table.HasCheckConstraint("CK_FinancialVouchers_Status", "\"Status\" BETWEEN 1 AND 3");
    });
    builder.Property(voucher => voucher.VoucherNumber).HasMaxLength(50).IsRequired();
    builder.Property(voucher => voucher.Amount).HasPrecision(18, 6);
    builder.Property(voucher => voucher.Description).HasMaxLength(2_000);
    builder.Property(voucher => voucher.ReferenceNumber).HasMaxLength(100);
    builder.HasIndex(voucher => voucher.VoucherNumber).IsUnique();
    builder.HasIndex(voucher => new { voucher.Type, voucher.Status, voucher.VoucherDateUtc });
    builder.HasOne(voucher => voucher.Account).WithMany().HasForeignKey(voucher => voucher.AccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(voucher => voucher.CounterpartyAccount).WithMany().HasForeignKey(voucher => voucher.CounterpartyAccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(voucher => voucher.Contact).WithMany().HasForeignKey(voucher => voucher.ContactId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(voucher => voucher.Currency).WithMany().HasForeignKey(voucher => voucher.CurrencyId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PaymentAllocationEntityConfiguration : IEntityTypeConfiguration<PaymentAllocationEntity>
{
  public void Configure(EntityTypeBuilder<PaymentAllocationEntity> builder)
  {
    builder.ToTable("PaymentAllocations", table =>
    {
      table.HasCheckConstraint("CK_PaymentAllocations_Positive", "\"AllocatedAmount\" > 0");
      table.HasCheckConstraint("CK_PaymentAllocations_OneInvoice", "(\"SalesInvoiceId\" IS NOT NULL AND \"PurchaseInvoiceId\" IS NULL) OR (\"SalesInvoiceId\" IS NULL AND \"PurchaseInvoiceId\" IS NOT NULL)");
    });
    builder.Property(allocation => allocation.AllocatedAmount).HasPrecision(18, 6);
    builder.HasIndex(allocation => allocation.FinancialVoucherId);
    builder.HasIndex(allocation => allocation.SalesInvoiceId);
    builder.HasIndex(allocation => allocation.PurchaseInvoiceId);
    builder.HasIndex(
        allocation => new { allocation.FinancialVoucherId, allocation.SalesInvoiceId },
        "UX_PaymentAllocations_ActiveVoucherSalesInvoice")
      .IsUnique()
      .HasFilter("\"IsActive\" AND \"SalesInvoiceId\" IS NOT NULL");
    builder.HasIndex(
        allocation => new { allocation.FinancialVoucherId, allocation.PurchaseInvoiceId },
        "UX_PaymentAllocations_ActiveVoucherPurchaseInvoice")
      .IsUnique()
      .HasFilter("\"IsActive\" AND \"PurchaseInvoiceId\" IS NOT NULL");
    builder.HasOne(allocation => allocation.FinancialVoucher).WithMany(voucher => voucher.Allocations).HasForeignKey(allocation => allocation.FinancialVoucherId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(allocation => allocation.SalesInvoice).WithMany(invoice => invoice.PaymentAllocations).HasForeignKey(allocation => allocation.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(allocation => allocation.PurchaseInvoice).WithMany(invoice => invoice.PaymentAllocations).HasForeignKey(allocation => allocation.PurchaseInvoiceId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class CurrencyEntityConfiguration : IEntityTypeConfiguration<CurrencyEntity>
{
  public void Configure(EntityTypeBuilder<CurrencyEntity> builder)
  {
    builder.ToTable("Currencies", table =>
      table.HasCheckConstraint("CK_Currencies_ExchangeRate", "\"ExchangeRate\" > 0"));
    builder.Property(currency => currency.Code).HasMaxLength(3).IsRequired();
    builder.Property(currency => currency.Name).HasMaxLength(100).IsRequired();
    builder.Property(currency => currency.Symbol).HasMaxLength(10).IsRequired();
    builder.HasIndex(currency => currency.Code).IsUnique();
  }
}
