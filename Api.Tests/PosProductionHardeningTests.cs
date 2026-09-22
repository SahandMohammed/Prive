using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Finance;
using Api.Modules.Pos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Tests;

public sealed partial class PosWorkflowTests
{
  [Fact]
  public async Task Sale_idempotency_replays_the_original_sale_and_rejects_a_changed_payload()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    var service = CreateService(db);
    var request = Request(data, [ServiceLine(data)], [new(data.IqdMoneyAccountId, 25_000)]);

    var first = await service.CompleteSaleAsync(request, data.CashierId, default);
    var replay = await service.CompleteSaleAsync(request, data.CashierId, default);

    Assert.Equal(first.Id, replay.Id);
    Assert.Single(await db.PosSales.ToListAsync());
    Assert.Single(await db.JournalEntries.Where(entry => entry.Id == first.JournalEntryId).ToListAsync());

    var reused = await Assert.ThrowsAsync<ConflictException>(() => service.CompleteSaleAsync(
      request with { Tenders = [new(data.IqdMoneyAccountId, 24_999)] }, data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.IdempotencyKeyReused, reused.Code);
    Assert.Single(await db.PosSales.ToListAsync());
  }

  [Fact]
  public async Task Drawer_cash_in_updates_the_expected_count_and_posts_balanced_ledger_entries()
  {
    await using var db = CreateDb();
    var data = await SeedAsync(db);
    await PromoteAsync(db, data.CashierId);
    var offset = new AccountEntity
    {
      Code = "7190",
      Name = "Drawer cash-in offset",
      Classification = AccountClassification.Revenue
    };
    db.Accounts.Add(offset);
    await db.SaveChangesAsync();

    var finance = new FinanceService(db, Options.Create(new FinanceOptions()));
    var service = new PosDrawerMovementService(db, finance, new PosSessionService(db, finance));
    var movement = await service.CreateAsync(data.CashierId, data.SessionId,
      new(PosDrawerMovementType.CashIn, null, data.IqdMoneyAccountId, null, offset.Id,
        100, "Opening float correction", null), default);

    Assert.Equal(PosDrawerMovementType.CashIn, movement.Type);
    Assert.Equal(100, movement.Amount);
    var ledger = await db.MoneyLedgerEntries.SingleAsync(entry => entry.Id == movement.CashboxLedgerEntryId);
    Assert.Equal(MoneyLedgerSourceType.PosDrawerMovement, ledger.SourceType);
    Assert.Equal(100, ledger.Amount);
    var journal = await db.JournalEntries.Include(entry => entry.Lines).SingleAsync(entry => entry.Id == movement.JournalEntryId);
    Assert.Equal(journal.Lines.Sum(line => line.DebitBaseAmount), journal.Lines.Sum(line => line.CreditBaseAmount));

    var x = await CreateSessionService(db).GetXReportAsync(data.CashierId, data.SessionId, default);
    var drawer = x.Drawers.Single(item => item.CurrencyId == data.IqdCurrencyId);
    Assert.Equal(100, drawer.CashInAmount);
    Assert.Equal(100, drawer.ExpectedAmount);
  }
}
