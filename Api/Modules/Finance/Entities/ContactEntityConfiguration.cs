using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Finance;

public sealed class ContactEntityConfiguration : IEntityTypeConfiguration<ContactEntity>
{
  public void Configure(EntityTypeBuilder<ContactEntity> builder)
  {
    builder.ToTable("Contacts", table =>
      table.HasCheckConstraint("CK_Contacts_Type", "\"Type\" BETWEEN 1 AND 4"));
    builder.Property(contact => contact.Name).HasMaxLength(200).IsRequired();
    builder.Property(contact => contact.PhoneNumber).HasMaxLength(30);
    builder.Property(contact => contact.Email).HasMaxLength(320);
    builder.Property(contact => contact.Address).HasMaxLength(500);
    builder.Property(contact => contact.Description).HasMaxLength(2_000);
    builder.Property(contact => contact.Notes).HasMaxLength(2_000);
  }
}
