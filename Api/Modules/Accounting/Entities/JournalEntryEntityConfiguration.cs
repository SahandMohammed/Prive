using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Accounting;

public sealed class JournalEntryEntityConfiguration : IEntityTypeConfiguration<JournalEntryEntity>
{
  public void Configure(EntityTypeBuilder<JournalEntryEntity> builder)
  {
    builder.ToTable("journal_entries");
    builder.HasKey(journal => journal.Id);
    builder.Property(journal => journal.Reference).HasMaxLength(100);
    builder.Property(journal => journal.Description).HasMaxLength(1000).IsRequired();
    builder.Property(journal => journal.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.Property(journal => journal.Type).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.HasIndex(journal => new { journal.BranchId, journal.EntryDate });
    builder.HasIndex(journal => journal.PostedAtUtc);
    builder.HasOne(journal => journal.Branch)
      .WithMany()
      .HasForeignKey(journal => journal.BranchId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(journal => journal.ReversalOfJournal)
      .WithMany(journal => journal.ReversalJournals)
      .HasForeignKey(journal => journal.ReversalOfJournalId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasIndex(journal => journal.ReversalOfJournalId)
      .IsUnique()
      .HasFilter("\"ReversalOfJournalId\" IS NOT NULL");
  }
}
