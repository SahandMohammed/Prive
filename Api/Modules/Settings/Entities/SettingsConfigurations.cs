using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Settings;

public sealed class ItemCategoryConfiguration : IEntityTypeConfiguration<ItemCategoryEntity>
{
    public void Configure(EntityTypeBuilder<ItemCategoryEntity> builder)
    {
        builder.ToTable("ItemCategories", table =>
            table.HasCheckConstraint("CK_ItemCategories_NotSelfParent", "\"ParentCategoryId\" IS NULL OR \"ParentCategoryId\" <> \"Id\""));
        builder.HasKey(x => x.Id);
        builder.HasOne(x => x.ParentCategory)
            .WithMany(x => x.SubCategories)
            .HasForeignKey(x => x.ParentCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ItemConfiguration : IEntityTypeConfiguration<ItemEntity>
{
    public void Configure(EntityTypeBuilder<ItemEntity> builder)
    {
        builder.ToTable("Items", table =>
        {
            table.HasCheckConstraint("CK_Items_ServiceInventory", "\"Type\" <> 1 OR NOT \"TrackInventory\"");
            table.HasCheckConstraint("CK_Items_Type", "\"Type\" BETWEEN 0 AND 1");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.HasIndex(x => x.Code).IsUnique();
        
        builder.Property(x => x.BasePrice).HasColumnType("numeric(18,4)");
        builder.Property(x => x.BaseCost).HasColumnType("numeric(18,4)");
        
        builder.HasOne(x => x.Category)
            .WithMany()
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);
            
        builder.HasOne(x => x.BaseUnitOfMeasure)
            .WithMany()
            .HasForeignKey(x => x.BaseUnitOfMeasureId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SalesAccount)
            .WithMany()
            .HasForeignKey(x => x.SalesAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.PurchaseAccount)
            .WithMany()
            .HasForeignKey(x => x.PurchaseAccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ItemUnitOfMeasureConfiguration : IEntityTypeConfiguration<ItemUnitOfMeasureEntity>
{
    public void Configure(EntityTypeBuilder<ItemUnitOfMeasureEntity> builder)
    {
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.ConversionFactor).HasColumnType("numeric(18,4)");
        builder.HasIndex(x => new { x.ItemId, x.UnitOfMeasureId }).IsUnique();
        builder.HasIndex(x => x.ItemId, "UX_ItemUnitsOfMeasure_DefaultSelling")
            .IsUnique()
            .HasFilter("\"IsDefaultForSelling\"");
        builder.HasIndex(x => x.ItemId, "UX_ItemUnitsOfMeasure_DefaultPurchasing")
            .IsUnique()
            .HasFilter("\"IsDefaultForPurchasing\"");
        
        builder.HasOne(x => x.Item)
            .WithMany(x => x.AdditionalUnits)
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.HasOne(x => x.UnitOfMeasure)
            .WithMany()
            .HasForeignKey(x => x.UnitOfMeasureId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class BusinessSettingsConfiguration : IEntityTypeConfiguration<BusinessSettingsEntity>
{
    public void Configure(EntityTypeBuilder<BusinessSettingsEntity> builder)
    {
        builder.ToTable("BusinessSettings", table =>
            table.HasCheckConstraint(
                "CK_BusinessSettings_Singleton",
                "\"Id\" = '00000000-0000-0000-0000-000000000001'::uuid"));
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.BaseCurrencyCode).HasMaxLength(3);
        builder.Property(x => x.CurrencySymbolPosition).HasMaxLength(10);
        builder.HasOne(x => x.BaseCurrency)
            .WithMany()
            .HasForeignKey(x => x.BaseCurrencyId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.DefaultReceivableAccount)
            .WithMany()
            .HasForeignKey(x => x.DefaultReceivableAccountId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.DefaultPayableAccount)
            .WithMany()
            .HasForeignKey(x => x.DefaultPayableAccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class WarehouseConfiguration : IEntityTypeConfiguration<WarehouseEntity>
{
    public void Configure(EntityTypeBuilder<WarehouseEntity> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Address).HasMaxLength(500);
        builder.HasIndex(x => x.Code).IsUnique();
    }
}
