using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Api.Infrastructure.Http;

namespace Api.Modules.Finance;

[Authorize(Roles = "SuperAdmin,Owner,Manager")]
[ApiController]
[Route("api/v1/finance")]
public class FinanceController : ControllerBase
{
  private readonly IFinanceService _financeService;

  public FinanceController(IFinanceService financeService)
  {
    _financeService = financeService;
  }

  // --- Currencies ---
  [HttpGet("currencies")]
  public async Task<ActionResult<ApiResponse<List<CurrencyEntity>>>> GetCurrencies()
  {
    var list = await _financeService.GetCurrenciesAsync();
    return Ok(ApiResponse<List<CurrencyEntity>>.Ok(list));
  }

  [HttpPost("currencies")]
  public async Task<ActionResult<ApiResponse<CurrencyEntity>>> CreateCurrency([FromBody] CreateCurrencyRequest request)
  {
    var currency = await _financeService.CreateCurrencyAsync(
      request.Code,
      request.Name,
      request.Symbol,
      request.ExchangeRate,
      request.IsBaseCurrency
    );
    return Ok(ApiResponse<CurrencyEntity>.Ok(currency));
  }

  // --- Chart of Accounts ---
  [HttpGet("accounts")]
  public async Task<ActionResult<ApiResponse<List<AccountEntity>>>> GetAccounts()
  {
    var list = await _financeService.GetAccountsAsync();
    return Ok(ApiResponse<List<AccountEntity>>.Ok(list));
  }

  [HttpPost("accounts")]
  public async Task<ActionResult<ApiResponse<AccountEntity>>> CreateAccount([FromBody] CreateAccountRequest request)
  {
    var account = await _financeService.CreateAccountAsync(
      request.Code,
      request.Name,
      request.Category,
      request.ParentAccountId,
      request.CurrencyId
    );
    return Ok(ApiResponse<AccountEntity>.Ok(account));
  }

  [HttpPost("accounts/seed")]
  public async Task<ActionResult<ApiResponse<string>>> SeedAccounts()
  {
    await _financeService.SeedBaseAccountsAsync();
    return Ok(ApiResponse<string>.Ok("Base accounts successfully seeded."));
  }

  // --- Contacts (Customers / Vendors) ---
  [HttpGet("contacts")]
  public async Task<ActionResult<ApiResponse<List<ContactEntity>>>> GetContacts([FromQuery] ContactType? type)
  {
    var list = await _financeService.GetContactsAsync(type);
    return Ok(ApiResponse<List<ContactEntity>>.Ok(list));
  }

  [HttpPost("contacts")]
  public async Task<ActionResult<ApiResponse<ContactEntity>>> CreateContact([FromBody] CreateContactRequest request)
  {
    var contact = await _financeService.CreateContactAsync(request.Name, request.Type);
    return Ok(ApiResponse<ContactEntity>.Ok(contact));
  }

  // --- Invoices ---
  [HttpGet("invoices")]
  public async Task<ActionResult<ApiResponse<Api.Shared.Pagination.PagedResult<InvoiceEntity>>>> GetInvoices(
    [FromQuery] InvoiceType? type,
    [FromQuery] string? search,
    [FromQuery] DateTime? startDate,
    [FromQuery] DateTime? endDate,
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 10)
  {
    var pagedResult = await _financeService.GetInvoicesAsync(type, search, startDate, endDate, pageNumber, pageSize);
    return Ok(ApiResponse<Api.Shared.Pagination.PagedResult<InvoiceEntity>>.Ok(pagedResult));
  }

  [HttpPost("invoices")]
  public async Task<ActionResult<ApiResponse<InvoiceEntity>>> CreateInvoice([FromBody] CreateInvoiceRequest request)
  {
    var invoice = await _financeService.CreateInvoiceAsync(
      request.Type,
      request.ContactId,
      request.CurrencyId,
      request.ExchangeRate,
      request.Lines,
      request.InvoiceDate
    );
    return Ok(ApiResponse<InvoiceEntity>.Ok(invoice));
  }

  // --- Vouchers ---
  [HttpGet("vouchers")]
  public async Task<ActionResult<ApiResponse<List<VoucherEntity>>>> GetVouchers([FromQuery] VoucherType? type)
  {
    var list = await _financeService.GetVouchersAsync(type);
    return Ok(ApiResponse<List<VoucherEntity>>.Ok(list));
  }

  [HttpPost("vouchers")]
  public async Task<ActionResult<ApiResponse<VoucherEntity>>> CreateVoucher([FromBody] CreateVoucherRequest request)
  {
    var voucher = await _financeService.CreateVoucherAsync(
      request.Type,
      request.TreasuryAccountId,
      request.ContactId,
      request.CurrencyId,
      request.ExchangeRate,
      request.TotalAmount,
      request.VoucherDate,
      request.Allocations
    );
    return Ok(ApiResponse<VoucherEntity>.Ok(voucher));
  }

  // --- General Ledger ---
  [HttpGet("ledger")]
  public async Task<ActionResult<ApiResponse<List<JournalEntryEntity>>>> GetLedger()
  {
    var list = await _financeService.GetJournalEntriesAsync();
    return Ok(ApiResponse<List<JournalEntryEntity>>.Ok(list));
  }
}

// Request DTOs
public record CreateCurrencyRequest(string Code, string Name, string Symbol, decimal ExchangeRate, bool IsBaseCurrency);
public record CreateAccountRequest(string Code, string Name, AccountCategory Category, Guid? ParentAccountId, Guid? CurrencyId);
public record CreateContactRequest(string Name, ContactType Type);
public record CreateInvoiceRequest(InvoiceType Type, Guid ContactId, Guid CurrencyId, decimal ExchangeRate, List<InvoiceLineDto> Lines, DateTime InvoiceDate);
public record CreateVoucherRequest(VoucherType Type, Guid TreasuryAccountId, Guid? ContactId, Guid CurrencyId, decimal ExchangeRate, decimal TotalAmount, DateTime VoucherDate, List<VoucherAllocationDto> Allocations);
