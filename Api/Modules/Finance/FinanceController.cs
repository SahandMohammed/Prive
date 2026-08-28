using System.Security.Claims;
using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Finance;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/finance")]
[Authorize(Roles = "SuperAdmin,Manager,Owner,Cashier")]
public sealed class FinanceController : ControllerBase
{
  private const string Administrators = "SuperAdmin,Manager,Owner";
  private readonly FinanceService _service;

  public FinanceController(FinanceService service) => _service = service;

  [HttpGet("money-accounts")]
  [ProducesResponseType(typeof(ApiResponse<List<MoneyAccountResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetMoneyAccounts([FromQuery] MoneyAccountListQuery query, CancellationToken ct)
  {
    var isManagement = User.IsInRole("SuperAdmin") || User.IsInRole("Manager") || User.IsInRole("Owner");
    var result = await _service.GetMoneyAccountsAsync(query, GetUserId(), isManagement, ct);
    return Ok(ApiResponse<List<MoneyAccountResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("money-accounts/management")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<List<MoneyAccountResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetManagedMoneyAccounts([FromQuery] MoneyAccountListQuery query, CancellationToken ct)
  {
    var result = await _service.GetMoneyAccountsAsync(query, GetUserId(), true, ct);
    return Ok(ApiResponse<List<MoneyAccountResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("money-accounts/{id:guid}", Name = nameof(GetMoneyAccount))]
  [ProducesResponseType(typeof(ApiResponse<MoneyAccountResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
  public async Task<IActionResult> GetMoneyAccount(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<MoneyAccountResponse>.Ok(await _service.GetMoneyAccountAsync(id, GetUserId(), ct)));

  [HttpPost("money-accounts")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<MoneyAccountResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateMoneyAccount([FromBody] MoneyAccountRequest request, CancellationToken ct)
  {
    var account = await _service.CreateMoneyAccountAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetMoneyAccount), new { account.Id, version }, ApiResponse<MoneyAccountResponse>.Ok(account));
  }

  [HttpPut("money-accounts/{id:guid}")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<MoneyAccountResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateMoneyAccount(Guid id, [FromBody] MoneyAccountRequest request, CancellationToken ct) =>
    Ok(ApiResponse<MoneyAccountResponse>.Ok(await _service.UpdateMoneyAccountAsync(id, request, GetUserId(), ct)));

  [HttpDelete("money-accounts/{id:guid}")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteMoneyAccount(Guid id, CancellationToken ct)
  {
    await _service.DeleteMoneyAccountAsync(id, GetUserId(), ct);
    return NoContent();
  }

  [HttpGet("money-accounts/{id:guid}/access")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<List<MoneyAccountAccessResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetMoneyAccountAccess(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<List<MoneyAccountAccessResponse>>.Ok(await _service.GetMoneyAccountAccessAsync(id, ct)));

  [HttpPut("money-accounts/{id:guid}/access")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<List<MoneyAccountAccessResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> ReplaceMoneyAccountAccess(
    Guid id,
    [FromBody] ReplaceMoneyAccountAccessRequest request,
    CancellationToken ct) =>
    Ok(ApiResponse<List<MoneyAccountAccessResponse>>.Ok(await _service.ReplaceMoneyAccountAccessAsync(id, request, ct)));

  [HttpPost("money-accounts/{id:guid}/opening-balance")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<MoneyLedgerEntryResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> PostOpeningBalance(
    Guid id,
    [FromBody] OpeningMoneyBalanceRequest request,
    CancellationToken ct)
  {
    var entry = await _service.PostOpeningMoneyBalanceAsync(id, request, GetUserId(), ct);
    return StatusCode(StatusCodes.Status201Created, ApiResponse<MoneyLedgerEntryResponse>.Ok(entry));
  }

  [HttpGet("money-ledger")]
  [ProducesResponseType(typeof(ApiResponse<List<MoneyLedgerEntryResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetMoneyLedger([FromQuery] MoneyLedgerQuery query, CancellationToken ct)
  {
    var result = await _service.GetMoneyLedgerAsync(query, GetUserId(), ct);
    return Ok(ApiResponse<List<MoneyLedgerEntryResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("exchange-rates")]
  [ProducesResponseType(typeof(ApiResponse<List<ExchangeRateResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetExchangeRates([FromQuery] ExchangeRateListQuery query, CancellationToken ct)
  {
    var result = await _service.GetExchangeRatesAsync(query, ct);
    return Ok(ApiResponse<List<ExchangeRateResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("exchange-rates/effective")]
  [ProducesResponseType(typeof(ApiResponse<EffectiveExchangeRateResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetEffectiveExchangeRate(
    [FromQuery] Guid currencyId,
    [FromQuery] DateOnly date,
    CancellationToken ct) =>
    Ok(ApiResponse<EffectiveExchangeRateResponse>.Ok(
      await _service.GetEffectiveExchangeRateAsync(currencyId, date, ct)));

  [HttpPost("exchange-rates")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<ExchangeRateResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateExchangeRate([FromBody] CreateExchangeRateRequest request, CancellationToken ct)
  {
    var rate = await _service.CreateExchangeRateAsync(request, GetUserId(), ct);
    return StatusCode(StatusCodes.Status201Created, ApiResponse<ExchangeRateResponse>.Ok(rate));
  }

  [HttpPut("exchange-rates/{id:guid}/deactivate")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<ExchangeRateResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> DeactivateExchangeRate(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<ExchangeRateResponse>.Ok(await _service.DeactivateExchangeRateAsync(id, ct)));

  [HttpGet("transfers")]
  [ProducesResponseType(typeof(ApiResponse<List<MoneyTransferResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetMoneyTransfers([FromQuery] MoneyTransferListQuery query, CancellationToken ct)
  {
    var result = await _service.GetMoneyTransfersAsync(query, GetUserId(), ct);
    return Ok(ApiResponse<List<MoneyTransferResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("transfers/{id:guid}", Name = nameof(GetMoneyTransfer))]
  [ProducesResponseType(typeof(ApiResponse<MoneyTransferResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetMoneyTransfer(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<MoneyTransferResponse>.Ok(await _service.GetMoneyTransferAsync(id, GetUserId(), ct)));

  [HttpPost("transfers")]
  [ProducesResponseType(typeof(ApiResponse<MoneyTransferResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateMoneyTransfer([FromBody] MoneyTransferDraftRequest request, CancellationToken ct)
  {
    var transfer = await _service.CreateMoneyTransferAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetMoneyTransfer), new { transfer.Id, version }, ApiResponse<MoneyTransferResponse>.Ok(transfer));
  }

  [HttpPut("transfers/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<MoneyTransferResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateMoneyTransfer(Guid id, [FromBody] MoneyTransferDraftRequest request, CancellationToken ct) =>
    Ok(ApiResponse<MoneyTransferResponse>.Ok(await _service.UpdateMoneyTransferAsync(id, request, GetUserId(), ct)));

  [HttpDelete("transfers/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteMoneyTransfer(Guid id, CancellationToken ct)
  {
    await _service.DeleteMoneyTransferAsync(id, GetUserId(), ct);
    return NoContent();
  }

  [HttpPost("transfers/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<MoneyTransferResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostMoneyTransfer(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<MoneyTransferResponse>.Ok(await _service.PostMoneyTransferAsync(id, GetUserId(), ct)));

  [HttpGet("supplier-payments")]
  [ProducesResponseType(typeof(ApiResponse<List<SupplierPaymentResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSupplierPayments([FromQuery] SupplierPaymentListQuery query, CancellationToken ct)
  {
    var result = await _service.GetSupplierPaymentsAsync(query, GetUserId(), ct);
    return Ok(ApiResponse<List<SupplierPaymentResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("suppliers")]
  [ProducesResponseType(typeof(ApiResponse<List<FinanceSupplierResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSuppliers(CancellationToken ct) =>
    Ok(ApiResponse<List<FinanceSupplierResponse>>.Ok(await _service.GetSuppliersAsync(ct)));

  [HttpGet("supplier-payments/outstanding-invoices")]
  [ProducesResponseType(typeof(ApiResponse<List<OutstandingPurchaseInvoiceResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetOutstandingPurchaseInvoices(
    [FromQuery] Guid supplierId,
    [FromQuery] Guid? currencyId,
    CancellationToken ct) =>
    Ok(ApiResponse<List<OutstandingPurchaseInvoiceResponse>>.Ok(
      await _service.GetOutstandingPurchaseInvoicesAsync(supplierId, currencyId, ct)));

  [HttpGet("supplier-payments/{id:guid}", Name = nameof(GetSupplierPayment))]
  [ProducesResponseType(typeof(ApiResponse<SupplierPaymentResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSupplierPayment(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<SupplierPaymentResponse>.Ok(await _service.GetSupplierPaymentAsync(id, GetUserId(), ct)));

  [HttpPost("supplier-payments")]
  [ProducesResponseType(typeof(ApiResponse<SupplierPaymentResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateSupplierPayment([FromBody] SupplierPaymentDraftRequest request, CancellationToken ct)
  {
    var payment = await _service.CreateSupplierPaymentAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetSupplierPayment), new { payment.Id, version }, ApiResponse<SupplierPaymentResponse>.Ok(payment));
  }

  [HttpPut("supplier-payments/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<SupplierPaymentResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateSupplierPayment(Guid id, [FromBody] SupplierPaymentDraftRequest request, CancellationToken ct) =>
    Ok(ApiResponse<SupplierPaymentResponse>.Ok(await _service.UpdateSupplierPaymentAsync(id, request, GetUserId(), ct)));

  [HttpDelete("supplier-payments/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteSupplierPayment(Guid id, CancellationToken ct)
  {
    await _service.DeleteSupplierPaymentAsync(id, GetUserId(), ct);
    return NoContent();
  }

  [HttpPost("supplier-payments/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<SupplierPaymentResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostSupplierPayment(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<SupplierPaymentResponse>.Ok(await _service.PostSupplierPaymentAsync(id, GetUserId(), ct)));

  [HttpGet("customer-receipts")]
  [ProducesResponseType(typeof(ApiResponse<List<CustomerReceiptListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCustomerReceipts([FromQuery] CustomerReceiptListQuery query, CancellationToken ct)
  {
    var result = await _service.GetCustomerReceiptsAsync(query, GetUserId(), ct);
    return Ok(ApiResponse<List<CustomerReceiptListResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("customers")]
  [ProducesResponseType(typeof(ApiResponse<List<FinanceCustomerResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCustomers(CancellationToken ct) =>
    Ok(ApiResponse<List<FinanceCustomerResponse>>.Ok(await _service.GetCustomersAsync(ct)));

  [HttpGet("customer-receipts/outstanding-invoices")]
  [ProducesResponseType(typeof(ApiResponse<List<OutstandingSalesInvoiceResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetOutstandingSalesInvoices(
    [FromQuery] Guid customerId,
    [FromQuery] Guid? currencyId,
    CancellationToken ct) =>
    Ok(ApiResponse<List<OutstandingSalesInvoiceResponse>>.Ok(
      await _service.GetOutstandingSalesInvoicesAsync(customerId, currencyId, ct)));

  [HttpGet("customer-receipts/{id:guid}", Name = nameof(GetCustomerReceipt))]
  [ProducesResponseType(typeof(ApiResponse<CustomerReceiptResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCustomerReceipt(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<CustomerReceiptResponse>.Ok(await _service.GetCustomerReceiptAsync(id, GetUserId(), ct)));

  [HttpPost("customer-receipts")]
  [ProducesResponseType(typeof(ApiResponse<CustomerReceiptResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateCustomerReceipt(
    [FromBody] CustomerReceiptDraftRequest request,
    CancellationToken ct)
  {
    var receipt = await _service.CreateCustomerReceiptAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetCustomerReceipt), new { receipt.Id, version },
      ApiResponse<CustomerReceiptResponse>.Ok(receipt));
  }

  [HttpPut("customer-receipts/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<CustomerReceiptResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateCustomerReceipt(
    Guid id,
    [FromBody] CustomerReceiptDraftRequest request,
    CancellationToken ct) =>
    Ok(ApiResponse<CustomerReceiptResponse>.Ok(
      await _service.UpdateCustomerReceiptAsync(id, request, GetUserId(), ct)));

  [HttpDelete("customer-receipts/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteCustomerReceipt(Guid id, CancellationToken ct)
  {
    await _service.DeleteCustomerReceiptAsync(id, GetUserId(), ct);
    return NoContent();
  }

  [HttpPost("customer-receipts/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<CustomerReceiptResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostCustomerReceipt(Guid id, CancellationToken ct) =>
    Ok(ApiResponse<CustomerReceiptResponse>.Ok(
      await _service.PostCustomerReceiptAsync(id, GetUserId(), ct)));

  private Guid GetUserId()
  {
    var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    if (!Guid.TryParse(value, out var userId))
      throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
    return userId;
  }
}
