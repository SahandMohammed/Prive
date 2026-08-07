using Api.Infrastructure.Http;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Finance;

public sealed record FinancialMovementRequest(
  Guid AccountId,
  Guid? ContactId,
  Guid CurrencyId,
  decimal Amount,
  decimal BaseAmount,
  DateTime TransactionDateUtc,
  AccountTransactionSourceType SourceType,
  Guid SourceId,
  string? Description = null,
  Guid? ReversesTransactionId = null);

public interface IFinancialLedgerService
{
  void AddMovements(IEnumerable<FinancialMovementRequest> movements);
  Task ReverseSourceAsync(AccountTransactionSourceType sourceType, Guid sourceId, CancellationToken ct = default);
}

public sealed class FinancialLedgerService(AppDbContext db) : IFinancialLedgerService
{
  public void AddMovements(IEnumerable<FinancialMovementRequest> movements)
  {
    var entries = movements.ToList();
    if (entries.Any(x => x.Amount == 0 || x.BaseAmount == 0))
    {
      throw new BadRequestException(ErrorCodes.Finance.InvalidAmount, "Financial ledger movement amounts cannot be zero.");
    }
    if (entries.Any(x => x.Amount != x.BaseAmount))
    {
      throw new BadRequestException(
        ErrorCodes.Finance.BaseCurrencyRequired,
        "Base-currency ledger movements must have equal Amount and BaseAmount values.");
    }

    db.AccountTransactions.AddRange(entries.Select(x => new AccountTransactionEntity
    {
      AccountId = x.AccountId,
      ContactId = x.ContactId,
      CurrencyId = x.CurrencyId,
      Amount = x.Amount,
      BaseAmount = x.BaseAmount,
      TransactionDateUtc = x.TransactionDateUtc,
      SourceType = x.SourceType,
      SourceId = x.SourceId,
      Description = x.Description,
      ReversesTransactionId = x.ReversesTransactionId
    }));
  }

  public async Task ReverseSourceAsync(AccountTransactionSourceType sourceType, Guid sourceId, CancellationToken ct = default)
  {
    var originals = await db.AccountTransactions
      .AsNoTracking()
      .Where(x => x.SourceType == sourceType && x.SourceId == sourceId && x.ReversesTransactionId == null)
      .ToListAsync(ct);

    var now = DateTime.UtcNow;
    AddMovements(originals.Select(original => new FinancialMovementRequest(
      original.AccountId,
      original.ContactId,
      original.CurrencyId,
      -original.Amount,
      -original.BaseAmount,
      now,
      AccountTransactionSourceType.Reversal,
      sourceId,
      "Void reversal",
      original.Id)));
  }
}
