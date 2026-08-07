using Api.Modules.Finance;
using Api.Modules.Settings;
using Api.Shared.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Sales;

public sealed class SalesInvoiceEntity : IPostableDocument
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string InvoiceNumber { get; set; } = string.Empty;
  public Guid CustomerId { get; set; }
  public ContactEntity Customer { get; set; } = null!;
  public Guid? WarehouseId { get; set; }
  public WarehouseEntity? Warehouse { get; set; }
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public bool IsReturn { get; set; }
  public Guid? OriginalSalesInvoiceId { get; set; }
  public SalesInvoiceEntity? OriginalSalesInvoice { get; set; }
  public DateTime InvoiceDateUtc { get; set; }
  public DateTime? DueDateUtc { get; set; }
  public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
  public string? Notes { get; set; }
  public decimal Subtotal { get; set; }
  public decimal DiscountTotal { get; set; }
  public decimal Total { get; set; }
  public DateTime? PostedAtUtc { get; set; }
  public DateTime? VoidedAtUtc { get; set; }
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public ICollection<SalesInvoiceLineEntity> Lines { get; set; } = new List<SalesInvoiceLineEntity>();
  public ICollection<PaymentAllocationEntity> PaymentAllocations { get; set; } = new List<PaymentAllocationEntity>();
}

public sealed class SalesInvoiceLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid SalesInvoiceId { get; set; }
  public SalesInvoiceEntity SalesInvoice { get; set; } = null!;
  public Guid? OriginalSalesInvoiceLineId { get; set; }
  public SalesInvoiceLineEntity? OriginalSalesInvoiceLine { get; set; }
  public Guid ItemId { get; set; }
  public ItemEntity Item { get; set; } = null!;
  public string Description { get; set; } = string.Empty;
  public Guid UnitOfMeasureId { get; set; }
  public UnitOfMeasureEntity UnitOfMeasure { get; set; } = null!;
  public decimal Quantity { get; set; }
  public decimal ConversionFactor { get; set; } = 1m;
  public decimal UnitPrice { get; set; }
  public decimal DiscountAmount { get; set; }
  public decimal LineTotal { get; set; }
  public Guid SalesAccountId { get; set; }
  public AccountEntity SalesAccount { get; set; } = null!;
}

public sealed class SalesInvoiceEntityConfiguration : IEntityTypeConfiguration<SalesInvoiceEntity>
{
  public void Configure(EntityTypeBuilder<SalesInvoiceEntity> builder)
  {
    builder.ToTable("SalesInvoices", table =>
    {
      table.HasCheckConstraint("CK_SalesInvoices_ReturnLink", "(\"IsReturn\" AND \"OriginalSalesInvoiceId\" IS NOT NULL) OR (NOT \"IsReturn\" AND \"OriginalSalesInvoiceId\" IS NULL)");
      table.HasCheckConstraint("CK_SalesInvoices_Totals", "\"Subtotal\" >= 0 AND \"DiscountTotal\" >= 0 AND \"Total\" >= 0");
      table.HasCheckConstraint("CK_SalesInvoices_Status", "\"Status\" BETWEEN 1 AND 3");
      table.HasCheckConstraint("CK_SalesInvoices_NotSelfReturn", "\"OriginalSalesInvoiceId\" IS NULL OR \"OriginalSalesInvoiceId\" <> \"Id\"");
    });
    builder.Property(invoice => invoice.InvoiceNumber).HasMaxLength(50).IsRequired();
    builder.Property(invoice => invoice.Notes).HasMaxLength(2_000);
    builder.Property(invoice => invoice.Subtotal).HasPrecision(18, 6);
    builder.Property(invoice => invoice.DiscountTotal).HasPrecision(18, 6);
    builder.Property(invoice => invoice.Total).HasPrecision(18, 6);
    builder.HasIndex(invoice => invoice.InvoiceNumber).IsUnique();
    builder.HasIndex(invoice => new { invoice.CustomerId, invoice.InvoiceDateUtc });
    builder.HasIndex(invoice => invoice.OriginalSalesInvoiceId);
    builder.HasOne(invoice => invoice.Customer).WithMany().HasForeignKey(invoice => invoice.CustomerId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Warehouse).WithMany().HasForeignKey(invoice => invoice.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Currency).WithMany().HasForeignKey(invoice => invoice.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.OriginalSalesInvoice).WithMany().HasForeignKey(invoice => invoice.OriginalSalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class SalesInvoiceLineEntityConfiguration : IEntityTypeConfiguration<SalesInvoiceLineEntity>
{
  public void Configure(EntityTypeBuilder<SalesInvoiceLineEntity> builder)
  {
    builder.ToTable("SalesInvoiceLines", table =>
    {
      table.HasCheckConstraint("CK_SalesInvoiceLines_Amounts", "\"Quantity\" > 0 AND \"ConversionFactor\" > 0 AND \"UnitPrice\" >= 0 AND \"DiscountAmount\" >= 0 AND \"LineTotal\" >= 0");
      table.HasCheckConstraint("CK_SalesInvoiceLines_NotSelfReturn", "\"OriginalSalesInvoiceLineId\" IS NULL OR \"OriginalSalesInvoiceLineId\" <> \"Id\"");
    });
    builder.Property(line => line.Description).HasMaxLength(2_000).IsRequired();
    builder.Property(line => line.Quantity).HasPrecision(18, 6);
    builder.Property(line => line.ConversionFactor).HasPrecision(18, 6);
    builder.Property(line => line.UnitPrice).HasPrecision(18, 6);
    builder.Property(line => line.DiscountAmount).HasPrecision(18, 6);
    builder.Property(line => line.LineTotal).HasPrecision(18, 6);
    builder.HasIndex(line => line.OriginalSalesInvoiceLineId);
    builder.HasOne(line => line.SalesInvoice).WithMany(invoice => invoice.Lines).HasForeignKey(line => line.SalesInvoiceId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.OriginalSalesInvoiceLine).WithMany().HasForeignKey(line => line.OriginalSalesInvoiceLineId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.Item).WithMany().HasForeignKey(line => line.ItemId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.UnitOfMeasure).WithMany().HasForeignKey(line => line.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.SalesAccount).WithMany().HasForeignKey(line => line.SalesAccountId).OnDelete(DeleteBehavior.Restrict);
  }
}
