using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Accounting;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/accounting")]
[Authorize(Roles = "SuperAdmin,Manager")]
public sealed class AccountingController : ControllerBase
{
  private readonly AccountingService _accountingService;

  public AccountingController(AccountingService accountingService) => _accountingService = accountingService;

  [HttpGet("accounts")]
  [ProducesResponseType(typeof(ApiResponse<List<AccountResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAccounts([FromQuery] AccountListQuery query, CancellationToken ct)
  {
    var accounts = await _accountingService.GetAccountsAsync(query, ct);
    return Ok(ApiResponse<List<AccountResponse>>.Ok(accounts.Items, accounts.ToMetadata()));
  }

  [HttpGet("accounts/tree")]
  [ProducesResponseType(typeof(ApiResponse<List<AccountResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAccountTree([FromQuery] AccountTreeQuery query, CancellationToken ct) =>
    Ok(ApiResponse<List<AccountResponse>>.Ok(await _accountingService.GetAccountTreeAsync(query, ct)));

  [HttpGet("accounts/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<AccountResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetAccount(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<AccountResponse>.Ok(await _accountingService.GetAccountAsync(id, ct)));

  [HttpPost("accounts")]
  [ProducesResponseType(typeof(ApiResponse<AccountResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest request, CancellationToken ct)
  {
    var account = await _accountingService.CreateAccountAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(nameof(GetAccount), new { account.Id, version }, ApiResponse<AccountResponse>.Ok(account));
  }

  [HttpPut("accounts/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<AccountResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateAccount(Guid id, [FromBody] UpdateAccountRequest request, CancellationToken ct) =>
    Ok(ApiResponse<AccountResponse>.Ok(await _accountingService.UpdateAccountAsync(id, request, ct)));

  [HttpDelete("accounts/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteAccount(Guid id, CancellationToken ct)
  {
    await _accountingService.DeleteAccountAsync(id, ct);
    return NoContent();
  }

  [HttpGet("journals")]
  [ProducesResponseType(typeof(ApiResponse<List<JournalEntryResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetJournals([FromQuery] JournalListQuery query, CancellationToken ct)
  {
    var journals = await _accountingService.GetJournalsAsync(query, ct);
    return Ok(ApiResponse<List<JournalEntryResponse>>.Ok(journals.Items, journals.ToMetadata()));
  }

  [HttpGet("journals/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<JournalEntryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetJournal(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<JournalEntryResponse>.Ok(await _accountingService.GetJournalAsync(id, ct)));

  [HttpPost("journals")]
  [ProducesResponseType(typeof(ApiResponse<JournalEntryResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateJournal([FromBody] CreateJournalEntryRequest request, CancellationToken ct)
  {
    var journal = await _accountingService.CreateJournalAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(nameof(GetJournal), new { journal.Id, version }, ApiResponse<JournalEntryResponse>.Ok(journal));
  }

  [HttpPut("journals/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<JournalEntryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateJournal(Guid id, [FromBody] UpdateJournalEntryRequest request, CancellationToken ct) =>
    Ok(ApiResponse<JournalEntryResponse>.Ok(await _accountingService.UpdateJournalAsync(id, request, ct)));

  [HttpDelete("journals/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteJournal(Guid id, CancellationToken ct)
  {
    await _accountingService.DeleteJournalAsync(id, ct);
    return NoContent();
  }

  [HttpPost("journals/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<JournalEntryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostJournal(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<JournalEntryResponse>.Ok(await _accountingService.PostJournalAsync(id, ct)));

  [HttpPost("journals/{id:guid}/reverse")]
  [ProducesResponseType(typeof(ApiResponse<JournalEntryResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> ReverseJournal(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<JournalEntryResponse>.Ok(await _accountingService.ReverseJournalAsync(id, ct)));

  [HttpGet("general-ledger")]
  [ProducesResponseType(typeof(ApiResponse<GeneralLedgerResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetGeneralLedger([FromQuery] GeneralLedgerQuery query, CancellationToken ct) =>
    Ok(ApiResponse<GeneralLedgerResponse>.Ok(await _accountingService.GetGeneralLedgerAsync(query, ct)));

  [HttpGet("trial-balance")]
  [ProducesResponseType(typeof(ApiResponse<TrialBalanceResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetTrialBalance([FromQuery] TrialBalanceQuery query, CancellationToken ct) =>
    Ok(ApiResponse<TrialBalanceResponse>.Ok(await _accountingService.GetTrialBalanceAsync(query, ct)));
}
