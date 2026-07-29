using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.User;

public sealed class UserEntityConfiguration : IEntityTypeConfiguration<UserEntity>
{
  public void Configure(EntityTypeBuilder<UserEntity> builder)
  {
    builder.ToTable("users");
    builder.HasKey(user => user.Id);
    builder.Property(user => user.Username).HasMaxLength(100).IsRequired();
    builder.HasIndex(user => user.Username).IsUnique();
    builder.Property(user => user.PasswordHash).HasMaxLength(512).IsRequired();
    builder.Property(user => user.Role).HasConversion<string>().HasMaxLength(32).IsRequired();
  }
}
