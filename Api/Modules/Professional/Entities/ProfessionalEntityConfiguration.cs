using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Professional;

public sealed class ProfessionalEntityConfiguration : IEntityTypeConfiguration<ProfessionalEntity>
{
  public void Configure(EntityTypeBuilder<ProfessionalEntity> builder)
  {
    builder.ToTable("professionals");
    builder.HasKey(professional => professional.Id);
    builder.Property(professional => professional.Name).HasMaxLength(200).IsRequired();
    builder.Property(professional => professional.PhoneNumber).HasMaxLength(50);
    builder.Property(professional => professional.PhoneNormalized).HasMaxLength(50);
    builder.Property(professional => professional.Email).HasMaxLength(254);
    builder.Property(professional => professional.Notes).HasMaxLength(2000);
    builder.HasIndex(professional => professional.Name);
    builder.HasIndex(professional => professional.PhoneNormalized);
    builder.HasIndex(professional => new { professional.IsActive, professional.Name });
  }
}
