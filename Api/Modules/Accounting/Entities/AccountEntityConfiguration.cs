using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Accounting;

public sealed class AccountEntityConfiguration : IEntityTypeConfiguration<AccountEntity>
{
  public void Configure(EntityTypeBuilder<AccountEntity> builder)
  {
    builder.ToTable("accounts");
    builder.HasKey(account => account.Id);
    builder.Property(account => account.Code).HasMaxLength(32).IsRequired();
    builder.HasIndex(account => account.Code).IsUnique();
    builder.Property(account => account.Name).HasMaxLength(250).IsRequired();
    builder.Property(account => account.Classification).HasConversion<string>().HasMaxLength(32).IsRequired();
    builder.HasOne(account => account.ParentAccount)
      .WithMany(account => account.ChildAccounts)
      .HasForeignKey(account => account.ParentAccountId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasIndex(account => account.ParentAccountId);
  }
}
