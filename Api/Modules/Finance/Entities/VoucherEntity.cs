namespace Api.Modules.Finance;

public sealed class VoucherEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public VoucherType Type { get; set; }
  
  // E.g., The Safe or Bank account that is receiving/paying funds. Must be an Asset account.
  public Guid TreasuryAccountId { get; set; }
  public AccountEntity? TreasuryAccount { get; set; }
  
  // The Contact (Customer/Vendor) involved, if any
  public Guid? ContactId { get; set; }
  public ContactEntity? Contact { get; set; }
  
  public decimal TotalAmount { get; set; }
  
  public Guid CurrencyId { get; set; }
  public CurrencyEntity? Currency { get; set; }
  public decimal ExchangeRate { get; set; }
  
  public DateTime VoucherDateUtc { get; set; }
  
  public ICollection<VoucherAllocationEntity> Allocations { get; set; } = new List<VoucherAllocationEntity>();
  
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class VoucherAllocationEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  
  public Guid VoucherId { get; set; }
  public VoucherEntity? Voucher { get; set; }
  
  // The invoice this voucher pays off
  public Guid InvoiceId { get; set; }
  public InvoiceEntity? Invoice { get; set; }
  
  public decimal AllocatedAmount { get; set; }
}
