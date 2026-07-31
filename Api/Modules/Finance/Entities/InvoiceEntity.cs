namespace Api.Modules.Finance;

public sealed class InvoiceEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public InvoiceType Type { get; set; } // SalesInvoice, PurchaseInvoice, etc.
  
  public Guid ContactId { get; set; }
  public ContactEntity? Contact { get; set; }
  
  public decimal TotalAmount { get; set; }
  
  public Guid CurrencyId { get; set; }
  public CurrencyEntity? Currency { get; set; }
  public decimal ExchangeRate { get; set; } // At the time of invoice
  
  public DateTime InvoiceDateUtc { get; set; }
  
  public ICollection<InvoiceLineEntity> Lines { get; set; } = new List<InvoiceLineEntity>();
  
  public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class InvoiceLineEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  
  public Guid InvoiceId { get; set; }
  public InvoiceEntity? Invoice { get; set; }
  
  public string Description { get; set; } = string.Empty;
  
  // Which revenue or expense account this line hits
  public Guid AccountId { get; set; }
  public AccountEntity? Account { get; set; }
  
  public decimal Quantity { get; set; }
  public decimal UnitPrice { get; set; }
  public decimal TotalPrice { get; set; }
}
