using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Currency;

public sealed class CurrencyEntityConfiguration : IEntityTypeConfiguration<CurrencyEntity>
{
  public void Configure(EntityTypeBuilder<CurrencyEntity> builder)
  {
    builder.ToTable("currencies");
    builder.HasKey(currency => currency.Id);
    builder.Property(currency => currency.Code).HasMaxLength(3).IsRequired();
    builder.HasIndex(currency => currency.Code).IsUnique();
    builder.Property(currency => currency.Name).HasMaxLength(100).IsRequired();
    builder.Property(currency => currency.Symbol).HasMaxLength(10).IsRequired();
    builder.Property(currency => currency.DecimalPlaces).IsRequired();
  }
}
