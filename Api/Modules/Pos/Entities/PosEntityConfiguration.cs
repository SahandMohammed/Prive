using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Modules.Pos;

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
    builder.HasIndex(sale => new { sale.CompletedAtUtc, sale.Status });
    builder.HasOne(sale => sale.SalesInvoice).WithOne(invoice => invoice.PosSale)
      .HasForeignKey<PosSaleEntity>(sale => sale.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
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
