using Api.Infrastructure.Http;
using Api.Modules.Business;
using Api.Modules.Finance;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Pos;

public sealed class PosSettlementService
{
  private readonly AppDbContext _db;
  private readonly FinanceService _finance;

  public PosSettlementService(AppDbContext db, FinanceService finance)
  {
    _db = db;
    _finance = finance;
  }

  internal async Task<PosSettlementPreparation> PrepareAsync(
    PosSettlementRequest request,
    Guid userId,
    CancellationToken ct,
    BusinessEntity? existingBusiness = null,
    DateTime? rateAtUtc = null)
  {
    ValidateShape(request);
    if (request.PaymentMode is PosPaymentMode.Partial or PosPaymentMode.Credit
      && !await _db.Contacts.AsNoTracking().AnyAsync(contact => contact.Id == request.CustomerId
        && contact.IsActive && contact.IsCustomer && contact.SystemRole == null, ct))
      throw new BadRequestException(ErrorCodes.Pos.RealCustomerRequired,
        "Partial and credit POS settlement requires an active registered customer.");

    var business = existingBusiness
      ?? await _db.Businesses.AsNoTracking().Include(item => item.BaseCurrency)
        .SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.BusinessNotConfigured,
        "Complete Business Setup before using POS.");

    var accountIds = request.Collections.Select(line => line.MoneyAccountId)
      .Append(request.Change?.MoneyAccountId ?? Guid.Empty)
      .Where(id => id != Guid.Empty).Distinct().ToList();
    if (accountIds.Count > 0)
    {
      var accessibleCount = await _db.MoneyAccountAccess.AsNoTracking()
        .Where(access => accountIds.Contains(access.MoneyAccountId)
          && access.UserId == userId
          && access.AccessLevel == MoneyAccountAccessLevel.Operate)
        .Select(access => access.MoneyAccountId)
        .Distinct()
        .CountAsync(ct);
      if (accessibleCount != accountIds.Count)
        throw new ForbiddenException(ErrorCodes.Finance.MoneyAccountAccessDenied,
          "You do not have the required access to every selected Money Account.");
    }

    var accounts = accountIds.Count == 0
      ? new Dictionary<Guid, MoneyAccountEntity>()
      : await _db.MoneyAccounts.Include(account => account.AccountingAccount)
        .Include(account => account.Currency)
        .Where(account => accountIds.Contains(account.Id))
        .ToDictionaryAsync(account => account.Id, ct);
    if (accounts.Count != accountIds.Count)
      throw new BadRequestException(ErrorCodes.Pos.MoneyAccountInvalid,
        "Every collection and change line must use an existing Money Account.");
    foreach (var account in accounts.Values)
    {
      FinanceService.EnsureActive(account);
      if (!account.Currency.IsActive)
        throw new BadRequestException(ErrorCodes.Pos.MoneyAccountInvalid,
          $"Money Account '{account.Code}' uses an inactive currency.");
      if (account.BranchId != request.BranchId)
        throw new BadRequestException(ErrorCodes.Pos.MoneyAccountBranchMismatch,
          $"Money Account '{account.Code}' does not belong to the selected POS branch.");
    }

    var rates = new Dictionary<Guid, decimal>();
    var ratesAtUtc = rateAtUtc ?? DateTime.UtcNow;
    foreach (var currencyId in accounts.Values.Select(account => account.CurrencyId).Distinct())
      rates[currencyId] = await _finance.ResolveCurrentRateAsync(
        currencyId, business.BaseCurrencyId, ratesAtUtc, ct);

    var collections = request.Collections.Select((line, index) =>
    {
      var account = accounts[line.MoneyAccountId];
      var rate = rates[account.CurrencyId];
      return new PosCollectionPosting(index + 1, line, account, rate, Money(line.Amount * rate));
    }).ToList();
    var grossCollectionBase = Money(collections.Sum(line => line.BaseAmount));

    var changeDueBase = 0m;
    ChangeMoneyLinePosting? change = null;
    switch (request.PaymentMode)
    {
      case PosPaymentMode.Paid:
        if (grossCollectionBase < request.SaleTotalBase)
          throw new BadRequestException(ErrorCodes.Pos.Underpayment,
            $"POS Sale is underpaid by {Money(request.SaleTotalBase - grossCollectionBase)} {business.BaseCurrency.Code}.");
        changeDueBase = Money(grossCollectionBase - request.SaleTotalBase);
        break;
      case PosPaymentMode.Partial:
        if (grossCollectionBase <= 0 || grossCollectionBase >= request.SaleTotalBase)
          throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid,
            "A partial POS Sale must collect more than zero and less than the Sale total.");
        break;
      case PosPaymentMode.Credit:
        if (grossCollectionBase != 0)
          throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid,
            "A credit POS Sale cannot include collection money lines. Choose Partial when money is received now.");
        break;
      default:
        throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid, "Select a valid POS payment mode.");
    }

    if (request.PaymentMode != PosPaymentMode.Paid && request.Change is not null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeNotDue,
        "A Change PaymentMoneyLine is valid only for a fully paid POS Sale.");
    if (request.PaymentMode == PosPaymentMode.Paid && changeDueBase == 0 && request.Change is not null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeNotDue,
        "Do not record change when gross collection exactly settles the Sale.");
    if (request.PaymentMode == PosPaymentMode.Paid && changeDueBase > 0 && request.Change is null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeRequired,
        $"Record {changeDueBase} {business.BaseCurrency.Code} as change before completing the Sale.");
    if (request.Change is not null)
    {
      var account = accounts[request.Change.MoneyAccountId];
      if (account.Type != MoneyAccountType.Cashbox || account.CurrencyId != business.BaseCurrencyId)
        throw new BadRequestException(ErrorCodes.Pos.BaseCashboxRequired,
          $"Change must use an operable {business.BaseCurrency.Code} Cashbox.");
      var rate = rates[account.CurrencyId];
      var baseAmount = Money(request.Change.Amount * rate);
      if (baseAmount != changeDueBase)
        throw new BadRequestException(ErrorCodes.Pos.ChangeMismatch,
          $"Recorded change must equal {changeDueBase} {business.BaseCurrency.Code}.");

      var currentBalance = await _finance.BalanceAsync(account.Id, ct);
      var sameAccountCollection = collections.Where(line => line.Account.Id == account.Id)
        .Sum(line => line.Request.Amount);
      if (currentBalance + sameAccountCollection < request.Change.Amount)
        throw new BadRequestException(ErrorCodes.Pos.ChangeBalanceInsufficient,
          $"Money Account '{account.Code}' cannot cover the recorded change.");
      change = new ChangeMoneyLinePosting(request.Change, account, rate, baseAmount);
    }

    return new PosSettlementPreparation(business, accounts, collections, change);
  }

  private static void ValidateShape(PosSettlementRequest request)
  {
    if (!Enum.IsDefined(request.PaymentMode))
      throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid, "Select a valid POS payment mode.");
    if (request.PaymentMode is PosPaymentMode.Paid or PosPaymentMode.Partial && request.Collections.Count == 0)
      throw new BadRequestException(ErrorCodes.Pos.CollectionRequired, "Add at least one collection money line.");
    if (request.PaymentMode == PosPaymentMode.Credit && request.Collections.Count > 0)
      throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid,
        "Credit POS Sales cannot include collection money lines.");
    if (request.Collections.Any(line => line.MoneyAccountId == Guid.Empty || line.Amount <= 0)
      || request.Collections.Select(line => line.MoneyAccountId).Distinct().Count() != request.Collections.Count)
      throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid,
        "Every collection requires a unique Money Account and an amount greater than zero.");
    if (request.Change is not null
      && (request.Change.MoneyAccountId == Guid.Empty || request.Change.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Pos.ChangeMismatch,
        "Change requires a Money Account and an amount greater than zero.");
  }

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
}

internal sealed record PosSettlementRequest(
  Guid BranchId,
  Guid? CustomerId,
  decimal SaleTotalBase,
  PosPaymentMode PaymentMode,
  List<CollectionMoneyLineRequest> Collections,
  ChangeMoneyLineRequest? Change);

internal sealed record PosSettlementPreparation(
  BusinessEntity Business,
  IReadOnlyDictionary<Guid, MoneyAccountEntity> Accounts,
  List<PosCollectionPosting> Collections,
  ChangeMoneyLinePosting? Change);

internal sealed record PosCollectionPosting(
  int Sequence,
  CollectionMoneyLineRequest Request,
  MoneyAccountEntity Account,
  decimal ExchangeRate,
  decimal BaseAmount);

internal sealed record ChangeMoneyLinePosting(
  ChangeMoneyLineRequest Request,
  MoneyAccountEntity Account,
  decimal ExchangeRate,
  decimal BaseAmount);
