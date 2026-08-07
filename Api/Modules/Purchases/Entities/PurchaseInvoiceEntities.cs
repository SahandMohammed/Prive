using Api.Modules.Finance;
using Api.Modules.Settings;
using Api.Shared.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Purchases;

public sealed class PurchaseInvoiceEntity : IPostableDocument
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string InvoiceNumber { get; set; } = string.Empty;
  public string? VendorReferenceNumber { get; set; }
  public Guid VendorId { get; set; }
  public ContactEntity Vendor { get; set; } = null!;
  public Guid? WarehouseId { get; set; }
  public WarehouseEntity? Warehouse { get; set; }
  public Guid CurrencyId { get; set; }
  public CurrencyEntity Currency { get; set; } = null!;
  public bool IsReturn { get; set; }
  public Guid? OriginalPurchaseInvoiceId { get; set; }
  public PurchaseInvoiceEntity? OriginalPurchaseInvoice { get; set; }
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
  public ICollection<PurchaseInvoiceLineEntity> Lines { get; set; } = new List<PurchaseInvoiceLineEntity>();
  public ICollection<PaymentAllocationEntity> PaymentAllocations { get; set; } = new List<PaymentAllocationEntity>();
}

public sealed class PurchaseInvoiceLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid PurchaseInvoiceId { get; set; }
  public PurchaseInvoiceEntity PurchaseInvoice { get; set; } = null!;
  public Guid? OriginalPurchaseInvoiceLineId { get; set; }
  public PurchaseInvoiceLineEntity? OriginalPurchaseInvoiceLine { get; set; }
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
  public Guid PurchaseAccountId { get; set; }
  public AccountEntity PurchaseAccount { get; set; } = null!;
}

public sealed class PurchaseInvoiceEntityConfiguration : IEntityTypeConfiguration<PurchaseInvoiceEntity>
{
  public void Configure(EntityTypeBuilder<PurchaseInvoiceEntity> builder)
  {
    builder.ToTable("PurchaseInvoices", table =>
    {
      table.HasCheckConstraint("CK_PurchaseInvoices_ReturnLink", "(\"IsReturn\" AND \"OriginalPurchaseInvoiceId\" IS NOT NULL) OR (NOT \"IsReturn\" AND \"OriginalPurchaseInvoiceId\" IS NULL)");
      table.HasCheckConstraint("CK_PurchaseInvoices_Totals", "\"Subtotal\" >= 0 AND \"DiscountTotal\" >= 0 AND \"Total\" >= 0");
      table.HasCheckConstraint("CK_PurchaseInvoices_Status", "\"Status\" BETWEEN 1 AND 3");
      table.HasCheckConstraint("CK_PurchaseInvoices_NotSelfReturn", "\"OriginalPurchaseInvoiceId\" IS NULL OR \"OriginalPurchaseInvoiceId\" <> \"Id\"");
    });
    builder.Property(invoice => invoice.InvoiceNumber).HasMaxLength(50).IsRequired();
    builder.Property(invoice => invoice.VendorReferenceNumber).HasMaxLength(100);
    builder.Property(invoice => invoice.Notes).HasMaxLength(2_000);
    builder.Property(invoice => invoice.Subtotal).HasPrecision(18, 6);
    builder.Property(invoice => invoice.DiscountTotal).HasPrecision(18, 6);
    builder.Property(invoice => invoice.Total).HasPrecision(18, 6);
    builder.HasIndex(invoice => invoice.InvoiceNumber).IsUnique();
    builder.HasIndex(invoice => new { invoice.VendorId, invoice.InvoiceDateUtc });
    builder.HasIndex(invoice => invoice.OriginalPurchaseInvoiceId);
    builder.HasOne(invoice => invoice.Vendor).WithMany().HasForeignKey(invoice => invoice.VendorId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Warehouse).WithMany().HasForeignKey(invoice => invoice.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.Currency).WithMany().HasForeignKey(invoice => invoice.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(invoice => invoice.OriginalPurchaseInvoice).WithMany().HasForeignKey(invoice => invoice.OriginalPurchaseInvoiceId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PurchaseInvoiceLineEntityConfiguration : IEntityTypeConfiguration<PurchaseInvoiceLineEntity>
{
  public void Configure(EntityTypeBuilder<PurchaseInvoiceLineEntity> builder)
  {
    builder.ToTable("PurchaseInvoiceLines", table =>
    {
      table.HasCheckConstraint("CK_PurchaseInvoiceLines_Amounts", "\"Quantity\" > 0 AND \"ConversionFactor\" > 0 AND \"UnitPrice\" >= 0 AND \"DiscountAmount\" >= 0 AND \"LineTotal\" >= 0");
      table.HasCheckConstraint("CK_PurchaseInvoiceLines_NotSelfReturn", "\"OriginalPurchaseInvoiceLineId\" IS NULL OR \"OriginalPurchaseInvoiceLineId\" <> \"Id\"");
    });
    builder.Property(line => line.Description).HasMaxLength(2_000).IsRequired();
    builder.Property(line => line.Quantity).HasPrecision(18, 6);
    builder.Property(line => line.ConversionFactor).HasPrecision(18, 6);
    builder.Property(line => line.UnitPrice).HasPrecision(18, 6);
    builder.Property(line => line.DiscountAmount).HasPrecision(18, 6);
    builder.Property(line => line.LineTotal).HasPrecision(18, 6);
    builder.HasIndex(line => line.OriginalPurchaseInvoiceLineId);
    builder.HasOne(line => line.PurchaseInvoice).WithMany(invoice => invoice.Lines).HasForeignKey(line => line.PurchaseInvoiceId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.OriginalPurchaseInvoiceLine).WithMany().HasForeignKey(line => line.OriginalPurchaseInvoiceLineId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.Item).WithMany().HasForeignKey(line => line.ItemId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.UnitOfMeasure).WithMany().HasForeignKey(line => line.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.PurchaseAccount).WithMany().HasForeignKey(line => line.PurchaseAccountId).OnDelete(DeleteBehavior.Restrict);
  }
}
