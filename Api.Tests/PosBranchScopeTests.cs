using Api.Infrastructure.Http;
using Api.Modules.Branch;
using Api.Modules.Currency;
using Api.Modules.Pos;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class PosBranchScopeTests
{
  [Fact]
  public async Task Session_roots_and_children_only_expose_the_selected_branch()
  {
    var (options, own, foreign, _) = await SeedAsync();
    await using var db = new AppDbContext(options, new BranchContext { BranchId = own.BranchId });
    Assert.Equal(own.RegisterId, (await db.PosRegisters.SingleAsync()).Id);
    Assert.Equal(own.Id, (await db.PosSessions.SingleAsync()).Id);
    Assert.Equal(own.Id, (await db.PosSessionOpeningCounts.SingleAsync()).PosSessionId);
    Assert.Equal(own.Id, (await db.PosSessionClosingCounts.SingleAsync()).PosSessionId);
    Assert.Equal(own.Id, (await db.PosZReports.SingleAsync()).PosSessionId);
    Assert.Equal(own.ZReport!.Id, (await db.PosZPaymentSummaries.SingleAsync()).PosZReportId);
    Assert.Equal(own.ZReport.Id, (await db.PosZDrawerSummaries.SingleAsync()).PosZReportId);
    Assert.False(await db.PosSessions.AnyAsync(session => session.Id == foreign.Id));
    Assert.Equal(2, await db.PosSessions.IgnoreQueryFilters().CountAsync());
  }

  [Theory]
  [InlineData(0)]
  [InlineData(1)]
  [InlineData(2)]
  [InlineData(3)]
  [InlineData(4)]
  [InlineData(5)]
  [InlineData(6)]
  public async Task Writes_reject_foreign_session_roots_and_references(int kind)
  {
    var (options, own, foreign, currency) = await SeedAsync();
    await using var db = new AppDbContext(options, new BranchContext { BranchId = own.BranchId });
    object row = kind switch
    {
      0 => new PosRegisterEntity { BranchId = foreign.BranchId },
      1 => new PosSessionEntity { BranchId = own.BranchId, RegisterId = foreign.RegisterId },
      2 => new PosSessionOpeningCountEntity { PosSessionId = foreign.Id, CurrencyId = currency.Id },
      3 => new PosSessionClosingCountEntity { PosSessionId = foreign.Id, CurrencyId = currency.Id },
      4 => new PosZReportEntity { BranchId = own.BranchId, PosSessionId = foreign.Id },
      5 => new PosZPaymentSummaryEntity { PosZReportId = foreign.ZReport!.Id },
      _ => new PosZDrawerSummaryEntity { PosZReportId = foreign.ZReport!.Id }
    };
    db.Add(row);
    var error = await Assert.ThrowsAsync<ForbiddenException>(() => db.SaveChangesAsync());
    Assert.Equal(ErrorCodes.Branch.ScopeMismatch, error.Code);
  }

  [Fact]
  public async Task Directly_attached_foreign_counts_cannot_be_changed_or_deleted()
  {
    var (options, own, foreign, _) = await SeedAsync();
    var foreignCountId = foreign.OpeningCounts.Single().Id;
    await using (var db = new AppDbContext(options, new BranchContext { BranchId = own.BranchId }))
    {
      var count = new PosSessionOpeningCountEntity { Id = foreignCountId, PosSessionId = own.Id };
      db.Attach(count);
      count.Amount = 10;
      await Assert.ThrowsAsync<ForbiddenException>(() => db.SaveChangesAsync());
    }
    await using (var db = new AppDbContext(options, new BranchContext { BranchId = own.BranchId }))
    {
      db.Remove(new PosSessionOpeningCountEntity { Id = foreignCountId, PosSessionId = own.Id });
      await Assert.ThrowsAsync<ForbiddenException>(() => db.SaveChangesAsync());
    }
  }

  private static async Task<(DbContextOptions<AppDbContext>, PosSessionEntity, PosSessionEntity, CurrencyEntity)> SeedAsync()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
    await using var db = new AppDbContext(options);
    var user = new UserEntity { Username = "cashier" };
    var currency = new CurrencyEntity { Code = "IQD", Name = "Dinar" };
    var sessions = new List<PosSessionEntity>();
    foreach (var code in new[] { "A", "B" })
    {
      var branch = new BranchEntity { Code = code, Name = code };
      var register = new PosRegisterEntity { Branch = branch, Code = code, Name = code };
      var session = new PosSessionEntity
      {
        Branch = branch, Register = register, CashierUser = user, SessionNumber = code,
        OpeningCounts = [new() { Currency = currency }],
        ClosingCounts = [new() { Currency = currency }],
        ZReport = new PosZReportEntity
        {
          BranchId = branch.Id, ReportNumber = code,
          PaymentSummaries = [new()], DrawerSummaries = [new()]
        }
      };
      db.Add(session);
      sessions.Add(session);
    }
    await db.SaveChangesAsync();
    return (options, sessions[0], sessions[1], currency);
  }
}
