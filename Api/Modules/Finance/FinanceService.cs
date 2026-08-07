using Microsoft.EntityFrameworkCore;
using Api.Shared.Persistence;
using Api.Shared.Pagination;

namespace Api.Modules.Finance;

public interface IFinanceService
{
  // Currencies
  Task<List<CurrencyEntity>> GetCurrenciesAsync();
  Task<CurrencyEntity> CreateCurrencyAsync(string code, string name, string symbol, decimal exchangeRate, bool isBaseCurrency);
  
  // Chart of Accounts
  Task<List<AccountEntity>> GetAccountsAsync();
  Task<AccountEntity> CreateAccountAsync(string code, string name, AccountCategory category, Guid? parentAccountId, Guid? currencyId);
  Task SeedBaseAccountsAsync();
  
  // Contacts
  Task<List<ContactEntity>> GetContactsAsync(ContactType? type = null);
  Task<ContactEntity> CreateContactAsync(string name, ContactType type);
  
  // Invoices (Sales / Purchases)
  Task<PagedResult<InvoiceEntity>> GetInvoicesAsync(InvoiceListQuery query, CancellationToken ct = default);
  Task<InvoiceEntity> CreateInvoiceAsync(InvoiceType type, Guid contactId, Guid currencyId, decimal exchangeRate, List<InvoiceLineDto> lines, DateTime invoiceDate);
  
  // Vouchers (Receipts / Payments / Transfers)
  Task<List<VoucherEntity>> GetVouchersAsync(VoucherType? type = null);
  Task<VoucherEntity> CreateVoucherAsync(VoucherType type, Guid treasuryAccountId, Guid? contactId, Guid currencyId, decimal exchangeRate, decimal totalAmount, DateTime voucherDate, List<VoucherAllocationDto> allocations);
  
  // Ledger
  Task<List<JournalEntryEntity>> GetJournalEntriesAsync();
}

public record InvoiceLineDto(string Description, Guid AccountId, decimal Quantity, decimal UnitPrice);
public record VoucherAllocationDto(Guid InvoiceId, decimal AllocatedAmount);

public class FinanceService : IFinanceService
{
  private readonly AppDbContext _context;

  public FinanceService(AppDbContext context)
  {
    _context = context;
  }

  public async Task<List<CurrencyEntity>> GetCurrenciesAsync()
  {
    return await _context.Currencies.ToListAsync();
  }

  public async Task<CurrencyEntity> CreateCurrencyAsync(string code, string name, string symbol, decimal exchangeRate, bool isBaseCurrency)
  {
    if (isBaseCurrency)
    {
      // Reset other base currencies
      var currentBases = await _context.Currencies.Where(c => c.IsBaseCurrency).ToListAsync();
      foreach (var cb in currentBases)
      {
        cb.IsBaseCurrency = false;
      }
    }

    var currency = new CurrencyEntity
    {
      Code = code.ToUpper(),
      Name = name,
      Symbol = symbol,
      ExchangeRate = exchangeRate,
      IsBaseCurrency = isBaseCurrency
    };

    _context.Currencies.Add(currency);
    await _context.SaveChangesAsync();
    return currency;
  }

  public async Task<List<AccountEntity>> GetAccountsAsync()
  {
    return await _context.Accounts
      .Include(a => a.Currency)
      .OrderBy(a => a.Code)
      .ToListAsync();
  }

  public async Task<AccountEntity> CreateAccountAsync(string code, string name, AccountCategory category, Guid? parentAccountId, Guid? currencyId)
  {
    // Validate parent account if provided
    if (parentAccountId.HasValue)
    {
      var parent = await _context.Accounts.FindAsync(parentAccountId.Value);
      if (parent == null) throw new InvalidOperationException("Parent account not found.");
      parent.IsLeaf = false; // It is no longer a leaf account
    }

    var account = new AccountEntity
    {
      Code = code,
      Name = name,
      Category = category,
      ParentAccountId = parentAccountId,
      CurrencyId = currencyId,
      IsLeaf = true
    };

    _context.Accounts.Add(account);
    await _context.SaveChangesAsync();
    return account;
  }

  public async Task SeedBaseAccountsAsync()
  {
    if (await _context.Accounts.AnyAsync()) return;

    // Standard IFRS Root Categories
    var assetRoot = await CreateAccountAsync("1000", "Assets", AccountCategory.Asset, null, null);
    var liabilityRoot = await CreateAccountAsync("2000", "Liabilities", AccountCategory.Liability, null, null);
    var equityRoot = await CreateAccountAsync("3000", "Equity", AccountCategory.Equity, null, null);
    var revenueRoot = await CreateAccountAsync("4000", "Revenue", AccountCategory.Revenue, null, null);
    var expenseRoot = await CreateAccountAsync("5000", "Expenses", AccountCategory.Expense, null, null);

    // Standard sub-groups
    var cashBankGroup = await CreateAccountAsync("1100", "Cash & Bank (Treasury)", AccountCategory.Asset, assetRoot.Id, null);
    var arGroup = await CreateAccountAsync("1200", "Accounts Receivable", AccountCategory.Asset, assetRoot.Id, null);
    var inventoryGroup = await CreateAccountAsync("1300", "Inventory", AccountCategory.Asset, assetRoot.Id, null);

    var apGroup = await CreateAccountAsync("2100", "Accounts Payable", AccountCategory.Liability, liabilityRoot.Id, null);

    // Default transactional accounts
    await CreateAccountAsync("1101", "Main Safe (IQD)", AccountCategory.Asset, cashBankGroup.Id, null);
    await CreateAccountAsync("4101", "Sales Revenue", AccountCategory.Revenue, revenueRoot.Id, null);
    await CreateAccountAsync("5101", "Cost of Goods Sold (COGS)", AccountCategory.Expense, expenseRoot.Id, null);
    await CreateAccountAsync("5102", "General & Admin Expenses", AccountCategory.Expense, expenseRoot.Id, null);
    await CreateAccountAsync("4201", "Exchange Gain", AccountCategory.Revenue, revenueRoot.Id, null);
    await CreateAccountAsync("5201", "Exchange Loss", AccountCategory.Expense, expenseRoot.Id, null);
  }

  public async Task<List<ContactEntity>> GetContactsAsync(ContactType? type = null)
  {
    var query = _context.Contacts.Include(c => c.Account).AsQueryable();
    if (type.HasValue)
    {
      query = query.Where(c => c.Type == type.Value);
    }
    return await query.ToListAsync();
  }

  public async Task<ContactEntity> CreateContactAsync(string name, ContactType type)
  {
    // Auto-create corresponding sub-ledger account under A/R or A/P
    var parentCode = type == ContactType.Customer ? "1200" : "2100";
    var parent = await _context.Accounts.FirstOrDefaultAsync(a => a.Code == parentCode);
    
    if (parent == null)
    {
      // Ensure seed has run
      await SeedBaseAccountsAsync();
      parent = await _context.Accounts.FirstAsync(a => a.Code == parentCode);
    }

    // Count current children to generate code
    var currentChildrenCount = await _context.Accounts.CountAsync(a => a.ParentAccountId == parent.Id);
    var childCode = $"{parent.Code}.{currentChildrenCount + 1}";

    var subLedgerAccount = await CreateAccountAsync(
      childCode, 
      $"{name} ({type}) Account", 
      type == ContactType.Customer ? AccountCategory.Asset : AccountCategory.Liability, 
      parent.Id, 
      null
    );

    var contact = new ContactEntity
    {
      Name = name,
      Type = type,
      AccountId = subLedgerAccount.Id
    };

    _context.Contacts.Add(contact);
    await _context.SaveChangesAsync();
    return contact;
  }

  public async Task<PagedResult<InvoiceEntity>> GetInvoicesAsync(InvoiceListQuery request, CancellationToken ct = default)
  {
    var query = _context.Invoices
      .AsNoTracking()
      .Include(i => i.Contact)
      .Include(i => i.Currency)
      .Include(i => i.Lines)
        .ThenInclude(l => l.Account)
      .AsQueryable();

    if (request.Type.HasValue)
    {
      query = query.Where(i => i.Type == request.Type.Value);
    }

    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var searchLower = request.Search.Trim().ToLower();
      query = query.Where(i => 
        (i.Contact != null && i.Contact.Name.ToLower().Contains(searchLower)) ||
        i.Lines.Any(l => l.Description.ToLower().Contains(searchLower)) ||
        i.Id.ToString().Contains(searchLower)
      );
    }

    if (request.StartDate.HasValue)
    {
      query = query.Where(i => i.InvoiceDateUtc >= request.StartDate.Value.ToUniversalTime());
    }

    if (request.EndDate.HasValue)
    {
      query = query.Where(i => i.InvoiceDateUtc <= request.EndDate.Value.ToUniversalTime());
    }

    // Newest first
    query = query.OrderByDescending(i => i.InvoiceDateUtc).ThenByDescending(i => i.Id);

    return await query.ToPagedResultAsync(request, ct);
  }

  public async Task<InvoiceEntity> CreateInvoiceAsync(InvoiceType type, Guid contactId, Guid currencyId, decimal exchangeRate, List<InvoiceLineDto> lines, DateTime invoiceDate)
  {
    var contact = await _context.Contacts.Include(c => c.Account).FirstOrDefaultAsync(c => c.Id == contactId);
    if (contact == null) throw new InvalidOperationException("Contact not found.");
    
    var currency = await _context.Currencies.FindAsync(currencyId);
    if (currency == null) throw new InvalidOperationException("Currency not found.");

    decimal totalInvoiceAmount = lines.Sum(l => l.Quantity * l.UnitPrice);

    var invoice = new InvoiceEntity
    {
      Type = type,
      ContactId = contactId,
      TotalAmount = totalInvoiceAmount,
      CurrencyId = currencyId,
      ExchangeRate = exchangeRate,
      InvoiceDateUtc = invoiceDate.ToUniversalTime(),
    };

    foreach (var l in lines)
    {
      invoice.Lines.Add(new InvoiceLineEntity
      {
        Description = l.Description,
        AccountId = l.AccountId,
        Quantity = l.Quantity,
        UnitPrice = l.UnitPrice,
        TotalPrice = l.Quantity * l.UnitPrice
      });
    }

    _context.Invoices.Add(invoice);

    // Create the associated balanced Journal Entry
    var journalEntry = new JournalEntryEntity
    {
      EntryDateUtc = invoiceDate.ToUniversalTime(),
      ReferenceType = "Invoice",
      ReferenceId = invoice.Id,
      Description = $"Invoice {type} - {contact.Name}"
    };

    decimal baseTotal = totalInvoiceAmount * exchangeRate;

    if (type == InvoiceType.SalesInvoice)
    {
      // Debit Accounts Receivable (Asset)
      journalEntry.Lines.Add(new JournalEntryLineEntity
      {
        AccountId = contact.AccountId, // Customers A/R
        Debit = totalInvoiceAmount,
        Credit = 0,
        CurrencyId = currencyId,
        ExchangeRate = exchangeRate,
        BaseDebit = baseTotal,
        BaseCredit = 0
      });

      // Credit Revenue Account(s)
      foreach (var l in invoice.Lines)
      {
        decimal lineBase = l.TotalPrice * exchangeRate;
        journalEntry.Lines.Add(new JournalEntryLineEntity
        {
          AccountId = l.AccountId, // e.g. Sales Revenue
          Debit = 0,
          Credit = l.TotalPrice,
          CurrencyId = currencyId,
          ExchangeRate = exchangeRate,
          BaseDebit = 0,
          BaseCredit = lineBase
        });
      }
    }
    else if (type == InvoiceType.PurchaseInvoice)
    {
      // Debit Expense/Inventory Account(s)
      foreach (var l in invoice.Lines)
      {
        decimal lineBase = l.TotalPrice * exchangeRate;
        journalEntry.Lines.Add(new JournalEntryLineEntity
        {
          AccountId = l.AccountId, // e.g. Inventory or Cost Center
          Debit = l.TotalPrice,
          Credit = 0,
          CurrencyId = currencyId,
          ExchangeRate = exchangeRate,
          BaseDebit = lineBase,
          BaseCredit = 0
        });
      }

      // Credit Accounts Payable (Liability)
      journalEntry.Lines.Add(new JournalEntryLineEntity
      {
        AccountId = contact.AccountId, // Vendor A/P
        Debit = 0,
        Credit = totalInvoiceAmount,
        CurrencyId = currencyId,
        ExchangeRate = exchangeRate,
        BaseDebit = 0,
        BaseCredit = baseTotal
      });
    }
    else
    {
      throw new NotImplementedException("Return invoices journal allocation not implemented in MVP.");
    }

    // Validate Double-Entry rule: Debit == Credit
    decimal totalDebits = journalEntry.Lines.Sum(l => l.Debit);
    decimal totalCredits = journalEntry.Lines.Sum(l => l.Credit);
    if (Math.Abs(totalDebits - totalCredits) > 0.001m)
    {
      throw new InvalidOperationException($"Double-entry mismatch! Debits ({totalDebits}) != Credits ({totalCredits})");
    }

    _context.JournalEntries.Add(journalEntry);
    await _context.SaveChangesAsync();
    return invoice;
  }

  public async Task<List<VoucherEntity>> GetVouchersAsync(VoucherType? type = null)
  {
    var query = _context.Vouchers
      .Include(v => v.TreasuryAccount)
      .Include(v => v.Contact)
      .Include(v => v.Currency)
      .Include(v => v.Allocations)
      .AsQueryable();

    if (type.HasValue)
    {
      query = query.Where(v => v.Type == type.Value);
    }

    return await query.ToListAsync();
  }

  public async Task<VoucherEntity> CreateVoucherAsync(VoucherType type, Guid treasuryAccountId, Guid? contactId, Guid currencyId, decimal exchangeRate, decimal totalAmount, DateTime voucherDate, List<VoucherAllocationDto> allocations)
  {
    var treasury = await _context.Accounts.FindAsync(treasuryAccountId);
    if (treasury == null || treasury.Category != AccountCategory.Asset)
      throw new InvalidOperationException("Treasury Safe/Bank Account must be an Asset.");

    var currency = await _context.Currencies.FindAsync(currencyId);
    if (currency == null) throw new InvalidOperationException("Currency not found.");

    ContactEntity? contact = null;
    if (contactId.HasValue)
    {
      contact = await _context.Contacts.Include(c => c.Account).FirstOrDefaultAsync(c => c.Id == contactId.Value);
      if (contact == null) throw new InvalidOperationException("Contact not found.");
    }

    var voucher = new VoucherEntity
    {
      Type = type,
      TreasuryAccountId = treasuryAccountId,
      ContactId = contactId,
      TotalAmount = totalAmount,
      CurrencyId = currencyId,
      ExchangeRate = exchangeRate,
      VoucherDateUtc = voucherDate.ToUniversalTime(),
    };

    foreach (var a in allocations)
    {
      voucher.Allocations.Add(new VoucherAllocationEntity
      {
        InvoiceId = a.InvoiceId,
        AllocatedAmount = a.AllocatedAmount
      });
    }

    _context.Vouchers.Add(voucher);

    // Balanced Journal Entry
    var journalEntry = new JournalEntryEntity
    {
      EntryDateUtc = voucherDate.ToUniversalTime(),
      ReferenceType = "Voucher",
      ReferenceId = voucher.Id,
      Description = $"Voucher {type} - Ref {treasury.Name}"
    };

    decimal baseTotal = totalAmount * exchangeRate;

    if (type == VoucherType.Receipt)
    {
      if (contact == null) throw new InvalidOperationException("Receipt voucher from customer requires customer contact.");

      // Debit Treasury Cash/Bank Account (Asset increases)
      journalEntry.Lines.Add(new JournalEntryLineEntity
      {
        AccountId = treasuryAccountId,
        Debit = totalAmount,
        Credit = 0,
        CurrencyId = currencyId,
        ExchangeRate = exchangeRate,
        BaseDebit = baseTotal,
        BaseCredit = 0
      });

      // Credit Accounts Receivable (Asset decreases)
      journalEntry.Lines.Add(new JournalEntryLineEntity
      {
        AccountId = contact.AccountId, // Customer A/R
        Debit = 0,
        Credit = totalAmount,
        CurrencyId = currencyId,
        ExchangeRate = exchangeRate,
        BaseDebit = 0,
        BaseCredit = baseTotal
      });
    }
    else if (type == VoucherType.Payment)
    {
      if (contact == null) throw new InvalidOperationException("Payment voucher to vendor requires vendor contact.");

      // Debit Accounts Payable (Liability decreases)
      journalEntry.Lines.Add(new JournalEntryLineEntity
      {
        AccountId = contact.AccountId, // Vendor A/P
        Debit = totalAmount,
        Credit = 0,
        CurrencyId = currencyId,
        ExchangeRate = exchangeRate,
        BaseDebit = baseTotal,
        BaseCredit = 0
      });

      // Credit Treasury Cash/Bank Account (Asset decreases)
      journalEntry.Lines.Add(new JournalEntryLineEntity
      {
        AccountId = treasuryAccountId,
        Debit = 0,
        Credit = totalAmount,
        CurrencyId = currencyId,
        ExchangeRate = exchangeRate,
        BaseDebit = 0,
        BaseCredit = baseTotal
      });
    }
    else
    {
      throw new NotImplementedException("Internal transfers / Currency exchanges journal allocation not implemented in MVP.");
    }

    // Double-entry validation
    decimal totalDebits = journalEntry.Lines.Sum(l => l.Debit);
    decimal totalCredits = journalEntry.Lines.Sum(l => l.Credit);
    if (Math.Abs(totalDebits - totalCredits) > 0.001m)
    {
      throw new InvalidOperationException($"Double-entry mismatch! Debits ({totalDebits}) != Credits ({totalCredits})");
    }

    _context.JournalEntries.Add(journalEntry);
    await _context.SaveChangesAsync();
    return voucher;
  }

  public async Task<List<JournalEntryEntity>> GetJournalEntriesAsync()
  {
    return await _context.JournalEntries
      .Include(je => je.Lines)
        .ThenInclude(l => l.Account)
      .Include(je => je.Lines)
        .ThenInclude(l => l.Currency)
      .OrderByDescending(je => je.EntryDateUtc)
      .ToListAsync();
  }
}
