using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Business;

public sealed class BusinessEntityConfiguration : IEntityTypeConfiguration<BusinessEntity>
{
  public void Configure(EntityTypeBuilder<BusinessEntity> builder)
  {
    builder.ToTable("businesses");
    builder.HasKey(business => business.Id);
    builder.Property(business => business.Name).HasMaxLength(200).IsRequired();
    builder.Property(business => business.LegalName).HasMaxLength(200);
    builder.Property(business => business.PrimaryPhoneNumber).HasMaxLength(50).IsRequired();
    builder.Property(business => business.SecondaryPhoneNumber).HasMaxLength(50);
    builder.Property(business => business.Email).HasMaxLength(254);
    builder.Property(business => business.Website).HasMaxLength(2048);
    builder.Property(business => business.Address).HasMaxLength(500).IsRequired();
    builder.Property(business => business.City).HasMaxLength(100).IsRequired();
    builder.Property(business => business.Region).HasMaxLength(100).IsRequired();
    builder.Property(business => business.Country).HasMaxLength(100).IsRequired();
    builder.Property(business => business.LogoReference).HasMaxLength(2048);
    builder.Property(business => business.TimeZoneId).HasMaxLength(100).IsRequired()
      .HasDefaultValue(BusinessEntity.DefaultTimeZoneId);
    builder.Property(business => business.ReceiptFooter).HasMaxLength(500);
    builder.Property(business => business.ReceiptPaperWidth).HasConversion<string>().HasMaxLength(8).IsRequired()
      .HasDefaultValue(ReceiptPaperWidth.Mm80)
      .HasSentinel(ReceiptPaperWidth.Mm80);
    builder.HasIndex(business => business.IsActive)
      .IsUnique()
      .HasFilter("\"IsActive\" = true");
    builder.HasOne(business => business.BaseCurrency)
      .WithMany()
      .HasForeignKey(business => business.BaseCurrencyId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}
