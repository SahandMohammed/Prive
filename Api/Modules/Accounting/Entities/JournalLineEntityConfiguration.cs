using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Accounting;

public sealed class JournalLineEntityConfiguration : IEntityTypeConfiguration<JournalLineEntity>
{
  public void Configure(EntityTypeBuilder<JournalLineEntity> builder)
  {
    builder.ToTable("journal_lines");
    builder.HasKey(line => line.Id);
    builder.Property(line => line.Description).HasMaxLength(1000);
    builder.Property(line => line.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(line => line.OriginalDebitAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.OriginalCreditAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.DebitBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.CreditBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(line => new { line.AccountId, line.JournalEntryId });
    builder.HasOne(line => line.JournalEntry)
      .WithMany(journal => journal.Lines)
      .HasForeignKey(line => line.JournalEntryId)
      .OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.Account)
      .WithMany(account => account.JournalLines)
      .HasForeignKey(line => line.AccountId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.Currency)
      .WithMany()
      .HasForeignKey(line => line.CurrencyId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}
