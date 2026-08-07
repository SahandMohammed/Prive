using Api.Modules.Settings;
using Api.Shared.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Inventory;

public enum StockTransactionSourceType
{
  SalesInvoice = 1,
  PurchaseInvoice = 2,
  WarehouseTransfer = 3,
  StockAdjustment = 4,
  Reversal = 5
}

public enum StockAdjustmentReason
{
  OpeningStock = 1,
  StockCountCorrection = 2,
  Damage = 3,
  Expired = 4,
  InternalUse = 5,
  ManualCorrection = 6
}

public sealed class StockTransactionEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid WarehouseId { get; set; }
  public WarehouseEntity Warehouse { get; set; } = null!;
  public Guid ItemId { get; set; }
  public ItemEntity Item { get; set; } = null!;
  public decimal QuantityBase { get; set; }
  public DateTime TransactionDateUtc { get; set; }
  public StockTransactionSourceType SourceType { get; set; }
  public Guid SourceId { get; set; }
  public string? Notes { get; set; }
  public Guid? ReversesTransactionId { get; set; }
  public StockTransactionEntity? ReversesTransaction { get; set; }
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class WarehouseTransferEntity : IPostableDocument
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string TransferNumber { get; set; } = string.Empty;
  public Guid SourceWarehouseId { get; set; }
  public WarehouseEntity SourceWarehouse { get; set; } = null!;
  public Guid DestinationWarehouseId { get; set; }
  public WarehouseEntity DestinationWarehouse { get; set; } = null!;
  public DateTime TransferDateUtc { get; set; }
  public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
  public string? Notes { get; set; }
  public DateTime? PostedAtUtc { get; set; }
  public DateTime? VoidedAtUtc { get; set; }
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public ICollection<WarehouseTransferLineEntity> Lines { get; set; } = new List<WarehouseTransferLineEntity>();
}

public sealed class WarehouseTransferLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid WarehouseTransferId { get; set; }
  public WarehouseTransferEntity WarehouseTransfer { get; set; } = null!;
  public Guid ItemId { get; set; }
  public ItemEntity Item { get; set; } = null!;
  public Guid UnitOfMeasureId { get; set; }
  public UnitOfMeasureEntity UnitOfMeasure { get; set; } = null!;
  public decimal Quantity { get; set; }
  public decimal ConversionFactor { get; set; }
}

public sealed class StockAdjustmentEntity : IPostableDocument
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string AdjustmentNumber { get; set; } = string.Empty;
  public Guid WarehouseId { get; set; }
  public WarehouseEntity Warehouse { get; set; } = null!;
  public DateTime AdjustmentDateUtc { get; set; }
  public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
  public StockAdjustmentReason Reason { get; set; }
  public string? Notes { get; set; }
  public DateTime? PostedAtUtc { get; set; }
  public DateTime? VoidedAtUtc { get; set; }
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
  public ICollection<StockAdjustmentLineEntity> Lines { get; set; } = new List<StockAdjustmentLineEntity>();
}

public sealed class StockAdjustmentLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid StockAdjustmentId { get; set; }
  public StockAdjustmentEntity StockAdjustment { get; set; } = null!;
  public Guid ItemId { get; set; }
  public ItemEntity Item { get; set; } = null!;
  public Guid UnitOfMeasureId { get; set; }
  public UnitOfMeasureEntity UnitOfMeasure { get; set; } = null!;
  public decimal Quantity { get; set; }
  public decimal ConversionFactor { get; set; }
}

public sealed class StockTransactionEntityConfiguration : IEntityTypeConfiguration<StockTransactionEntity>
{
  public void Configure(EntityTypeBuilder<StockTransactionEntity> builder)
  {
    builder.ToTable("StockTransactions", table =>
    {
      table.HasCheckConstraint("CK_StockTransactions_NonZero", "\"QuantityBase\" <> 0");
      table.HasCheckConstraint("CK_StockTransactions_SourceType", "\"SourceType\" BETWEEN 1 AND 5");
      table.HasCheckConstraint("CK_StockTransactions_NotSelfReversal", "\"ReversesTransactionId\" IS NULL OR \"ReversesTransactionId\" <> \"Id\"");
    });
    builder.Property(transaction => transaction.QuantityBase).HasPrecision(18, 6);
    builder.Property(transaction => transaction.Notes).HasMaxLength(2_000);
    builder.HasIndex(transaction => new { transaction.WarehouseId, transaction.ItemId, transaction.TransactionDateUtc });
    builder.HasIndex(transaction => new { transaction.SourceType, transaction.SourceId });
    builder.HasIndex(transaction => transaction.ReversesTransactionId)
      .IsUnique()
      .HasFilter("\"ReversesTransactionId\" IS NOT NULL");
    builder.HasOne(transaction => transaction.Warehouse).WithMany().HasForeignKey(transaction => transaction.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transaction => transaction.Item).WithMany().HasForeignKey(transaction => transaction.ItemId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transaction => transaction.ReversesTransaction).WithMany().HasForeignKey(transaction => transaction.ReversesTransactionId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class WarehouseTransferEntityConfiguration : IEntityTypeConfiguration<WarehouseTransferEntity>
{
  public void Configure(EntityTypeBuilder<WarehouseTransferEntity> builder)
  {
    builder.ToTable("WarehouseTransfers", table =>
    {
      table.HasCheckConstraint("CK_WarehouseTransfers_DifferentWarehouses", "\"SourceWarehouseId\" <> \"DestinationWarehouseId\"");
      table.HasCheckConstraint("CK_WarehouseTransfers_Status", "\"Status\" BETWEEN 1 AND 3");
    });
    builder.Property(transfer => transfer.TransferNumber).HasMaxLength(50).IsRequired();
    builder.Property(transfer => transfer.Notes).HasMaxLength(2_000);
    builder.HasIndex(transfer => transfer.TransferNumber).IsUnique();
    builder.HasOne(transfer => transfer.SourceWarehouse).WithMany().HasForeignKey(transfer => transfer.SourceWarehouseId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(transfer => transfer.DestinationWarehouse).WithMany().HasForeignKey(transfer => transfer.DestinationWarehouseId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class WarehouseTransferLineEntityConfiguration : IEntityTypeConfiguration<WarehouseTransferLineEntity>
{
  public void Configure(EntityTypeBuilder<WarehouseTransferLineEntity> builder)
  {
    builder.ToTable("WarehouseTransferLines", table =>
      table.HasCheckConstraint("CK_WarehouseTransferLines_Quantity", "\"Quantity\" > 0 AND \"ConversionFactor\" > 0"));
    builder.Property(line => line.Quantity).HasPrecision(18, 6);
    builder.Property(line => line.ConversionFactor).HasPrecision(18, 6);
    builder.HasOne(line => line.WarehouseTransfer).WithMany(transfer => transfer.Lines).HasForeignKey(line => line.WarehouseTransferId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.Item).WithMany().HasForeignKey(line => line.ItemId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.UnitOfMeasure).WithMany().HasForeignKey(line => line.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class StockAdjustmentEntityConfiguration : IEntityTypeConfiguration<StockAdjustmentEntity>
{
  public void Configure(EntityTypeBuilder<StockAdjustmentEntity> builder)
  {
    builder.ToTable("StockAdjustments", table =>
    {
      table.HasCheckConstraint("CK_StockAdjustments_Status", "\"Status\" BETWEEN 1 AND 3");
      table.HasCheckConstraint("CK_StockAdjustments_Reason", "\"Reason\" BETWEEN 1 AND 6");
    });
    builder.Property(adjustment => adjustment.AdjustmentNumber).HasMaxLength(50).IsRequired();
    builder.Property(adjustment => adjustment.Notes).HasMaxLength(2_000);
    builder.HasIndex(adjustment => adjustment.AdjustmentNumber).IsUnique();
    builder.HasOne(adjustment => adjustment.Warehouse).WithMany().HasForeignKey(adjustment => adjustment.WarehouseId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class StockAdjustmentLineEntityConfiguration : IEntityTypeConfiguration<StockAdjustmentLineEntity>
{
  public void Configure(EntityTypeBuilder<StockAdjustmentLineEntity> builder)
  {
    builder.ToTable("StockAdjustmentLines", table =>
      table.HasCheckConstraint("CK_StockAdjustmentLines_Quantity", "\"Quantity\" <> 0 AND \"ConversionFactor\" > 0"));
    builder.Property(line => line.Quantity).HasPrecision(18, 6);
    builder.Property(line => line.ConversionFactor).HasPrecision(18, 6);
    builder.HasOne(line => line.StockAdjustment).WithMany(adjustment => adjustment.Lines).HasForeignKey(line => line.StockAdjustmentId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.Item).WithMany().HasForeignKey(line => line.ItemId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.UnitOfMeasure).WithMany().HasForeignKey(line => line.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
  }
}
