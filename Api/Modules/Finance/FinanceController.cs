using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Finance;

[Authorize(Roles = "SuperAdmin,Owner,Manager")]
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/finance")]
public sealed class FinanceController(IFinanceService financeService) : ControllerBase
{
  [HttpGet("currencies")]
  public async Task<ActionResult<ApiResponse<List<CurrencyEntity>>>> GetCurrencies(CancellationToken ct)
  {
    var list = await financeService.GetCurrenciesAsync(ct);
    return Ok(ApiResponse<List<CurrencyEntity>>.Ok(list));
  }

  [HttpPost("currencies")]
  public async Task<ActionResult<ApiResponse<CurrencyEntity>>> CreateCurrency(CreateCurrencyRequest request, CancellationToken ct)
  {
    var currency = await financeService.CreateCurrencyAsync(request.Code, request.Name, request.Symbol, request.ExchangeRate, request.IsBaseCurrency, ct);
    return Ok(ApiResponse<CurrencyEntity>.Ok(currency));
  }

  [HttpGet("accounts")]
  public async Task<ActionResult<ApiResponse<List<AccountEntity>>>> GetAccounts(CancellationToken ct)
  {
    var list = await financeService.GetAccountsAsync(ct);
    return Ok(ApiResponse<List<AccountEntity>>.Ok(list));
  }

  [HttpPost("accounts")]
  public async Task<ActionResult<ApiResponse<AccountEntity>>> CreateAccount(CreateAccountRequest request, CancellationToken ct)
  {
    var account = await financeService.CreateAccountAsync(request.Code, request.Name, request.Category, request.Type, request.ParentAccountId, request.CurrencyId, ct);
    return Ok(ApiResponse<AccountEntity>.Ok(account));
  }

  [HttpPost("accounts/seed")]
  public async Task<ActionResult<ApiResponse<string>>> SeedAccounts(CancellationToken ct)
  {
    await financeService.SeedBaseAccountsAsync(ct);
    return Ok(ApiResponse<string>.Ok("Base accounts successfully seeded."));
  }

  [HttpGet("contacts")]
  public async Task<ActionResult<ApiResponse<List<ContactEntity>>>> GetContacts([FromQuery] ContactType? type, CancellationToken ct)
  {
    var list = await financeService.GetContactsAsync(type, ct);
    return Ok(ApiResponse<List<ContactEntity>>.Ok(list));
  }

  [HttpPost("contacts")]
  public async Task<ActionResult<ApiResponse<ContactEntity>>> CreateContact(CreateContactRequest request, CancellationToken ct)
  {
    var contact = await financeService.CreateContactAsync(request.Name, request.Type, ct);
    return Ok(ApiResponse<ContactEntity>.Ok(contact));
  }

  [HttpGet("account-transactions")]
  public async Task<ActionResult<ApiResponse<List<AccountTransactionEntity>>>> GetAccountTransactions([FromQuery] AccountTransactionListQuery query, CancellationToken ct)
  {
    var result = await financeService.GetAccountTransactionsAsync(query, ct);
    return Ok(ApiResponse<List<AccountTransactionEntity>>.Ok(result.Items, result.ToMetadata()));
  }
}

public sealed record CreateCurrencyRequest(string Code, string Name, string Symbol, decimal ExchangeRate, bool IsBaseCurrency);
public sealed record CreateAccountRequest(string Code, string Name, AccountCategory Category, AccountType Type, Guid? ParentAccountId, Guid? CurrencyId);
public sealed record CreateContactRequest(string Name, ContactType Type);
