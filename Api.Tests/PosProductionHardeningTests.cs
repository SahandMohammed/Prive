using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using Npgsql;

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

  [Fact]
  public async Task Competing_drawer_movement_numbers_return_a_typed_conflict_without_partial_postings()
  {
    var databaseName = Guid.NewGuid().ToString();
    var databaseRoot = new InMemoryDatabaseRoot();
    TestData data;
    Guid offsetAccountId;
    await using (var seed = CreateDb(databaseName, databaseRoot: databaseRoot))
    {
      data = await SeedAsync(seed);
      await PromoteAsync(seed, data.CashierId);
      var offset = new AccountEntity
      {
        Code = "7191",
        Name = "Drawer concurrency offset",
        Classification = AccountClassification.Revenue
      };
      seed.Accounts.Add(offset);
      await seed.SaveChangesAsync();
      offsetAccountId = offset.Id;
    }

    var conflict = new CoordinatedUniqueViolationInterceptor();
    await using var firstDb = CreateDb(databaseName, data.BranchId, databaseRoot, conflict);
    await using var secondDb = CreateDb(databaseName, data.BranchId, databaseRoot, conflict);
    var request = new CreatePosDrawerMovementRequest(
      PosDrawerMovementType.CashIn, null, data.IqdMoneyAccountId, null, offsetAccountId,
      100, "Concurrent float correction", null);
    var results = await Task.WhenAll(
      CaptureAsync(() => CreateDrawerService(firstDb).CreateAsync(data.CashierId, data.SessionId, request, default)),
      CaptureAsync(() => CreateDrawerService(secondDb).CreateAsync(data.CashierId, data.SessionId, request, default)));

    var winner = Assert.Single(results, result => result.Value is not null).Value!;
    var loser = Assert.IsType<ConflictException>(Assert.Single(results, result => result.Error is not null).Error);
    Assert.Equal(ErrorCodes.Pos.DrawerMovementConflict, loser.Code);

    await using var observer = CreateDb(databaseName, data.BranchId, databaseRoot);
    var movement = Assert.Single(await observer.PosDrawerMovements
      .Where(item => item.Id == winner.Id && item.DocumentNumber == "DWM-000001").ToListAsync());
    Assert.Single(await observer.JournalEntries.Where(entry => entry.Id == movement.JournalEntryId).ToListAsync());
    Assert.Equal(2, await observer.JournalLines.CountAsync(line => line.JournalEntryId == movement.JournalEntryId));
    Assert.Single(await observer.MoneyLedgerEntries.Where(entry =>
      entry.SourceType == MoneyLedgerSourceType.PosDrawerMovement && entry.SourceDocumentId == movement.Id).ToListAsync());
    Assert.Single(await observer.PosDrawerMovements.ToListAsync());
  }

  [Fact]
  public async Task Simultaneous_identical_sale_requests_replay_one_financial_posting()
  {
    var databaseName = Guid.NewGuid().ToString();
    var databaseRoot = new InMemoryDatabaseRoot();
    TestData data;
    CompletePosSaleRequest request;
    await using (var seed = CreateDb(databaseName, databaseRoot: databaseRoot))
    {
      data = await SeedAsync(seed);
      request = Request(data, [ProductLine(data)], [new(data.IqdMoneyAccountId, 15_000)]);
    }

    var conflict = new CoordinatedUniqueViolationInterceptor();
    await using var firstDb = CreateDb(databaseName, data.BranchId, databaseRoot, conflict);
    await using var secondDb = CreateDb(databaseName, data.BranchId, databaseRoot, conflict);
    var results = await Task.WhenAll(
      CaptureAsync(() => CreateService(firstDb).CompleteSaleAsync(request, data.CashierId, default)),
      CaptureAsync(() => CreateService(secondDb).CompleteSaleAsync(request, data.CashierId, default)));

    Assert.All(results, result => Assert.Null(result.Error));
    var sale = Assert.IsType<PosSaleResponse>(results[0].Value);
    Assert.All(results, result => Assert.Equal(sale.Id, result.Value!.Id));

    await using var observer = CreateDb(databaseName, data.BranchId, databaseRoot);
    var persisted = Assert.Single(await observer.PosSales
      .Where(item => item.ClientRequestId == request.ClientRequestId).ToListAsync());
    var invoice = Assert.Single(await observer.SalesInvoices.Where(item => item.Id == persisted.SalesInvoiceId).ToListAsync());
    Assert.Equal(sale.Id, persisted.Id);
    Assert.Single(await observer.PosTenders.Where(item => item.PosSaleId == persisted.Id).ToListAsync());
    Assert.Empty(await observer.PosChanges.Where(item => item.PosSaleId == persisted.Id).ToListAsync());
    Assert.Single(await observer.MoneyLedgerEntries.Where(item =>
      item.SourceType == MoneyLedgerSourceType.PosSale && item.SourceDocumentId == persisted.Id).ToListAsync());
    Assert.Single(await observer.JournalEntries.Where(item => item.Id == invoice.JournalEntryId).ToListAsync());
    Assert.Single(await observer.StockMovements.Where(item => item.Reference == persisted.DocumentNumber
      && item.Type == StockMovementType.Sale).ToListAsync());

    var reused = await Assert.ThrowsAsync<ConflictException>(() => CreateService(observer).CompleteSaleAsync(
      request with { Tenders = [new(data.IqdMoneyAccountId, 14_999)] }, data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.IdempotencyKeyReused, reused.Code);
    Assert.Equal(15_000, (await observer.PosTenders.SingleAsync(item => item.PosSaleId == persisted.Id)).TenderedAmount);
    Assert.Single(await observer.PosSales.Where(item => item.ClientRequestId == request.ClientRequestId).ToListAsync());
  }

  [Theory]
  [InlineData(false)]
  [InlineData(true)]
  public async Task Simultaneous_identical_refund_or_void_requests_replay_one_financial_posting(bool isVoid)
  {
    var databaseName = Guid.NewGuid().ToString();
    var databaseRoot = new InMemoryDatabaseRoot();
    TestData data;
    PosSaleResponse sale;
    CreatePosRefundRequest refundRequest = null!;
    VoidPosSaleRequest voidRequest = null!;
    await using (var seed = CreateDb(databaseName, databaseRoot: databaseRoot))
    {
      data = await SeedAsync(seed);
      sale = await CreateService(seed).CompleteSaleAsync(
        Request(data, [ProductLine(data)], [new(data.IqdMoneyAccountId, 15_000)]), data.CashierId, default);
      await PromoteAsync(seed, data.CashierId);
      if (isVoid)
      {
        voidRequest = new VoidPosSaleRequest(data.SessionId, PosRefundReason.DuplicateSale, "Approved void",
          [sale.Lines.Single().Id], [new(data.IqdMoneyAccountId, 15_000)], Guid.NewGuid());
      }
      else
      {
        refundRequest = new CreatePosRefundRequest(data.SessionId, PosRefundReason.ProductReturned, "Approved refund",
          [new(sale.Lines.Single().Id, 1, true)], [new(data.IqdMoneyAccountId, 15_000)], Guid.NewGuid());
      }
    }

    var conflict = new CoordinatedUniqueViolationInterceptor();
    await using var firstDb = CreateDb(databaseName, data.BranchId, databaseRoot, conflict);
    await using var secondDb = CreateDb(databaseName, data.BranchId, databaseRoot, conflict);
    Task<PosRefundResponse> Post(PosRefundService service) => isVoid
      ? service.VoidRemainingAsync(sale.Id, voidRequest, data.CashierId, default)
      : service.PostRefundAsync(sale.Id, refundRequest, data.CashierId, default);
    var results = await Task.WhenAll(
      CaptureAsync(() => Post(CreateRefundService(firstDb))),
      CaptureAsync(() => Post(CreateRefundService(secondDb))));

    Assert.All(results, result => Assert.Null(result.Error));
    var refund = Assert.IsType<PosRefundResponse>(results[0].Value);
    Assert.All(results, result => Assert.Equal(refund.Id, result.Value!.Id));
    Assert.Equal(isVoid, refund.IsVoid);

    await using var observer = CreateDb(databaseName, data.BranchId, databaseRoot);
    var persisted = Assert.Single(await observer.PosRefunds
      .Where(item => item.ClientRequestId == (isVoid ? voidRequest.ClientRequestId : refundRequest.ClientRequestId)).ToListAsync());
    Assert.Single(await observer.PosRefundLines.Where(item => item.PosRefundId == persisted.Id).ToListAsync());
    Assert.Single(await observer.PosRefundTenders.Where(item => item.PosRefundId == persisted.Id).ToListAsync());
    Assert.Single(await observer.JournalEntries.Where(item => item.Id == persisted.JournalEntryId).ToListAsync());
    Assert.Single(await observer.MoneyLedgerEntries.Where(item =>
      item.SourceType == MoneyLedgerSourceType.PosRefund && item.SourceDocumentId == persisted.Id).ToListAsync());
    Assert.Single(await observer.StockMovements.Where(item => item.PosRefundLineId != null).ToListAsync());

    var reused = await Assert.ThrowsAsync<ConflictException>(() => isVoid
      ? CreateRefundService(observer).VoidRemainingAsync(sale.Id,
        voidRequest with { Notes = "Changed void reason" }, data.CashierId, default)
      : CreateRefundService(observer).PostRefundAsync(sale.Id,
        refundRequest with { Notes = "Changed refund reason" }, data.CashierId, default));
    Assert.Equal(ErrorCodes.Pos.IdempotencyKeyReused, reused.Code);
    Assert.Single(await observer.PosRefunds.Where(item => item.Id == persisted.Id).ToListAsync());
  }

  private static PosDrawerMovementService CreateDrawerService(AppDbContext db)
  {
    var finance = new FinanceService(db, Options.Create(new FinanceOptions()));
    return new PosDrawerMovementService(db, finance, new PosSessionService(db, finance));
  }

  private static async Task<ConcurrentResult<T>> CaptureAsync<T>(Func<Task<T>> operation)
  {
    try { return new ConcurrentResult<T>(await operation(), null); }
    catch (Exception exception) { return new ConcurrentResult<T>(default, exception); }
  }

  private sealed record ConcurrentResult<T>(T? Value, Exception? Error);

  private sealed class CoordinatedUniqueViolationInterceptor : SaveChangesInterceptor
  {
    private readonly TaskCompletionSource<bool> _secondSaveStarted = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly TaskCompletionSource<bool> _firstSaveCompleted = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int _saveAttempts;

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
      DbContextEventData eventData,
      InterceptionResult<int> result,
      CancellationToken cancellationToken = default)
    {
      if (Interlocked.Increment(ref _saveAttempts) == 1)
      {
        await _secondSaveStarted.Task.WaitAsync(cancellationToken);
        return result;
      }

      _secondSaveStarted.TrySetResult(true);
      await _firstSaveCompleted.Task.WaitAsync(cancellationToken);
      throw new PostgresException("Duplicate drawer or idempotency key", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation);
    }

    public override ValueTask<int> SavedChangesAsync(
      SaveChangesCompletedEventData eventData,
      int result,
      CancellationToken cancellationToken = default)
    {
      _firstSaveCompleted.TrySetResult(true);
      return ValueTask.FromResult(result);
    }
  }
}
