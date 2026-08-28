using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Expenses;

public sealed class ExpenseCategoryEntityConfiguration : IEntityTypeConfiguration<ExpenseCategoryEntity>
{
  public void Configure(EntityTypeBuilder<ExpenseCategoryEntity> builder)
  {
    builder.ToTable("expense_categories");
    builder.HasKey(category => category.Id);
    builder.Property(category => category.Code).HasMaxLength(32).IsRequired();
    builder.HasIndex(category => category.Code).IsUnique();
    builder.Property(category => category.Name).HasMaxLength(100).IsRequired();
    builder.Property(category => category.Description).HasMaxLength(500);
    builder.HasOne(category => category.AccountingAccount)
      .WithMany()
      .HasForeignKey(category => category.AccountingAccountId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class ExpenseDocumentEntityConfiguration : IEntityTypeConfiguration<ExpenseDocumentEntity>
{
  public void Configure(EntityTypeBuilder<ExpenseDocumentEntity> builder)
  {
    builder.ToTable("expense_documents");
    builder.HasKey(expense => expense.Id);
    builder.Property(expense => expense.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.HasIndex(expense => expense.DocumentNumber).IsUnique();
    builder.Property(expense => expense.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.Property(expense => expense.PayeeName).HasMaxLength(200);
    builder.Property(expense => expense.Reference).HasMaxLength(100);
    builder.Property(expense => expense.Notes).HasMaxLength(1000);
    builder.Property(expense => expense.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(expense => expense.TotalAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(expense => expense.BaseTotalAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(expense => new { expense.ExpenseDate, expense.Status });
    builder.HasIndex(expense => expense.BranchId);
    builder.HasIndex(expense => expense.MoneyAccountId);
    builder.HasIndex(expense => expense.CurrencyId);
    builder.HasIndex(expense => expense.ContactId);
    builder.HasOne(expense => expense.Branch)
      .WithMany()
      .HasForeignKey(expense => expense.BranchId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(expense => expense.MoneyAccount)
      .WithMany()
      .HasForeignKey(expense => expense.MoneyAccountId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(expense => expense.Currency)
      .WithMany()
      .HasForeignKey(expense => expense.CurrencyId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(expense => expense.BaseCurrency)
      .WithMany()
      .HasForeignKey(expense => expense.BaseCurrencyId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(expense => expense.Contact)
      .WithMany()
      .HasForeignKey(expense => expense.ContactId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(expense => expense.CreatedByUser)
      .WithMany()
      .HasForeignKey(expense => expense.CreatedByUserId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(expense => expense.PostedByUser)
      .WithMany()
      .HasForeignKey(expense => expense.PostedByUserId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(expense => expense.JournalEntry)
      .WithOne(entry => entry.SourceExpenseDocument)
      .HasForeignKey<ExpenseDocumentEntity>(expense => expense.JournalEntryId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasIndex(expense => expense.JournalEntryId)
      .IsUnique()
      .HasFilter("\"JournalEntryId\" IS NOT NULL");
  }
}

public sealed class ExpenseLineEntityConfiguration : IEntityTypeConfiguration<ExpenseLineEntity>
{
  public void Configure(EntityTypeBuilder<ExpenseLineEntity> builder)
  {
    builder.ToTable("expense_lines");
    builder.HasKey(line => line.Id);
    builder.Property(line => line.Description).HasMaxLength(500);
    builder.Property(line => line.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasOne(line => line.ExpenseDocument)
      .WithMany(expense => expense.Lines)
      .HasForeignKey(line => line.ExpenseDocumentId)
      .OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.ExpenseCategory)
      .WithMany(category => category.Lines)
      .HasForeignKey(line => line.ExpenseCategoryId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.ExpenseAccountingAccount)
      .WithMany()
      .HasForeignKey(line => line.ExpenseAccountingAccountId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}
