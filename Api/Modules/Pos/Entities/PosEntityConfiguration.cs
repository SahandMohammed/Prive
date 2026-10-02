using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Pos;

public sealed class PosContextEntityConfiguration : IEntityTypeConfiguration<PosContextEntity>
{
  public void Configure(EntityTypeBuilder<PosContextEntity> builder)
  {
    builder.ToTable("pos_contexts");
    builder.HasKey(context => context.SalesInvoiceId);
    builder.Property(context => context.RequestFingerprint).HasMaxLength(64);
    builder.HasIndex(context => context.CompletedAtUtc);
    builder.HasIndex(context => context.ClientRequestId).IsUnique().HasFilter("\"ClientRequestId\" IS NOT NULL");
    builder.HasOne(context => context.SalesInvoice).WithOne(invoice => invoice.PosContext)
      .HasForeignKey<PosContextEntity>(context => context.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(context => context.OperatorUser).WithMany().HasForeignKey(context => context.OperatorUserId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosRefundEntityConfiguration : IEntityTypeConfiguration<PosRefundEntity>
{
  public void Configure(EntityTypeBuilder<PosRefundEntity> builder)
  {
    builder.ToTable("pos_refunds");
    builder.HasKey(refund => refund.Id);
    builder.Property(refund => refund.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.Property(refund => refund.Reason).HasConversion<string>().HasMaxLength(32).IsRequired();
    builder.Property(refund => refund.Notes).HasMaxLength(1000);
    builder.Property(refund => refund.Status).HasConversion<string>().HasMaxLength(16).IsRequired().IsConcurrencyToken();
    builder.Property(refund => refund.TotalRefundBase).HasPrecision(19, 4).IsRequired();
    builder.Property(refund => refund.ReceivableReversalBase).HasPrecision(19, 4).IsRequired();
    builder.Property(refund => refund.CashRefundBase).HasPrecision(19, 4).IsRequired();
    builder.Property(refund => refund.RequestFingerprint).HasMaxLength(64);
    builder.HasIndex(refund => refund.DocumentNumber).IsUnique();
    builder.HasIndex(refund => new { refund.SalesInvoiceId, refund.PostedAtUtc });
    builder.HasIndex(refund => refund.JournalEntryId).IsUnique();
    builder.HasIndex(refund => refund.ClientRequestId).IsUnique().HasFilter("\"ClientRequestId\" IS NOT NULL");
    builder.HasOne(refund => refund.SalesInvoice).WithMany(invoice => invoice.PosRefunds)
      .HasForeignKey(refund => refund.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.PosContext).WithMany(context => context.Refunds)
      .HasForeignKey(refund => refund.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.Branch).WithMany().HasForeignKey(refund => refund.BranchId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.Customer).WithMany().HasForeignKey(refund => refund.CustomerId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.CreatedByUser).WithMany().HasForeignKey(refund => refund.CreatedByUserId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.ApprovedByUser).WithMany().HasForeignKey(refund => refund.ApprovedByUserId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.JournalEntry).WithOne(entry => entry.SourcePosRefund)
      .HasForeignKey<PosRefundEntity>(refund => refund.JournalEntryId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosRefundLineEntityConfiguration : IEntityTypeConfiguration<PosRefundLineEntity>
{
  public void Configure(EntityTypeBuilder<PosRefundLineEntity> builder)
  {
    builder.ToTable("pos_refund_lines");
    builder.HasKey(line => line.Id);
    builder.Property(line => line.LineType).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.Property(line => line.Description).HasMaxLength(500).IsRequired();
    builder.Property(line => line.UnitCode).HasMaxLength(32);
    builder.Property(line => line.ProfessionalName).HasMaxLength(200);
    builder.Property(line => line.Quantity).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.BaseQuantity).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.RefundAmountBase).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.OriginalUnitCostBase).HasPrecision(19, 4);
    builder.HasIndex(line => new { line.PosRefundId, line.OriginalSalesInvoiceLineId }).IsUnique();
    builder.HasIndex(line => line.OriginalSalesInvoiceLineId);
    builder.HasOne(line => line.PosRefund).WithMany(refund => refund.Lines)
      .HasForeignKey(line => line.PosRefundId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.OriginalSalesInvoiceLine).WithMany(original => original.PosRefundLines)
      .HasForeignKey(line => line.OriginalSalesInvoiceLineId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosRefundPayoutEntityConfiguration : IEntityTypeConfiguration<PosRefundPayoutEntity>
{
  public void Configure(EntityTypeBuilder<PosRefundPayoutEntity> builder)
  {
    builder.ToTable("pos_refund_payouts");
    builder.HasKey(line => line.Id);
    builder.Property(line => line.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(line => line.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(line => line.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(line => new { line.PosRefundId, line.Sequence }).IsUnique();
    builder.HasIndex(line => line.MoneyAccountId);
    builder.HasIndex(line => line.MoneyLedgerEntryId).IsUnique();
    builder.HasOne(line => line.PosRefund).WithMany(refund => refund.RefundPayouts)
      .HasForeignKey(line => line.PosRefundId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(line => line.MoneyAccount).WithMany().HasForeignKey(line => line.MoneyAccountId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(line => line.MoneyLedgerEntry).WithMany().HasForeignKey(line => line.MoneyLedgerEntryId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}
