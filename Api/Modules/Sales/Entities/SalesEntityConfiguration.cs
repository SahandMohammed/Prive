using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Sales;

public sealed class ServiceCategoryEntityConfiguration : IEntityTypeConfiguration<ServiceCategoryEntity>
{
  public void Configure(EntityTypeBuilder<ServiceCategoryEntity> builder)
  {
    builder.ToTable("service_categories");
    builder.HasKey(category => category.Id);
    builder.Property(category => category.Name).HasMaxLength(100).IsRequired();
    builder.HasIndex(category => category.Name).IsUnique();
  }
}

public sealed class ServiceEntityConfiguration : IEntityTypeConfiguration<ServiceEntity>
{
  public void Configure(EntityTypeBuilder<ServiceEntity> builder)
  {
    builder.ToTable("services");
    builder.HasKey(service => service.Id);
    builder.Property(service => service.Name).HasMaxLength(200).IsRequired();
    builder.Property(service => service.SellingPriceBase).HasPrecision(19, 4).IsRequired();
    builder.Property(service => service.Description).HasMaxLength(1000);
    builder.HasIndex(service => service.CategoryId);
    builder.HasIndex(service => service.RevenueAccountId);
    builder.HasOne(service => service.Category).WithMany(category => category.Services).HasForeignKey(service => service.CategoryId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(service => service.RevenueAccount).WithMany().HasForeignKey(service => service.RevenueAccountId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class SalesInvoiceEntityConfiguration : IEntityTypeConfiguration<SalesInvoiceEntity>
{
  public void Configure(EntityTypeBuilder<SalesInvoiceEntity> builder)
  {
    builder.ToTable("sales_invoices");
    builder.HasKey(invoice => invoice.Id);
    builder.Property(invoice => invoice.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.HasIndex(invoice => invoice.DocumentNumber).IsUnique();
    builder.Property(invoice => invoice.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(invoice => invoice.Subtotal).HasPrecision(19, 4).IsRequired();
    builder.Property(invoice => invoice.Total).HasPrecision(19, 4).IsRequired();
    builder.Property(invoice => invoice.BaseTotal).HasPrecision(19, 4).IsRequired();
    builder.Property(invoice => invoice.Status).HasConversion<string>().HasMaxLength(16).IsRequired().IsConcurrencyToken();
    builder.Property(invoice => invoice.Notes).HasMaxLength(1000);
    builder.HasIndex(invoice => new { invoice.InvoiceDate, invoice.Status });
    builder.HasIndex(invoice => invoice.CustomerId);
    builder.HasIndex(invoice => invoice.BranchId);
    builder.HasIndex(invoice => invoice.WarehouseId);
    builder.HasIndex(invoice => invoice.CurrencyId);
    builder.HasOne(invoice => invoice.Customer).WithMany().HasForeignKey(invoice => invoice.CustomerId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Branch).WithMany().HasForeignKey(invoice => invoice.BranchId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Warehouse).WithMany().HasForeignKey(invoice => invoice.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Currency).WithMany().HasForeignKey(invoice => invoice.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.BaseCurrency).WithMany().HasForeignKey(invoice => invoice.BaseCurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.CreatedByUser).WithMany().HasForeignKey(invoice => invoice.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.JournalEntry).WithOne(entry => entry.SourceSalesInvoice).HasForeignKey<SalesInvoiceEntity>(invoice => invoice.JournalEntryId).OnDelete(DeleteBehavior.Restrict);
    builder.HasIndex(invoice => invoice.JournalEntryId).IsUnique().HasFilter("\"JournalEntryId\" IS NOT NULL");
  }
}

public sealed class SalesInvoiceLineEntityConfiguration : IEntityTypeConfiguration<SalesInvoiceLineEntity>
{
  public void Configure(EntityTypeBuilder<SalesInvoiceLineEntity> builder)
  {
    builder.ToTable("sales_invoice_lines");
    builder.HasKey(line => line.Id);
    builder.Property(line => line.LineType).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.Property(line => line.Description).HasMaxLength(500);
    builder.Property(line => line.Quantity).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.UnitPrice).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.LineSubtotal).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.LineAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.BaseLineAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(line => new { line.SalesInvoiceId, line.ServiceId }).IsUnique().HasFilter("\"ServiceId\" IS NOT NULL");
    builder.HasIndex(line => new { line.SalesInvoiceId, line.ProductId }).IsUnique().HasFilter("\"ProductId\" IS NOT NULL");
    builder.HasOne(line => line.SalesInvoice).WithMany(invoice => invoice.Lines).HasForeignKey(line => line.SalesInvoiceId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.Service).WithMany(service => service.SalesInvoiceLines).HasForeignKey(line => line.ServiceId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.Product).WithMany().HasForeignKey(line => line.ProductId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.UnitOfMeasure).WithMany().HasForeignKey(line => line.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
  }
}
