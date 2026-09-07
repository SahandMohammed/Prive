using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Dashboard;

public sealed class ActivityLogEntityConfiguration : IEntityTypeConfiguration<ActivityLogEntity>
{
  public void Configure(EntityTypeBuilder<ActivityLogEntity> builder)
  {
    builder.ToTable("activity_logs");
    builder.HasKey(x => x.Id);
    builder.Property(x => x.Action).HasMaxLength(64).IsRequired();
    builder.Property(x => x.EntityType).HasMaxLength(64).IsRequired();
    builder.Property(x => x.DocumentNumber).HasMaxLength(64).IsRequired();
    builder.Property(x => x.Description).HasMaxLength(256);
    builder.Property(x => x.TimestampUtc).IsRequired();

    builder.HasOne(x => x.Branch)
      .WithMany()
      .HasForeignKey(x => x.BranchId)
      .OnDelete(DeleteBehavior.Restrict);

    builder.HasOne(x => x.User)
      .WithMany()
      .HasForeignKey(x => x.UserId)
      .OnDelete(DeleteBehavior.Restrict);

    builder.HasIndex(x => new { x.BranchId, x.TimestampUtc });
  }
}
