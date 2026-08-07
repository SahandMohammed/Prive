using Api.Infrastructure.Http;
using Api.Modules.Purchases;
using Api.Modules.Sales;
using Api.Modules.Settings;
using Api.Shared.Domain;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Finance;

public sealed record CreatePaymentAllocationRequest(
  Guid FinancialVoucherId,
  Guid? SalesInvoiceId,
  Guid? PurchaseInvoiceId,
  decimal AllocatedAmount);

public sealed record PaymentAllocationDto(
  Guid Id,
  Guid FinancialVoucherId,
  Guid? SalesInvoiceId,
  Guid? PurchaseInvoiceId,
  decimal AllocatedAmount,
  bool IsActive);

public interface IFinancialOperationsService
{
  Task<DocumentTransitionDto> PostVoucherAsync(Guid id, CancellationToken ct = default);
  Task<DocumentTransitionDto> VoidVoucherAsync(Guid id, CancellationToken ct = default);
  Task<PaymentAllocationDto> CreateAllocationAsync(CreatePaymentAllocationRequest request, CancellationToken ct = default);
}

public sealed class FinancialOperationsService(
  AppDbContext db,
  IPostingSettingsProvider postingSettings,
  IFinancialLedgerService financialLedger) : IFinancialOperationsService
{
  public Task<DocumentTransitionDto> PostVoucherAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var voucher = await db.FinancialVouchers
        .AsNoTracking()
        .Include(x => x.Account)
        .Include(x => x.CounterpartyAccount)
        .Include(x => x.Contact)
        .SingleOrDefaultAsync(x => x.Id == id, token)
        ?? throw new NotFoundException(ErrorCodes.Finance.VoucherNotFound, "Financial voucher was not found.");

      if (voucher.Status != DocumentStatus.Draft)
      {
        throw new ConflictException(ErrorCodes.Finance.VoucherNotDraft, "Only a draft voucher can be posted.");
      }

      var settings = await postingSettings.GetRequiredAsync(token);
      var movements = ValidateAndBuildMovements(voucher, settings);
      var now = DateTime.UtcNow;
      var changed = await db.FinancialVouchers
        .Where(x => x.Id == id && x.Status == DocumentStatus.Draft)
        .ExecuteUpdateAsync(setters => setters
          .SetProperty(x => x.Status, DocumentStatus.Posted)
          .SetProperty(x => x.PostedAtUtc, now), token);
      if (changed != 1)
      {
        throw new ConflictException(ErrorCodes.Finance.VoucherNotDraft, "The voucher is no longer in Draft status.");
      }

      financialLedger.AddMovements(movements);
      return new DocumentTransitionDto(id, DocumentStatus.Posted, now, null);
    }, ct);

  public Task<DocumentTransitionDto> VoidVoucherAsync(Guid id, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      var voucher = await db.FinancialVouchers
        .AsNoTracking()
        .SingleOrDefaultAsync(x => x.Id == id, token)
        ?? throw new NotFoundException(ErrorCodes.Finance.VoucherNotFound, "Financial voucher was not found.");
      if (voucher.Status != DocumentStatus.Posted)
      {
        throw new ConflictException(ErrorCodes.Finance.VoucherNotPosted, "Only a posted voucher can be voided.");
      }

      var now = DateTime.UtcNow;
      var changed = await db.FinancialVouchers
        .Where(x => x.Id == id && x.Status == DocumentStatus.Posted)
        .ExecuteUpdateAsync(setters => setters
          .SetProperty(x => x.Status, DocumentStatus.Voided)
          .SetProperty(x => x.VoidedAtUtc, now), token);
      if (changed != 1)
      {
        throw new ConflictException(ErrorCodes.Finance.VoucherNotPosted, "The voucher is no longer in Posted status.");
      }

      await financialLedger.ReverseSourceAsync(AccountTransactionSourceType.FinancialVoucher, id, token);
      await db.PaymentAllocations
        .Where(x => x.FinancialVoucherId == id && x.IsActive)
        .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.IsActive, false), token);

      return new DocumentTransitionDto(id, DocumentStatus.Voided, voucher.PostedAtUtc, now);
    }, ct);

  public Task<PaymentAllocationDto> CreateAllocationAsync(CreatePaymentAllocationRequest request, CancellationToken ct = default) =>
    PostingTransactionRunner.ExecuteSerializableAsync(db, async token =>
    {
      if (request.AllocatedAmount <= 0 || request.SalesInvoiceId.HasValue == request.PurchaseInvoiceId.HasValue)
      {
        throw new BadRequestException(ErrorCodes.Finance.InvalidAllocation, "Allocation must be positive and target exactly one normal invoice.");
      }

      await db.Database.ExecuteSqlInterpolatedAsync(
        $"""SELECT 1 FROM "FinancialVouchers" WHERE "Id" = {request.FinancialVoucherId} FOR UPDATE""",
        token);

      var voucher = await db.FinancialVouchers
        .AsNoTracking()
        .SingleOrDefaultAsync(x => x.Id == request.FinancialVoucherId, token)
        ?? throw new NotFoundException(ErrorCodes.Finance.VoucherNotFound, "Financial voucher was not found.");
      if (!voucher.CanAcceptPaymentAllocations)
      {
        throw new ConflictException(
          ErrorCodes.Finance.InvalidAllocation,
          "Only an active Posted Receipt or Payment voucher can be allocated.");
      }

      var voucherAllocated = await db.PaymentAllocations
        .Where(x => x.FinancialVoucherId == voucher.Id && x.IsActive)
        .SumAsync(x => (decimal?)x.AllocatedAmount, token) ?? 0m;
      if (voucherAllocated + request.AllocatedAmount > voucher.Amount)
      {
        throw new ConflictException(ErrorCodes.Finance.AllocationExceedsVoucher, "Allocation exceeds the voucher's unallocated amount.");
      }

      if (request.SalesInvoiceId.HasValue)
      {
        await ValidateSalesAllocationAsync(voucher, request.SalesInvoiceId.Value, request.AllocatedAmount, token);
      }
      else
      {
        await ValidatePurchaseAllocationAsync(voucher, request.PurchaseInvoiceId!.Value, request.AllocatedAmount, token);
      }

      var allocation = new PaymentAllocationEntity
      {
        FinancialVoucherId = voucher.Id,
        SalesInvoiceId = request.SalesInvoiceId,
        PurchaseInvoiceId = request.PurchaseInvoiceId,
        AllocatedAmount = request.AllocatedAmount
      };
      db.PaymentAllocations.Add(allocation);

      return new PaymentAllocationDto(
        allocation.Id,
        allocation.FinancialVoucherId,
        allocation.SalesInvoiceId,
        allocation.PurchaseInvoiceId,
        allocation.AllocatedAmount,
        allocation.IsActive);
    }, ct);

  private static IReadOnlyList<FinancialMovementRequest> ValidateAndBuildMovements(
    FinancialVoucherEntity voucher,
    PostingSettingsSnapshot settings)
  {
    if (voucher.CurrencyId != settings.BaseCurrencyId)
    {
      throw new BadRequestException(ErrorCodes.Finance.BaseCurrencyRequired, "Financial vouchers must use the configured base currency.");
    }
    if (voucher.Amount <= 0 || !voucher.Account.IsActive || !voucher.CounterpartyAccount.IsActive ||
        !UsesBaseCurrency(voucher.Account, settings.BaseCurrencyId) ||
        !UsesBaseCurrency(voucher.CounterpartyAccount, settings.BaseCurrencyId))
    {
      throw new BadRequestException(ErrorCodes.Finance.InvalidVoucher, "Voucher accounts must be active base-currency accounts and amount must be positive.");
    }

    var moneyAccount = voucher.Account.Type is AccountType.Cash or AccountType.Bank;
    var counterparty = voucher.Contact;
    return voucher.Type switch
    {
      FinancialVoucherType.Receipt when moneyAccount &&
        voucher.CounterpartyAccountId == settings.DefaultReceivableAccountId &&
        voucher.CounterpartyAccount.Type == AccountType.Receivable &&
        ContactPostingRules.IsActiveCustomer(counterparty) =>
        VoucherMovements(voucher, voucher.Amount, -voucher.Amount, counterparty!.Id),

      FinancialVoucherType.Payment when moneyAccount &&
        voucher.CounterpartyAccountId == settings.DefaultPayableAccountId &&
        voucher.CounterpartyAccount.Type == AccountType.Payable &&
        ContactPostingRules.IsActiveVendor(counterparty) =>
        VoucherMovements(voucher, -voucher.Amount, -voucher.Amount, counterparty!.Id),

      FinancialVoucherType.Payment when moneyAccount &&
        voucher.CounterpartyAccount.Type == AccountType.Expense && voucher.ContactId is null =>
        VoucherMovements(voucher, -voucher.Amount, voucher.Amount, null),

      FinancialVoucherType.Transfer when voucher.ContactId is null &&
        moneyAccount && voucher.CounterpartyAccount.Type is AccountType.Cash or AccountType.Bank =>
        VoucherMovements(voucher, -voucher.Amount, voucher.Amount, null),

      _ => throw new BadRequestException(
        ErrorCodes.Finance.InvalidVoucher,
        "Voucher account types and contact do not match the selected Receipt, Payment, or Transfer workflow.")
    };
  }

  private static IReadOnlyList<FinancialMovementRequest> VoucherMovements(
    FinancialVoucherEntity voucher,
    decimal primaryAmount,
    decimal counterpartyAmount,
    Guid? counterpartyContactId) =>
    [
      new(voucher.AccountId, null, voucher.CurrencyId, primaryAmount, primaryAmount, voucher.VoucherDateUtc,
        AccountTransactionSourceType.FinancialVoucher, voucher.Id, voucher.Description),
      new(voucher.CounterpartyAccountId, counterpartyContactId, voucher.CurrencyId, counterpartyAmount, counterpartyAmount,
        voucher.VoucherDateUtc, AccountTransactionSourceType.FinancialVoucher, voucher.Id, voucher.Description)
    ];

  private async Task ValidateSalesAllocationAsync(FinancialVoucherEntity voucher, Guid invoiceId, decimal amount, CancellationToken ct)
  {
    await db.Database.ExecuteSqlInterpolatedAsync(
      $"""SELECT 1 FROM "SalesInvoices" WHERE "Id" = {invoiceId} FOR UPDATE""",
      ct);
    var invoice = await db.SalesInvoices.AsNoTracking().SingleOrDefaultAsync(x => x.Id == invoiceId, ct)
      ?? throw new NotFoundException(ErrorCodes.Sales.InvoiceNotFound, "Sales invoice was not found.");
    if (voucher.Type != FinancialVoucherType.Receipt || invoice.Status != DocumentStatus.Posted || invoice.IsReturn ||
        !voucher.ContactId.HasValue || voucher.ContactId != invoice.CustomerId || voucher.CurrencyId != invoice.CurrencyId)
    {
      throw new BadRequestException(ErrorCodes.Finance.InvalidAllocation, "Receipt allocation requires a posted normal sales invoice for the same customer and currency.");
    }

    var allocated = await db.PaymentAllocations
      .Where(x => x.SalesInvoiceId == invoiceId && x.IsActive)
      .SumAsync(x => (decimal?)x.AllocatedAmount, ct) ?? 0m;
    var returns = await db.SalesInvoices
      .Where(x => x.IsReturn && x.OriginalSalesInvoiceId == invoiceId && x.Status == DocumentStatus.Posted)
      .SumAsync(x => (decimal?)x.Total, ct) ?? 0m;
    if (amount > invoice.Total - allocated - returns)
    {
      throw new ConflictException(ErrorCodes.Finance.AllocationExceedsOutstanding, "Allocation exceeds the sales invoice outstanding amount.");
    }
  }

  private async Task ValidatePurchaseAllocationAsync(FinancialVoucherEntity voucher, Guid invoiceId, decimal amount, CancellationToken ct)
  {
    await db.Database.ExecuteSqlInterpolatedAsync(
      $"""SELECT 1 FROM "PurchaseInvoices" WHERE "Id" = {invoiceId} FOR UPDATE""",
      ct);
    var invoice = await db.PurchaseInvoices.AsNoTracking().SingleOrDefaultAsync(x => x.Id == invoiceId, ct)
      ?? throw new NotFoundException(ErrorCodes.Purchases.InvoiceNotFound, "Purchase invoice was not found.");
    if (voucher.Type != FinancialVoucherType.Payment || invoice.Status != DocumentStatus.Posted || invoice.IsReturn ||
        !voucher.ContactId.HasValue || voucher.ContactId != invoice.VendorId || voucher.CurrencyId != invoice.CurrencyId)
    {
      throw new BadRequestException(ErrorCodes.Finance.InvalidAllocation, "Payment allocation requires a posted normal purchase invoice for the same vendor and currency.");
    }

    var allocated = await db.PaymentAllocations
      .Where(x => x.PurchaseInvoiceId == invoiceId && x.IsActive)
      .SumAsync(x => (decimal?)x.AllocatedAmount, ct) ?? 0m;
    var returns = await db.PurchaseInvoices
      .Where(x => x.IsReturn && x.OriginalPurchaseInvoiceId == invoiceId && x.Status == DocumentStatus.Posted)
      .SumAsync(x => (decimal?)x.Total, ct) ?? 0m;
    if (amount > invoice.Total - allocated - returns)
    {
      throw new ConflictException(ErrorCodes.Finance.AllocationExceedsOutstanding, "Allocation exceeds the purchase invoice outstanding amount.");
    }
  }

  private static bool UsesBaseCurrency(AccountEntity account, Guid baseCurrencyId) =>
    !account.CurrencyId.HasValue || account.CurrencyId == baseCurrencyId;

}
