using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Contact;

public sealed class ContactEntityConfiguration : IEntityTypeConfiguration<ContactEntity>
{
  public void Configure(EntityTypeBuilder<ContactEntity> builder)
  {
    builder.HasOne<Api.Modules.Branch.BranchEntity>().WithMany().HasForeignKey(x => x.CatalogBranchId).OnDelete(DeleteBehavior.Restrict);
    builder.ToTable("contacts");
    builder.HasKey(contact => contact.Id);
    builder.Property(contact => contact.Name).HasMaxLength(200).IsRequired();
    builder.Property(contact => contact.Kind).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.Property(contact => contact.PrimaryPhoneNumber).HasMaxLength(50);
    builder.Property(contact => contact.PrimaryPhoneNormalized).HasMaxLength(50);
    builder.Property(contact => contact.SecondaryPhoneNumber).HasMaxLength(50);
    builder.Property(contact => contact.SecondaryPhoneNormalized).HasMaxLength(50);
    builder.Property(contact => contact.Email).HasMaxLength(254);
    builder.Property(contact => contact.Address).HasMaxLength(500);
    builder.Property(contact => contact.City).HasMaxLength(100);
    builder.Property(contact => contact.Region).HasMaxLength(100);
    builder.Property(contact => contact.Country).HasMaxLength(100);
    builder.Property(contact => contact.Notes).HasMaxLength(2000);

    builder.HasIndex(contact => contact.Name);
    builder.HasIndex(contact => contact.PrimaryPhoneNormalized);
    builder.HasIndex(contact => contact.SecondaryPhoneNormalized);
    builder.HasIndex(contact => new { contact.IsCustomer, contact.IsSupplier, contact.IsActive });
  }
}
