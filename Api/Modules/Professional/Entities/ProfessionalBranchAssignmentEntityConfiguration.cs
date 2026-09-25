using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Professional;

public sealed class ProfessionalBranchAssignmentEntityConfiguration : IEntityTypeConfiguration<ProfessionalBranchAssignmentEntity>
{
  public void Configure(EntityTypeBuilder<ProfessionalBranchAssignmentEntity> builder)
  {
    builder.ToTable("professional_branch_assignments");
    builder.HasKey(assignment => assignment.Id);
    builder.HasIndex(assignment => new { assignment.ProfessionalId, assignment.BranchId }).IsUnique();
    builder.HasIndex(assignment => assignment.BranchId);
    builder.HasOne(assignment => assignment.Professional).WithMany(professional => professional.BranchAssignments)
      .HasForeignKey(assignment => assignment.ProfessionalId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(assignment => assignment.Branch).WithMany().HasForeignKey(assignment => assignment.BranchId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}
