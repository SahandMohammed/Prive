using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Branch;

public sealed class BranchEntityConfiguration : IEntityTypeConfiguration<BranchEntity>
{
  public void Configure(EntityTypeBuilder<BranchEntity> builder)
  {
    builder.ToTable("branches");
    builder.HasKey(branch => branch.Id);
    builder.Property(branch => branch.Code).HasMaxLength(20).IsRequired();
    builder.HasIndex(branch => branch.Code).IsUnique();
    builder.Property(branch => branch.Name).HasMaxLength(200).IsRequired();
    builder.Property(branch => branch.PhoneNumber).HasMaxLength(50);
    builder.Property(branch => branch.Email).HasMaxLength(254);
    builder.Property(branch => branch.Address).HasMaxLength(500).IsRequired();
    builder.Property(branch => branch.City).HasMaxLength(100).IsRequired();
    builder.Property(branch => branch.Region).HasMaxLength(100).IsRequired();
    builder.Property(branch => branch.Country).HasMaxLength(100).IsRequired();
    builder.HasIndex(branch => branch.IsMainBranch)
      .IsUnique()
      .HasFilter("\"IsMainBranch\" = true");
  }
}
