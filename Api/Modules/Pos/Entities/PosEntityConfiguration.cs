using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Pos;

public sealed class PosRegisterEntityConfiguration : IEntityTypeConfiguration<PosRegisterEntity>
{
  public void Configure(EntityTypeBuilder<PosRegisterEntity> builder)
  {
    builder.ToTable("pos_registers");
    builder.HasKey(register => register.Id);
    builder.Property(register => register.Code).HasMaxLength(32).IsRequired();
    builder.Property(register => register.Name).HasMaxLength(120).IsRequired();
    builder.HasIndex(register => register.Code).IsUnique();
    builder.HasIndex(register => new { register.BranchId, register.IsActive });
    builder.HasOne(register => register.Branch).WithMany().HasForeignKey(register => register.BranchId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosSessionEntityConfiguration : IEntityTypeConfiguration<PosSessionEntity>
{
  public void Configure(EntityTypeBuilder<PosSessionEntity> builder)
  {
    builder.ToTable("pos_sessions");
    builder.HasKey(session => session.Id);
    builder.Property(session => session.SessionNumber).HasMaxLength(20).IsRequired();
    builder.Property(session => session.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.Property(session => session.OpeningNotes).HasMaxLength(500);
    builder.Property(session => session.ClosingNotes).HasMaxLength(500);
    builder.HasIndex(session => session.SessionNumber).IsUnique();
    builder.HasIndex(session => new { session.BranchId, session.OpenedAtUtc });
    builder.HasIndex(session => session.RegisterId)
      .IsUnique()
      .HasFilter("\"Status\" = 'Open'");
    builder.HasIndex(session => new { session.BranchId, session.CashierUserId })
      .IsUnique()
      .HasFilter("\"Status\" = 'Open'");
    builder.HasOne(session => session.Branch).WithMany().HasForeignKey(session => session.BranchId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(session => session.Register).WithMany(register => register.Sessions)
      .HasForeignKey(session => session.RegisterId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(session => session.CashierUser).WithMany().HasForeignKey(session => session.CashierUserId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(session => session.ClosedByUser).WithMany().HasForeignKey(session => session.ClosedByUserId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosSessionOpeningCountEntityConfiguration : IEntityTypeConfiguration<PosSessionOpeningCountEntity>
{
  public void Configure(EntityTypeBuilder<PosSessionOpeningCountEntity> builder)
  {
    builder.ToTable("pos_session_opening_counts");
    builder.HasKey(count => count.Id);
    builder.Property(count => count.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(count => count.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(count => count.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(count => new { count.PosSessionId, count.CurrencyId }).IsUnique();
    builder.HasOne(count => count.PosSession).WithMany(session => session.OpeningCounts)
      .HasForeignKey(count => count.PosSessionId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(count => count.Currency).WithMany().HasForeignKey(count => count.CurrencyId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosSessionClosingCountEntityConfiguration : IEntityTypeConfiguration<PosSessionClosingCountEntity>
{
  public void Configure(EntityTypeBuilder<PosSessionClosingCountEntity> builder)
  {
    builder.ToTable("pos_session_closing_counts");
    builder.HasKey(count => count.Id);
    builder.Property(count => count.ExpectedAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(count => count.CountedAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(count => count.VarianceAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(count => count.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(count => count.ExpectedBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(count => count.CountedBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(count => count.VarianceBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(count => new { count.PosSessionId, count.CurrencyId }).IsUnique();
    builder.HasOne(count => count.PosSession).WithMany(session => session.ClosingCounts)
      .HasForeignKey(count => count.PosSessionId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(count => count.Currency).WithMany().HasForeignKey(count => count.CurrencyId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosZReportEntityConfiguration : IEntityTypeConfiguration<PosZReportEntity>
{
  public void Configure(EntityTypeBuilder<PosZReportEntity> builder)
  {
    builder.ToTable("pos_z_reports");
    builder.HasKey(report => report.Id);
    builder.Property(report => report.ReportNumber).HasMaxLength(20).IsRequired();
    builder.Property(report => report.BranchCode).HasMaxLength(32).IsRequired();
    builder.Property(report => report.BranchName).HasMaxLength(200).IsRequired();
    builder.Property(report => report.RegisterCode).HasMaxLength(32).IsRequired();
    builder.Property(report => report.RegisterName).HasMaxLength(120).IsRequired();
    builder.Property(report => report.CashierUsername).HasMaxLength(100).IsRequired();
    builder.Property(report => report.ClosedByUsername).HasMaxLength(100).IsRequired();
    builder.Property(report => report.BaseCurrencyCode).HasMaxLength(8).IsRequired();
    builder.Property(report => report.ServiceSalesBase).HasPrecision(19, 4).IsRequired();
    builder.Property(report => report.ProductSalesBase).HasPrecision(19, 4).IsRequired();
    builder.Property(report => report.GrossSalesBase).HasPrecision(19, 4).IsRequired();
    builder.Property(report => report.ServiceRefundsBase).HasPrecision(19, 4).IsRequired();
    builder.Property(report => report.ProductRefundsBase).HasPrecision(19, 4).IsRequired();
    builder.Property(report => report.RefundTotalBase).HasPrecision(19, 4).IsRequired();
    builder.Property(report => report.NetSalesBase).HasPrecision(19, 4);
    builder.HasIndex(report => report.ReportNumber).IsUnique();
    builder.HasIndex(report => report.PosSessionId).IsUnique();
    builder.HasIndex(report => new { report.BranchId, report.ClosedAtUtc });
    builder.HasOne(report => report.PosSession).WithOne(session => session.ZReport)
      .HasForeignKey<PosZReportEntity>(report => report.PosSessionId).OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosZPaymentSummaryEntityConfiguration : IEntityTypeConfiguration<PosZPaymentSummaryEntity>
{
  public void Configure(EntityTypeBuilder<PosZPaymentSummaryEntity> builder)
  {
    builder.ToTable("pos_z_payment_summaries");
    builder.HasKey(summary => summary.Id);
    builder.Property(summary => summary.MoneyAccountCode).HasMaxLength(32).IsRequired();
    builder.Property(summary => summary.MoneyAccountName).HasMaxLength(200).IsRequired();
    builder.Property(summary => summary.MoneyAccountType).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.Property(summary => summary.CurrencyCode).HasMaxLength(8).IsRequired();
    builder.Property(summary => summary.TenderedAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.ChangeAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.RefundAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.NetAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.TenderedBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.ChangeBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.RefundBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.NetBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(summary => new { summary.PosZReportId, summary.MoneyAccountId }).IsUnique();
    builder.HasOne(summary => summary.PosZReport).WithMany(report => report.PaymentSummaries)
      .HasForeignKey(summary => summary.PosZReportId).OnDelete(DeleteBehavior.Cascade);
  }
}

public sealed class PosZDrawerSummaryEntityConfiguration : IEntityTypeConfiguration<PosZDrawerSummaryEntity>
{
  public void Configure(EntityTypeBuilder<PosZDrawerSummaryEntity> builder)
  {
    builder.ToTable("pos_z_drawer_summaries");
    builder.HasKey(summary => summary.Id);
    builder.Property(summary => summary.CurrencyCode).HasMaxLength(8).IsRequired();
    builder.Property(summary => summary.OpeningAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.TenderedAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.ChangeAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.RefundAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.ExpectedAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.CountedAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.VarianceAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(summary => summary.OpeningBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.TenderedBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.ChangeBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.RefundBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.ExpectedBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.CountedBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(summary => summary.VarianceBaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(summary => new { summary.PosZReportId, summary.CurrencyId }).IsUnique();
    builder.HasOne(summary => summary.PosZReport).WithMany(report => report.DrawerSummaries)
      .HasForeignKey(summary => summary.PosZReportId).OnDelete(DeleteBehavior.Cascade);
  }
}

public sealed class PosSaleEntityConfiguration : IEntityTypeConfiguration<PosSaleEntity>
{
  public void Configure(EntityTypeBuilder<PosSaleEntity> builder)
  {
    builder.ToTable("pos_sales");
    builder.HasKey(sale => sale.Id);
    builder.Property(sale => sale.DocumentNumber).HasMaxLength(20).IsRequired();
    builder.HasIndex(sale => sale.DocumentNumber).IsUnique();
    builder.Property(sale => sale.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
    builder.HasIndex(sale => sale.SalesInvoiceId).IsUnique();
    builder.HasIndex(sale => sale.PosSessionId);
    builder.HasIndex(sale => new { sale.CompletedAtUtc, sale.Status });
    builder.HasOne(sale => sale.SalesInvoice).WithOne(invoice => invoice.PosSale)
      .HasForeignKey<PosSaleEntity>(sale => sale.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(sale => sale.PosSession).WithMany(session => session.Sales)
      .HasForeignKey(sale => sale.PosSessionId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(sale => sale.CashierUser).WithMany().HasForeignKey(sale => sale.CashierUserId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosTenderEntityConfiguration : IEntityTypeConfiguration<PosTenderEntity>
{
  public void Configure(EntityTypeBuilder<PosTenderEntity> builder)
  {
    builder.ToTable("pos_sale_tenders");
    builder.HasKey(tender => tender.Id);
    builder.Property(tender => tender.TenderedAmount).HasPrecision(19, 4).IsRequired();
    builder.Property(tender => tender.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(tender => tender.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(tender => new { tender.PosSaleId, tender.Sequence }).IsUnique();
    builder.HasIndex(tender => tender.MoneyAccountId);
    builder.HasIndex(tender => tender.MoneyLedgerEntryId).IsUnique();
    builder.HasOne(tender => tender.PosSale).WithMany(sale => sale.Tenders)
      .HasForeignKey(tender => tender.PosSaleId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(tender => tender.MoneyAccount).WithMany().HasForeignKey(tender => tender.MoneyAccountId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(tender => tender.MoneyLedgerEntry).WithMany().HasForeignKey(tender => tender.MoneyLedgerEntryId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}

public sealed class PosChangeEntityConfiguration : IEntityTypeConfiguration<PosChangeEntity>
{
  public void Configure(EntityTypeBuilder<PosChangeEntity> builder)
  {
    builder.ToTable("pos_sale_changes");
    builder.HasKey(change => change.Id);
    builder.Property(change => change.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(change => change.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(change => change.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(change => change.PosSaleId).IsUnique();
    builder.HasIndex(change => change.MoneyAccountId);
    builder.HasIndex(change => change.MoneyLedgerEntryId).IsUnique();
    builder.HasOne(change => change.PosSale).WithOne(sale => sale.Change)
      .HasForeignKey<PosChangeEntity>(change => change.PosSaleId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(change => change.MoneyAccount).WithMany().HasForeignKey(change => change.MoneyAccountId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(change => change.MoneyLedgerEntry).WithMany().HasForeignKey(change => change.MoneyLedgerEntryId)
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
    builder.HasIndex(refund => refund.DocumentNumber).IsUnique();
    builder.HasIndex(refund => new { refund.PosSaleId, refund.PostedAtUtc });
    builder.HasIndex(refund => new { refund.PosSessionId, refund.PostedAtUtc });
    builder.HasIndex(refund => refund.SalesInvoiceId);
    builder.HasIndex(refund => refund.JournalEntryId).IsUnique();
    builder.HasOne(refund => refund.PosSale).WithMany(sale => sale.Refunds)
      .HasForeignKey(refund => refund.PosSaleId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.SalesInvoice).WithMany(invoice => invoice.PosRefunds)
      .HasForeignKey(refund => refund.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.Branch).WithMany().HasForeignKey(refund => refund.BranchId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(refund => refund.PosSession).WithMany(session => session.Refunds)
      .HasForeignKey(refund => refund.PosSessionId).OnDelete(DeleteBehavior.Restrict);
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
    builder.Property(line => line.ProfessionalUsername).HasMaxLength(100);
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

public sealed class PosRefundTenderEntityConfiguration : IEntityTypeConfiguration<PosRefundTenderEntity>
{
  public void Configure(EntityTypeBuilder<PosRefundTenderEntity> builder)
  {
    builder.ToTable("pos_refund_tenders");
    builder.HasKey(tender => tender.Id);
    builder.Property(tender => tender.Amount).HasPrecision(19, 4).IsRequired();
    builder.Property(tender => tender.ExchangeRate).HasPrecision(19, 6).IsRequired();
    builder.Property(tender => tender.BaseAmount).HasPrecision(19, 4).IsRequired();
    builder.HasIndex(tender => new { tender.PosRefundId, tender.Sequence }).IsUnique();
    builder.HasIndex(tender => tender.MoneyAccountId);
    builder.HasIndex(tender => tender.MoneyLedgerEntryId).IsUnique();
    builder.HasOne(tender => tender.PosRefund).WithMany(refund => refund.Tenders)
      .HasForeignKey(tender => tender.PosRefundId).OnDelete(DeleteBehavior.Cascade);
    builder.HasOne(tender => tender.MoneyAccount).WithMany().HasForeignKey(tender => tender.MoneyAccountId)
      .OnDelete(DeleteBehavior.Restrict);
    builder.HasOne(tender => tender.MoneyLedgerEntry).WithMany().HasForeignKey(tender => tender.MoneyLedgerEntryId)
      .OnDelete(DeleteBehavior.Restrict);
  }
}
