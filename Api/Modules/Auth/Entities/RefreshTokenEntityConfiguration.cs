using Api.Modules.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Auth;

public sealed class RefreshTokenEntityConfiguration : IEntityTypeConfiguration<RefreshTokenEntity>
{
  public void Configure(EntityTypeBuilder<RefreshTokenEntity> builder)
  {
    builder.ToTable("refresh_tokens");
    builder.HasKey(token => token.Id);
    builder.Property(token => token.TokenHash).HasMaxLength(44).IsRequired();
    builder.HasIndex(token => token.TokenHash).IsUnique();
    builder.HasIndex(token => token.UserId);
    builder.HasOne<UserEntity>()
      .WithMany()
      .HasForeignKey(token => token.UserId)
      .OnDelete(DeleteBehavior.Cascade);
  }
}
