using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Finance;

public sealed class MoneyAccountEntityConfiguration : IEntityTypeConfiguration<MoneyAccountEntity>
{
  public void Configure(EntityTypeBuilder<MoneyAccountEntity> builder)
  {
    builder.ToTable("money_accounts");
    builder.HasKey(account => account.Id);
    builder.HasAlternateKey(account => new { account.Id, account.BranchId, account.CurrencyId });
    builder.Property(account => account.Code).HasMaxLength(32).IsRequired();
    builder.HasIndex(account => account.Code).IsUnique();
    builder.Property(account => account.Name).HasMaxLength(200).IsRequired();
    builder.Property(account => account.Type).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.Property(account => account.Notes).HasMaxLength(1000);
    builder.Property(account => account.BankName).HasMaxLength(200);
    builder.Property(account => account.AccountNumberOrIban).HasMaxLength(100);
    builder.HasIndex(account => account.BranchId);
    builder.HasIndex(account => account.CurrencyId);
    builder.HasIndex(account => account.AccountingAccountId).IsUnique();
    builder.HasOne(account => account.Branch).WithMany().HasForeignKey(account => account.BranchId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(account => account.Currency).WithMany().HasForeignKey(account => account.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(account => account.AccountingAccount).WithMany().HasForeignKey(account => account.AccountingAccountId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class MoneyAccountAccessEntityConfiguration : IEntityTypeConfiguration<MoneyAccountAccessEntity>
{
  public void Configure(EntityTypeBuilder<MoneyAccountAccessEntity> builder)
  {
    builder.ToTable("money_account_access");
    builder.HasKey(access => access.Id);
    builder.Property(access => access.AccessLevel).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.HasIndex(access => new { access.MoneyAccountId, access.UserId }).IsUnique();
    builder.HasOne(access => access.MoneyAccount).WithMany(account => account.AccessAssignments).HasForeignKey(access => access.MoneyAccountId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(access => access.User).WithMany().HasForeignKey(access => access.UserId).OnDelete(DeleteBehavior.Cascade);
  }
}

public sealed class MoneyLedgerEntryEntityConfiguration : IEntityTypeConfiguration<MoneyLedgerEntryEntity>
{
  public void Configure(EntityTypeBuilder<MoneyLedgerEntryEntity> builder)
  {
    builder.ToTable("money_ledger_entries");
    builder.HasKey(entry => entry.Id);
    builder.Property(entry => entry.SourceType).HasConversion<string>().HasMaxLength(32).IsRequired();
    builder.Property(entry => entry.DocumentNumber).HasMaxLength(32).IsRequired();
    builder.Property(entry => entry.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(entry => entry.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(entry => entry.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(entry => entry.Notes).HasMaxLength(1000);
    builder.HasIndex(entry => new { entry.MoneyAccountId, entry.MovementDate });
    builder.HasIndex(entry => new { entry.SourceType, entry.SourceDocumentId });
    builder.HasIndex(entry => entry.JournalEntryId);
    builder.HasOne(entry => entry.MoneyAccount).WithMany(account => account.LedgerEntries).HasForeignKey(entry => entry.MoneyAccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(entry => entry.Currency).WithMany().HasForeignKey(entry => entry.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(entry => entry.BaseCurrency).WithMany().HasForeignKey(entry => entry.BaseCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(entry => entry.JournalEntry).WithMany().HasForeignKey(entry => entry.JournalEntryId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(entry => entry.PerformedByUser).WithMany().HasForeignKey(entry => entry.PerformedByUserId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PaymentEntityConfiguration : IEntityTypeConfiguration<PaymentEntity>
{
  public void Configure(EntityTypeBuilder<PaymentEntity> builder)
  {
    builder.ToTable("payments", table =>
    {
      table.HasCheckConstraint("CK_payments_amounts", "\"Amount\" > 0 AND \"BaseAmount\" > 0");
      table.HasCheckConstraint("CK_payments_origin_source", "(\"Origin\" = 'CustomerReceipt' AND \"SourceSalesInvoiceId\" IS NULL) OR (\"Origin\" IN ('SalesInvoice', 'Pos') AND \"SourceSalesInvoiceId\" IS NOT NULL)");
      table.HasCheckConstraint("CK_payments_delete_metadata", "(\"IsDeleted\" = false AND \"DeletedAtUtc\" IS NULL AND \"DeletedByUserId\" IS NULL AND \"DeleteReason\" IS NULL) OR (\"IsDeleted\" = true AND \"DeletedAtUtc\" IS NOT NULL AND \"DeletedByUserId\" IS NOT NULL AND \"DeleteReason\" IS NOT NULL)");
      table.HasCheckConstraint("CK_payments_journal_state", "(\"IsDeleted\" = false AND \"JournalEntryId\" IS NOT NULL) OR (\"IsDeleted\" = true AND \"JournalEntryId\" IS NULL)");
    });
    builder.HasKey(payment => payment.Id);
    builder.Property(payment => payment.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.HasIndex(payment => payment.DocumentNumber).IsUnique();
    builder.Property(payment => payment.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(payment => payment.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(payment => payment.Origin).HasConversion<string>().HasMaxLength(24).IsRequired();
    builder.Property(payment => payment.Notes).HasMaxLength(1000);
    builder.Property(payment => payment.DeleteReason).HasMaxLength(1000);
    builder.Property(payment => payment.UpdatedAtUtc).IsConcurrencyToken();
    builder.HasIndex(payment => new { payment.BranchId, payment.PaymentDate });
    builder.HasIndex(payment => payment.CustomerId);
    builder.HasIndex(payment => payment.SourceSalesInvoiceId)
      .HasFilter("\"SourceSalesInvoiceId\" IS NOT NULL");
    builder.HasIndex(payment => payment.JournalEntryId).IsUnique().HasFilter("\"JournalEntryId\" IS NOT NULL");
    builder.HasOne(payment => payment.Branch).WithMany().HasForeignKey(payment => payment.BranchId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.Customer).WithMany().HasForeignKey(payment => payment.CustomerId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.Currency).WithMany().HasForeignKey(payment => payment.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.BaseCurrency).WithMany().HasForeignKey(payment => payment.BaseCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.SourceSalesInvoice).WithMany().HasForeignKey(payment => payment.SourceSalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.CreatedByUser).WithMany().HasForeignKey(payment => payment.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.DeletedByUser).WithMany().HasForeignKey(payment => payment.DeletedByUserId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.JournalEntry).WithOne(journal => journal.SourcePayment)
      .HasForeignKey<PaymentEntity>(payment => payment.JournalEntryId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PaymentAllocationEntityConfiguration : IEntityTypeConfiguration<PaymentAllocationEntity>
{
  public void Configure(EntityTypeBuilder<PaymentAllocationEntity> builder)
  {
    builder.ToTable("payment_allocations", table =>
      table.HasCheckConstraint("CK_payment_allocations_amounts", "\"Amount\" > 0 AND \"BaseAmount\" > 0"));
    builder.HasKey(allocation => allocation.Id);
    builder.Property(allocation => allocation.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(allocation => allocation.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(allocation => new { allocation.PaymentId, allocation.SalesInvoiceId }).IsUnique();
    builder.HasIndex(allocation => allocation.SalesInvoiceId);
    builder.HasOne(allocation => allocation.Payment).WithMany(payment => payment.Allocations)
      .HasForeignKey(allocation => allocation.PaymentId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(allocation => allocation.SalesInvoice).WithMany(invoice => invoice.PaymentAllocations)
      .HasForeignKey(allocation => allocation.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PaymentMoneyLineEntityConfiguration : IEntityTypeConfiguration<PaymentMoneyLineEntity>
{
  public void Configure(EntityTypeBuilder<PaymentMoneyLineEntity> builder)
  {
    builder.ToTable("payment_money_lines", table =>
    {
      table.HasCheckConstraint("CK_payment_money_lines_amounts", "\"Amount\" > 0 AND \"ExchangeRate\" > 0 AND \"BaseAmount\" > 0");
      table.HasCheckConstraint("CK_payment_money_lines_sequence", "\"Sequence\" > 0");
    });
    builder.HasKey(line => line.Id);
    builder.Property(line => line.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(line => line.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.Direction).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.HasIndex(line => new { line.PaymentId, line.Sequence }).IsUnique();
    builder.HasIndex(line => line.MoneyAccountId);
    builder.HasIndex(line => line.MoneyLedgerEntryId).IsUnique();
    builder.HasOne(line => line.Payment).WithMany(payment => payment.MoneyLines)
      .HasForeignKey(line => line.PaymentId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.MoneyAccount).WithMany().HasForeignKey(line => line.MoneyAccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.Currency).WithMany().HasForeignKey(line => line.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.MoneyLedgerEntry).WithMany().HasForeignKey(line => line.MoneyLedgerEntryId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PaymentDocumentCounterEntityConfiguration : IEntityTypeConfiguration<PaymentDocumentCounterEntity>
{
  public void Configure(EntityTypeBuilder<PaymentDocumentCounterEntity> builder)
  {
    builder.ToTable("payment_document_counters");
    builder.HasKey(counter => counter.Id);
    builder.HasData(new PaymentDocumentCounterEntity { Id = 1, NextValue = 1 });
  }
}

public sealed class ExchangeRateEntityConfiguration : IEntityTypeConfiguration<ExchangeRateEntity>
{
  public void Configure(EntityTypeBuilder<ExchangeRateEntity> builder)
  {
    builder.ToTable("exchange_rates");
    builder.HasKey(rate => rate.Id);
    builder.Property(rate => rate.Rate).HasPrecision(19, 6).IsRequired();
    builder.HasIndex(rate => new { rate.FromCurrencyId, rate.ToCurrencyId, rate.EffectiveAtUtc }).IsUnique();
    builder.HasOne(rate => rate.FromCurrency).WithMany().HasForeignKey(rate => rate.FromCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(rate => rate.ToCurrency).WithMany().HasForeignKey(rate => rate.ToCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(rate => rate.CreatedByUser).WithMany().HasForeignKey(rate => rate.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class MoneyTransferEntityConfiguration : IEntityTypeConfiguration<MoneyTransferEntity>
{
  public void Configure(EntityTypeBuilder<MoneyTransferEntity> builder)
  {
    builder.ToTable("money_transfers");
    builder.HasKey(transfer => transfer.Id);
    builder.Property(transfer => transfer.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.HasIndex(transfer => transfer.DocumentNumber).IsUnique();
    builder.Property(transfer => transfer.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(transfer => transfer.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(transfer => transfer.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(transfer => transfer.Status).HasConversion<string>().HasMaxLength(16).IsRequired().IsConcurrencyToken();
    builder.Property(transfer => transfer.Notes).HasMaxLength(1000);
    builder.HasIndex(transfer => new { transfer.TransferDate, transfer.Status });
    builder.HasOne(transfer => transfer.SourceMoneyAccount).WithMany().HasForeignKey(transfer => transfer.SourceMoneyAccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transfer => transfer.DestinationMoneyAccount).WithMany().HasForeignKey(transfer => transfer.DestinationMoneyAccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transfer => transfer.Currency).WithMany().HasForeignKey(transfer => transfer.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transfer => transfer.BaseCurrency).WithMany().HasForeignKey(transfer => transfer.BaseCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transfer => transfer.CreatedByUser).WithMany().HasForeignKey(transfer => transfer.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transfer => transfer.JournalEntry).WithOne(entry => entry.SourceMoneyTransfer).HasForeignKey<MoneyTransferEntity>(transfer => transfer.JournalEntryId).OnDelete(DeleteBehavior.Restrict);
    builder.HasIndex(transfer => transfer.JournalEntryId).IsUnique().HasFilter("\"JournalEntryId\" IS NOT NULL");
  }
}

public sealed class SupplierPaymentEntityConfiguration : IEntityTypeConfiguration<SupplierPaymentEntity>
{
  public void Configure(EntityTypeBuilder<SupplierPaymentEntity> builder)
  {
    builder.ToTable("supplier_payments");
    builder.HasKey(payment => payment.Id);
    builder.Property(payment => payment.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.HasIndex(payment => payment.DocumentNumber).IsUnique();
    builder.Property(payment => payment.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(payment => payment.TotalAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(payment => payment.BaseTotalAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(payment => payment.Status).HasConversion<string>().HasMaxLength(16).IsRequired().IsConcurrencyToken();
    builder.Property(payment => payment.Notes).HasMaxLength(1000);
    builder.HasIndex(payment => new { payment.PaymentDate, payment.Status });
    builder.HasIndex(payment => payment.SupplierId);
    builder.HasOne(payment => payment.Supplier).WithMany().HasForeignKey(payment => payment.SupplierId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.MoneyAccount).WithMany().HasForeignKey(payment => payment.MoneyAccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.Currency).WithMany().HasForeignKey(payment => payment.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.BaseCurrency).WithMany().HasForeignKey(payment => payment.BaseCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.CreatedByUser).WithMany().HasForeignKey(payment => payment.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(payment => payment.JournalEntry).WithOne(entry => entry.SourceSupplierPayment).HasForeignKey<SupplierPaymentEntity>(payment => payment.JournalEntryId).OnDelete(DeleteBehavior.Restrict);
    builder.HasIndex(payment => payment.JournalEntryId).IsUnique().HasFilter("\"JournalEntryId\" IS NOT NULL");
  }
}

public sealed class SupplierPaymentAllocationEntityConfiguration : IEntityTypeConfiguration<SupplierPaymentAllocationEntity>
{
  public void Configure(EntityTypeBuilder<SupplierPaymentAllocationEntity> builder)
  {
    builder.ToTable("supplier_payment_allocations");
    builder.HasKey(allocation => allocation.Id);
    builder.Property(allocation => allocation.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(allocation => allocation.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(allocation => new { allocation.SupplierPaymentId, allocation.PurchaseInvoiceId }).IsUnique();
    builder.HasIndex(allocation => allocation.PurchaseInvoiceId);
    builder.HasOne(allocation => allocation.SupplierPayment).WithMany(payment => payment.Allocations).HasForeignKey(allocation => allocation.SupplierPaymentId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(allocation => allocation.PurchaseInvoice).WithMany().HasForeignKey(allocation => allocation.PurchaseInvoiceId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class CustomerReceiptEntityConfiguration : IEntityTypeConfiguration<CustomerReceiptEntity>
{
  public void Configure(EntityTypeBuilder<CustomerReceiptEntity> builder)
  {
    builder.ToTable("customer_receipts", table => table.HasCheckConstraint(
      "CK_customer_receipts_posting_state",
      "(\"Status\" = 'Draft' AND \"PaymentId\" IS NULL) OR (\"Status\" = 'Posted' AND \"PaymentId\" IS NOT NULL)"));
    builder.HasKey(receipt => receipt.Id);
    builder.Property(receipt => receipt.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.HasIndex(receipt => receipt.DocumentNumber).IsUnique();
    builder.Property(receipt => receipt.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(receipt => receipt.TotalAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(receipt => receipt.BaseTotalAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(receipt => receipt.Status).HasConversion<string>().HasMaxLength(16).IsRequired().IsConcurrencyToken();
    builder.Property(receipt => receipt.Notes).HasMaxLength(1000);
    builder.HasIndex(receipt => new { receipt.ReceiptDate, receipt.Status });
    builder.HasIndex(receipt => receipt.CustomerId);
    builder.HasIndex(receipt => receipt.MoneyAccountId);
    builder.HasIndex(receipt => receipt.CurrencyId);
    builder.HasOne(receipt => receipt.Customer).WithMany().HasForeignKey(receipt => receipt.CustomerId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(receipt => receipt.MoneyAccount).WithMany().HasForeignKey(receipt => receipt.MoneyAccountId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(receipt => receipt.Currency).WithMany().HasForeignKey(receipt => receipt.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(receipt => receipt.BaseCurrency).WithMany().HasForeignKey(receipt => receipt.BaseCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(receipt => receipt.CreatedByUser).WithMany().HasForeignKey(receipt => receipt.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    builder.Property(receipt => receipt.DeleteReason).HasMaxLength(1000);
    builder.HasOne(receipt => receipt.Payment).WithOne(payment => payment.SourceCustomerReceipt)
      .HasForeignKey<CustomerReceiptEntity>(receipt => receipt.PaymentId).OnDelete(DeleteBehavior.Restrict);
    builder.HasIndex(receipt => receipt.PaymentId).IsUnique().HasFilter("\"PaymentId\" IS NOT NULL");
    builder.HasOne(receipt => receipt.DeletedByUser).WithMany().HasForeignKey(receipt => receipt.DeletedByUserId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class CustomerReceiptDraftAllocationEntityConfiguration : IEntityTypeConfiguration<CustomerReceiptDraftAllocationEntity>
{
  public void Configure(EntityTypeBuilder<CustomerReceiptDraftAllocationEntity> builder)
  {
    builder.ToTable("customer_receipt_draft_allocations");
    builder.HasKey(allocation => allocation.Id);
    builder.Property(allocation => allocation.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(allocation => allocation.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(allocation => new { allocation.CustomerReceiptId, allocation.SalesInvoiceId }).IsUnique();
    builder.HasIndex(allocation => allocation.SalesInvoiceId);
    builder.HasOne(allocation => allocation.CustomerReceipt).WithMany(receipt => receipt.DraftAllocations)
      .HasForeignKey(allocation => allocation.CustomerReceiptId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(allocation => allocation.SalesInvoice).WithMany(invoice => invoice.ReceiptDraftAllocations)
      .HasForeignKey(allocation => allocation.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
  }
}
