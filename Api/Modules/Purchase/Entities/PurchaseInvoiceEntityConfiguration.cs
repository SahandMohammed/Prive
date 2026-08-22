using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Purchase;

public sealed class PurchaseInvoiceEntityConfiguration : IEntityTypeConfiguration<PurchaseInvoiceEntity>
{
  public void Configure(EntityTypeBuilder<PurchaseInvoiceEntity> builder)
  {
    builder.ToTable("purchase_invoices");
    builder.HasKey(invoice => invoice.Id);
    builder.Property(invoice => invoice.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.HasIndex(invoice => invoice.DocumentNumber).IsUnique();
    builder.Property(invoice => invoice.SupplierReference).HasMaxLength(100);
    builder.Property(invoice => invoice.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(invoice => invoice.Subtotal).HasPrecision(19, 4).IsRequired();
    builder.Property(invoice => invoice.Total).HasPrecision(19, 4).IsRequired();
    builder.Property(invoice => invoice.BaseTotal).HasPrecision(19, 4).IsRequired();
    builder.Property(invoice => invoice.Status).HasConversion<string>().HasMaxLength(16).IsRequired().IsConcurrencyToken();
    builder.Property(invoice => invoice.Notes).HasMaxLength(1000);
    builder.HasIndex(invoice => new { invoice.InvoiceDate, invoice.Status });
    builder.HasIndex(invoice => invoice.SupplierId);
    builder.HasIndex(invoice => invoice.BranchId);
    builder.HasIndex(invoice => invoice.WarehouseId);
    builder.HasIndex(invoice => invoice.CurrencyId);
    builder.HasOne(invoice => invoice.Supplier).WithMany().HasForeignKey(invoice => invoice.SupplierId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Branch).WithMany().HasForeignKey(invoice => invoice.BranchId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Warehouse).WithMany().HasForeignKey(invoice => invoice.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Currency).WithMany().HasForeignKey(invoice => invoice.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.BaseCurrency).WithMany().HasForeignKey(invoice => invoice.BaseCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.CreatedByUser).WithMany().HasForeignKey(invoice => invoice.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.JournalEntry).WithOne(entry => entry.SourcePurchaseInvoice).HasForeignKey<PurchaseInvoiceEntity>(invoice => invoice.JournalEntryId).OnDelete(DeleteBehavior.Restrict);
    builder.HasIndex(invoice => invoice.JournalEntryId).IsUnique().HasFilter("\"JournalEntryId\" IS NOT NULL");
  }
}

public sealed class PurchaseInvoiceLineEntityConfiguration : IEntityTypeConfiguration<PurchaseInvoiceLineEntity>
{
  public void Configure(EntityTypeBuilder<PurchaseInvoiceLineEntity> builder)
  {
    builder.ToTable("purchase_invoice_lines");
    builder.HasKey(line => line.Id);
    builder.Property(line => line.Quantity).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.UnitCost).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.LineSubtotal).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.LineAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.BaseLineAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(line => new { line.PurchaseInvoiceId, line.ProductId }).IsUnique();
    builder.HasOne(line => line.PurchaseInvoice).WithMany(invoice => invoice.Lines).HasForeignKey(line => line.PurchaseInvoiceId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.Product).WithMany().HasForeignKey(line => line.ProductId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.UnitOfMeasure).WithMany().HasForeignKey(line => line.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
  }
}
