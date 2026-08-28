using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Inventory;

public sealed class ProductCategoryEntityConfiguration : IEntityTypeConfiguration<ProductCategoryEntity>
{
  public void Configure(EntityTypeBuilder<ProductCategoryEntity> b)
  {
    b.ToTable("product_categories"); b.HasKey(x => x.Id); b.Property(x => x.Name).HasMaxLength(100).IsRequired(); b.HasIndex(x => x.Name).IsUnique();
  }
}

public sealed class ProductSubcategoryEntityConfiguration : IEntityTypeConfiguration<ProductSubcategoryEntity>
{
  public void Configure(EntityTypeBuilder<ProductSubcategoryEntity> b)
  {
    b.ToTable("product_subcategories");
    b.HasKey(x => x.Id);
    b.Property(x => x.Name).HasMaxLength(100).IsRequired();
    b.HasIndex(x => new { x.CategoryId, x.Name }).IsUnique();
    b.HasOne(x => x.Category).WithMany(x => x.Subcategories).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class UnitOfMeasureEntityConfiguration : IEntityTypeConfiguration<UnitOfMeasureEntity>
{
  public void Configure(EntityTypeBuilder<UnitOfMeasureEntity> b)
  {
    b.ToTable("units_of_measure"); b.HasKey(x => x.Id); b.Property(x => x.Name).HasMaxLength(100).IsRequired(); b.Property(x => x.Code).HasMaxLength(20).IsRequired(); b.HasIndex(x => x.Code).IsUnique();
  }
}

public sealed class ProductEntityConfiguration : IEntityTypeConfiguration<ProductEntity>
{
  public void Configure(EntityTypeBuilder<ProductEntity> b)
  {
    b.ToTable("products"); b.HasKey(x => x.Id); b.Property(x => x.Name).HasMaxLength(250).IsRequired(); b.Property(x => x.SKU).HasMaxLength(64).IsRequired(); b.HasIndex(x => x.SKU).IsUnique(); b.Property(x => x.Barcode).HasMaxLength(64); b.HasIndex(x => x.Barcode).IsUnique().HasFilter("\"Barcode\" IS NOT NULL"); b.Property(x => x.Purpose).HasConversion<string>().HasMaxLength(20).IsRequired(); b.Property(x => x.PurchasePriceBase).HasPrecision(19, 4).IsRequired(); b.Property(x => x.SellingPriceBase).HasPrecision(19, 4).IsRequired(); b.Property(x => x.Description).HasMaxLength(1000); b.Property(x => x.ImageReference).HasMaxLength(2048); b.HasOne(x => x.Category).WithMany(x => x.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.Subcategory).WithMany(x => x.Products).HasForeignKey(x => x.SubcategoryId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.UnitOfMeasure).WithMany(x => x.Products).HasForeignKey(x => x.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class ProductUnitConversionEntityConfiguration : IEntityTypeConfiguration<ProductUnitConversionEntity>
{
  public void Configure(EntityTypeBuilder<ProductUnitConversionEntity> b)
  {
    b.ToTable("product_unit_conversions");
    b.HasKey(x => x.Id);
    b.Property(x => x.Operation).HasConversion<string>().HasMaxLength(16).IsRequired();
    b.Property(x => x.Factor).HasPrecision(19, 6).IsRequired();
    b.HasIndex(x => new { x.ProductId, x.UnitOfMeasureId }).IsUnique();
    b.HasOne(x => x.Product).WithMany(x => x.UnitConversions).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
    b.HasOne(x => x.UnitOfMeasure).WithMany(x => x.ProductConversions).HasForeignKey(x => x.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class WarehouseEntityConfiguration : IEntityTypeConfiguration<WarehouseEntity>
{
  public void Configure(EntityTypeBuilder<WarehouseEntity> b)
  {
    b.ToTable("warehouses"); b.HasKey(x => x.Id); b.Property(x => x.Code).HasMaxLength(32).IsRequired(); b.HasIndex(x => x.Code).IsUnique(); b.Property(x => x.Name).HasMaxLength(200).IsRequired(); b.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict); b.HasIndex(x => x.BranchId);
  }
}

public sealed class OpeningStockDocumentEntityConfiguration : IEntityTypeConfiguration<OpeningStockDocumentEntity>
{
  public void Configure(EntityTypeBuilder<OpeningStockDocumentEntity> b)
  {
    b.ToTable("opening_stock_documents"); b.HasKey(x => x.Id); ConfigureDocument(b); b.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);
  }

  private static void ConfigureDocument(EntityTypeBuilder<OpeningStockDocumentEntity> b)
  {
    b.Property(x => x.DocumentNumber).HasMaxLength(20).IsRequired(); b.HasIndex(x => x.DocumentNumber).IsUnique(); b.Property(x => x.Status).HasConversion<string>().HasMaxLength(16).IsRequired(); b.Property(x => x.Notes).HasMaxLength(1000); b.HasIndex(x => new { x.DocumentDate, x.Status }); b.HasIndex(x => x.BranchId); b.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class OpeningStockLineEntityConfiguration : IEntityTypeConfiguration<OpeningStockLineEntity>
{
  public void Configure(EntityTypeBuilder<OpeningStockLineEntity> b)
  {
    b.ToTable("opening_stock_lines"); b.HasKey(x => x.Id); b.Property(x => x.Quantity).HasPrecision(19, 4).IsRequired(); b.Property(x => x.UnitCostBase).HasPrecision(19, 4).IsRequired(); b.HasIndex(x => new { x.OpeningStockDocumentId, x.ProductId }).IsUnique(); b.HasOne(x => x.Document).WithMany(x => x.Lines).HasForeignKey(x => x.OpeningStockDocumentId).OnDelete(DeleteBehavior.Cascade); b.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class StockAdjustmentDocumentEntityConfiguration : IEntityTypeConfiguration<StockAdjustmentDocumentEntity>
{
  public void Configure(EntityTypeBuilder<StockAdjustmentDocumentEntity> b)
  {
    b.ToTable("stock_adjustment_documents"); b.HasKey(x => x.Id); b.Property(x => x.DocumentNumber).HasMaxLength(20).IsRequired(); b.HasIndex(x => x.DocumentNumber).IsUnique(); b.Property(x => x.Reason).HasMaxLength(500).IsRequired(); b.Property(x => x.Notes).HasMaxLength(1000); b.Property(x => x.Status).HasConversion<string>().HasMaxLength(16).IsRequired(); b.HasIndex(x => new { x.DocumentDate, x.Status }); b.HasIndex(x => x.BranchId); b.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.Warehouse).WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class StockAdjustmentLineEntityConfiguration : IEntityTypeConfiguration<StockAdjustmentLineEntity>
{
  public void Configure(EntityTypeBuilder<StockAdjustmentLineEntity> b)
  {
    b.ToTable("stock_adjustment_lines"); b.HasKey(x => x.Id); b.Property(x => x.SystemQuantity).HasPrecision(19, 4).IsRequired(); b.Property(x => x.ActualQuantity).HasPrecision(19, 4).IsRequired(); b.HasIndex(x => new { x.StockAdjustmentDocumentId, x.ProductId }).IsUnique(); b.HasOne(x => x.Document).WithMany(x => x.Lines).HasForeignKey(x => x.StockAdjustmentDocumentId).OnDelete(DeleteBehavior.Cascade); b.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class WarehouseTransferDocumentEntityConfiguration : IEntityTypeConfiguration<WarehouseTransferDocumentEntity>
{
  public void Configure(EntityTypeBuilder<WarehouseTransferDocumentEntity> b)
  {
    b.ToTable("warehouse_transfer_documents"); b.HasKey(x => x.Id); b.Property(x => x.DocumentNumber).HasMaxLength(20).IsRequired(); b.HasIndex(x => x.DocumentNumber).IsUnique(); b.Property(x => x.Notes).HasMaxLength(1000); b.Property(x => x.Status).HasConversion<string>().HasMaxLength(16).IsRequired(); b.HasIndex(x => new { x.DocumentDate, x.Status }); b.HasIndex(x => x.BranchId); b.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.SourceWarehouse).WithMany().HasForeignKey(x => x.SourceWarehouseId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.DestinationWarehouse).WithMany().HasForeignKey(x => x.DestinationWarehouseId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class WarehouseTransferLineEntityConfiguration : IEntityTypeConfiguration<WarehouseTransferLineEntity>
{
  public void Configure(EntityTypeBuilder<WarehouseTransferLineEntity> b)
  {
    b.ToTable("warehouse_transfer_lines"); b.HasKey(x => x.Id); b.Property(x => x.AvailableSourceQuantity).HasPrecision(19, 4).IsRequired(); b.Property(x => x.Quantity).HasPrecision(19, 4).IsRequired(); b.HasIndex(x => new { x.WarehouseTransferDocumentId, x.ProductId }).IsUnique(); b.HasOne(x => x.Document).WithMany(x => x.Lines).HasForeignKey(x => x.WarehouseTransferDocumentId).OnDelete(DeleteBehavior.Cascade); b.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class StockMovementEntityConfiguration : IEntityTypeConfiguration<StockMovementEntity>
{
  public void Configure(EntityTypeBuilder<StockMovementEntity> b)
  {
    b.ToTable("stock_movements"); b.HasKey(x => x.Id); b.Property(x => x.Type).HasConversion<string>().HasMaxLength(32).IsRequired(); b.Property(x => x.QuantityIn).HasPrecision(19, 4).IsRequired(); b.Property(x => x.QuantityOut).HasPrecision(19, 4).IsRequired(); b.Property(x => x.UnitCostBase).HasPrecision(19, 4).IsRequired(); b.Property(x => x.Reference).HasMaxLength(100); b.Property(x => x.Note).HasMaxLength(1000); b.HasIndex(x => new { x.ProductId, x.WarehouseId, x.MovementDate }); b.HasIndex(x => x.TransferId); b.HasOne(x => x.Product).WithMany(x => x.StockMovements).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.Warehouse).WithMany(x => x.StockMovements).HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict); b.HasOne(x => x.PerformedByUser).WithMany().HasForeignKey(x => x.PerformedByUserId).OnDelete(DeleteBehavior.Restrict);

    b.HasOne(x => x.OpeningStockDocument).WithMany(x => x.Movements).HasForeignKey(x => x.OpeningStockDocumentId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.OpeningStockLine).WithMany(x => x.Movements).HasForeignKey(x => x.OpeningStockLineId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.StockAdjustmentDocument).WithMany(x => x.Movements).HasForeignKey(x => x.StockAdjustmentDocumentId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.StockAdjustmentLine).WithMany(x => x.Movements).HasForeignKey(x => x.StockAdjustmentLineId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.WarehouseTransferDocument).WithMany(x => x.Movements).HasForeignKey(x => x.WarehouseTransferDocumentId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.WarehouseTransferLine).WithMany(x => x.Movements).HasForeignKey(x => x.WarehouseTransferLineId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.PurchaseInvoice).WithMany(x => x.Movements).HasForeignKey(x => x.PurchaseInvoiceId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.PurchaseInvoiceLine).WithMany(x => x.Movements).HasForeignKey(x => x.PurchaseInvoiceLineId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.SalesInvoice).WithMany(x => x.Movements).HasForeignKey(x => x.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
    b.HasOne(x => x.SalesInvoiceLine).WithMany(x => x.Movements).HasForeignKey(x => x.SalesInvoiceLineId).OnDelete(DeleteBehavior.Restrict);
  }
}
