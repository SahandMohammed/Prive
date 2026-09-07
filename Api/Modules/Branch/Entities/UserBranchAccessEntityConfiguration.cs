using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Branch;

public sealed class UserBranchAccessEntityConfiguration : IEntityTypeConfiguration<UserBranchAccessEntity>
{
  public void Configure(EntityTypeBuilder<UserBranchAccessEntity> builder)
  {
    builder.ToTable("user_branch_access");
    builder.HasKey(access => access.Id);
    builder.HasIndex(access => new { access.UserId, access.BranchId }).IsUnique();
    builder.HasOne(access => access.User).WithMany().HasForeignKey(access => access.UserId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(access => access.Branch).WithMany().HasForeignKey(access => access.BranchId).OnDelete(DeleteBehavior.Cascade);
  }
}
