using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Finance;

public sealed class ContactEntityConfiguration : IEntityTypeConfiguration<ContactEntity>
{
  public void Configure(EntityTypeBuilder<ContactEntity> builder)
  {
    builder.Property(contact => contact.Name).IsRequired();
    builder.Property(contact => contact.PhoneNumber).HasMaxLength(30);
    builder.Property(contact => contact.Email).HasMaxLength(320);
    builder.Property(contact => contact.Address).HasMaxLength(500);
    builder.Property(contact => contact.Description).HasMaxLength(2_000);
    builder.Property(contact => contact.OpeningBalance).HasPrecision(18, 6);
  }
}
