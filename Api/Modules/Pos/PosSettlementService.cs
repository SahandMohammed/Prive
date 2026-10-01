using Api.Infrastructure.Http;
using Api.Modules.Business;
using Api.Modules.Finance;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Pos;

public sealed class PosSettlementService
{
  private readonly AppDbContext _db;
  private readonly FinanceService _finance;
  private readonly PosSessionService _sessions;

  public PosSettlementService(AppDbContext db, FinanceService finance, PosSessionService sessions)
  {
    _db = db;
    _finance = finance;
    _sessions = sessions;
  }

  internal async Task<PosSettlementPreparation> PrepareAsync(
    PosSettlementRequest request,
    Guid userId,
    bool management,
    CancellationToken ct,
    PosSessionEntity? existingSession = null,
    BusinessEntity? existingBusiness = null,
    DateTime? rateAtUtc = null)
  {
    ValidateShape(request);
    var session = existingSession ?? (management
      ? await _sessions.RequireOpenSessionForManagementAsync(userId, request.PosSessionId, request.BranchId, ct)
      : await _sessions.RequireOpenSessionAsync(userId, request.PosSessionId, request.BranchId, ct));
    var business = existingBusiness
      ?? await _db.Businesses.AsNoTracking().Include(item => item.BaseCurrency)
        .SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Pos.BusinessNotConfigured,
        "Complete Business Setup before using POS.");
    var baseCashbox = session.OpeningCounts.SingleOrDefault(
      count => count.CurrencyId == business.BaseCurrencyId);
    if (request.PaymentMode == PosPaymentMode.Paid && baseCashbox is null)
      throw new BadRequestException(ErrorCodes.Pos.BaseCashboxRequired,
        $"This POS Session has no configured {business.BaseCurrency.Code} Cashbox. Close it and correct the Register configuration.");

    var moneyAccountIds = request.Tenders.Select(tender => tender.MoneyAccountId)
      .Append(request.Change?.MoneyAccountId ?? Guid.Empty)
      .Where(id => id != Guid.Empty).Distinct().ToList();
    foreach (var accountId in moneyAccountIds)
      await _finance.EnsureAccessAsync(accountId, userId, MoneyAccountAccessLevel.Operate, ct);

    var accounts = await _db.MoneyAccounts.Include(account => account.AccountingAccount)
      .Include(account => account.Currency)
      .Where(account => moneyAccountIds.Contains(account.Id))
      .ToDictionaryAsync(account => account.Id, ct);
    if (accounts.Count != moneyAccountIds.Count)
      throw new BadRequestException(ErrorCodes.Pos.MoneyAccountInvalid,
        "Every tender and change line must use an existing Money Account.");
    foreach (var account in accounts.Values)
    {
      FinanceService.EnsureActive(account);
      if (!account.Currency.IsActive)
        throw new BadRequestException(ErrorCodes.Pos.MoneyAccountInvalid,
          $"Money Account '{account.Code}' uses an inactive currency.");
      if (account.BranchId != request.BranchId)
        throw new BadRequestException(ErrorCodes.Pos.MoneyAccountBranchMismatch,
          $"Money Account '{account.Code}' does not belong to the selected POS branch.");
      if (account.Type != MoneyAccountType.Cashbox
        || !session.OpeningCounts.Any(count => count.MoneyAccountId == account.Id))
        throw new BadRequestException(ErrorCodes.Pos.SessionCashboxNotAllowed,
          $"Cashbox '{account.Code}' is not part of this POS Session's exact Cashbox snapshot.");
    }

    var rates = new Dictionary<Guid, decimal>();
    var ratesAtUtc = rateAtUtc ?? DateTime.UtcNow;
    foreach (var currencyId in accounts.Values.Select(account => account.CurrencyId).Distinct())
      rates[currencyId] = await _finance.ResolveCurrentRateAsync(
        currencyId, business.BaseCurrencyId, ratesAtUtc, ct);

    var tenders = request.Tenders.Select((tender, index) =>
    {
      var account = accounts[tender.MoneyAccountId];
      var rate = rates[account.CurrencyId];
      return new PosTenderPosting(index + 1, tender, account, rate, Money(tender.Amount * rate));
    }).ToList();
    var tenderedBase = Money(tenders.Sum(tender => tender.BaseAmount));

    var changeDueBase = 0m;
    PosChangePosting? change = null;
    switch (request.PaymentMode)
    {
      case PosPaymentMode.Paid:
        if (tenderedBase < request.SaleTotalBase)
          throw new BadRequestException(ErrorCodes.Pos.Underpayment,
            $"POS Sale is underpaid by {Money(request.SaleTotalBase - tenderedBase)} {business.BaseCurrency.Code}.");
        changeDueBase = Money(tenderedBase - request.SaleTotalBase);
        break;
      case PosPaymentMode.Partial:
        if (tenderedBase <= 0 || tenderedBase >= request.SaleTotalBase)
          throw new BadRequestException(ErrorCodes.Pos.TenderInvalid,
            "A partial POS Sale must receive more than zero and less than the Sale total.");
        break;
      case PosPaymentMode.Credit:
        if (tenderedBase != 0)
          throw new BadRequestException(ErrorCodes.Pos.TenderInvalid,
            "A credit POS Sale cannot include payment. Choose Partial when money is received now.");
        break;
      default:
        throw new BadRequestException(ErrorCodes.Pos.TenderInvalid, "Select a valid POS payment mode.");
    }

    if (request.PaymentMode != PosPaymentMode.Paid && request.Change is not null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeNotDue,
        "Change can only be recorded for a fully paid POS Sale.");
    if (request.PaymentMode == PosPaymentMode.Paid && changeDueBase == 0 && request.Change is not null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeNotDue,
        "Do not record change when tender exactly settles the Sale.");
    if (request.PaymentMode == PosPaymentMode.Paid && changeDueBase > 0 && request.Change is null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeRequired,
        $"Record {changeDueBase} {business.BaseCurrency.Code} of change before completing the Sale.");
    if (request.Change is not null)
    {
      var account = accounts[request.Change.MoneyAccountId];
      if (baseCashbox is null || account.Id != baseCashbox.MoneyAccountId)
        throw new BadRequestException(ErrorCodes.Pos.BaseCashboxRequired,
          $"Change must be returned from this session's configured {business.BaseCurrency.Code} Cashbox.");
      var rate = rates[account.CurrencyId];
      var baseAmount = Money(request.Change.Amount * rate);
      if (baseAmount != changeDueBase)
        throw new BadRequestException(ErrorCodes.Pos.ChangeMismatch,
          $"Recorded change must equal {changeDueBase} {business.BaseCurrency.Code}.");

      var currentBalance = await _finance.BalanceAsync(account.Id, ct);
      var sameAccountTender = tenders.Where(tender => tender.Account.Id == account.Id)
        .Sum(tender => tender.Request.Amount);
      if (currentBalance + sameAccountTender < request.Change.Amount)
        throw new BadRequestException(ErrorCodes.Pos.ChangeBalanceInsufficient,
          $"Money Account '{account.Code}' cannot cover the recorded change.");
      change = new PosChangePosting(request.Change, account, rate, baseAmount);
    }

    return new PosSettlementPreparation(session, business, tenders, change);
  }

  internal void AddEffects(
    PosSettlementPreparation preparation,
    PosContextEntity context,
    PaymentEntity payment)
  {
    foreach (var tender in preparation.Tenders)
    {
      var moneyLine = payment.MoneyLines.Single(line =>
        line.Sequence == tender.Sequence && line.Direction == PaymentMoneyDirection.Collection);
      var tenderEntity = new PosTenderEntity
      {
        SalesInvoiceId = context.SalesInvoiceId,
        PosContext = context,
        Sequence = tender.Sequence,
        MoneyAccountId = tender.Account.Id,
        TenderedAmount = tender.Request.Amount,
        ExchangeRate = tender.ExchangeRate,
        BaseAmount = tender.BaseAmount,
        PaymentMoneyLine = moneyLine,
        PaymentMoneyLineId = moneyLine.Id
      };
      context.Tenders.Add(tenderEntity);
      _db.PosTenders.Add(tenderEntity);
    }
    if (preparation.Change is null) return;

    var change = preparation.Change;
    var changeLine = payment.MoneyLines.Single(line => line.Direction == PaymentMoneyDirection.Change);
    var changeEntity = new PosChangeEntity
    {
      SalesInvoiceId = context.SalesInvoiceId,
      PosContext = context,
      MoneyAccountId = change.Account.Id,
      Amount = change.Request.Amount,
      ExchangeRate = change.ExchangeRate,
      BaseAmount = change.BaseAmount,
      PaymentMoneyLine = changeLine,
      PaymentMoneyLineId = changeLine.Id
    };
    context.Change = changeEntity;
    _db.PosChanges.Add(changeEntity);
  }

  private static void ValidateShape(PosSettlementRequest request)
  {
    if (!Enum.IsDefined(request.PaymentMode))
      throw new BadRequestException(ErrorCodes.Pos.TenderInvalid, "Select a valid POS payment mode.");
    if (request.PaymentMode is PosPaymentMode.Paid or PosPaymentMode.Partial && request.Tenders.Count == 0)
      throw new BadRequestException(ErrorCodes.Pos.TenderRequired, "Add at least one tender line.");
    if (request.PaymentMode == PosPaymentMode.Credit && request.Tenders.Count > 0)
      throw new BadRequestException(ErrorCodes.Pos.TenderInvalid,
        "Credit POS Sales cannot include a tender. Choose Partial when money is received now.");
    if (request.PaymentMode is PosPaymentMode.Partial or PosPaymentMode.Credit
      && (request.CustomerId is null || request.CustomerId == Guid.Empty))
      throw new BadRequestException(ErrorCodes.Sales.CustomerRequired,
        "Select a customer before creating a Partial or Credit POS Sale.");
    if (request.Tenders.Any(tender => tender.MoneyAccountId == Guid.Empty || tender.Amount <= 0)
      || request.Tenders.Select(tender => tender.MoneyAccountId).Distinct().Count() != request.Tenders.Count)
      throw new BadRequestException(ErrorCodes.Pos.TenderInvalid,
        "Every tender requires a unique Money Account and an amount greater than zero.");
    if (request.Change is not null
      && (request.Change.MoneyAccountId == Guid.Empty || request.Change.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Pos.ChangeMismatch,
        "Change requires a Money Account and an amount greater than zero.");
  }

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
}

internal sealed record PosSettlementRequest(
  Guid BranchId,
  Guid PosSessionId,
  Guid? CustomerId,
  decimal SaleTotalBase,
  PosPaymentMode PaymentMode,
  List<PosTenderRequest> Tenders,
  PosChangeRequest? Change);

internal sealed record PosSettlementPreparation(
  PosSessionEntity Session,
  BusinessEntity Business,
  List<PosTenderPosting> Tenders,
  PosChangePosting? Change);

internal sealed record PosTenderPosting(
  int Sequence,
  PosTenderRequest Request,
  MoneyAccountEntity Account,
  decimal ExchangeRate,
  decimal BaseAmount);

internal sealed record PosChangePosting(
  PosChangeRequest Request,
  MoneyAccountEntity Account,
  decimal ExchangeRate,
  decimal BaseAmount);
