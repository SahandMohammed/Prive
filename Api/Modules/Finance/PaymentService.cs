using System.Data;
using System.Text.Json;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Dashboard;
using Api.Modules.Pos;
using Api.Modules.Sales;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Api.Modules.Finance;

public sealed class PaymentService
{
  private readonly AppDbContext _db;

  public PaymentService(AppDbContext db) => _db = db;

  public async Task<PaymentResponse> GetAsync(Guid id, CancellationToken ct = default)
  {
    var payment = await PaymentQuery().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw PaymentNotFound();
    return ToResponse(payment);
  }

  public async Task<PaymentResponse> CreateInvoicePaymentAsync(
    Guid invoiceId,
    InvoicePaymentRequest request,
    Guid userId,
    CancellationToken ct)
  {
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    try
    {
      var invoice = await RequireInvoiceAsync(invoiceId, ct);
      var payment = await CreateDirectInvoicePaymentAsync(invoice, request, userId, ct);
      await _db.SaveChangesAsync(ct);
      if (transaction is not null) await transaction.CommitAsync(ct);
      return await GetAsync(payment.Id, ct);
    }
    catch
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw;
    }
  }

  public async Task<PaymentResponse> UpdateInvoicePaymentAsync(
    Guid invoiceId,
    Guid paymentId,
    UpdateInvoicePaymentRequest request,
    Guid userId,
    CancellationToken ct)
  {
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    try
    {
      var payment = await PaymentTrackingQuery().SingleOrDefaultAsync(item => item.Id == paymentId, ct)
        ?? throw PaymentNotFound();
      EnsureDirectInvoicePayment(payment, invoiceId);
      EnsureExpectedTimestamp(payment, request.ExpectedUpdatedAtUtc);
      await EnsureNoRefundDependencyAsync(payment, ct);
      var before = Snapshot(payment);
      var invoice = await RequireInvoiceAsync(invoiceId, ct);
      var oldAmount = payment.Allocations.Single().Amount;
      var otherCollected = await _db.PaymentAllocations.AsNoTracking()
        .Where(allocation => allocation.SalesInvoiceId == invoiceId && allocation.PaymentId != payment.Id)
        .SumAsync(allocation => (decimal?)allocation.Amount, ct) ?? 0m;
      var refundReductionBase = await _db.PosRefunds.AsNoTracking()
        .Where(refund => refund.SalesInvoiceId == invoiceId && refund.Status == PosRefundStatus.Posted)
        .SumAsync(refund => (decimal?)refund.ReceivableReversalBase, ct) ?? 0m;
      var effectiveReceivable = Math.Max(Money(invoice.Total
        - (invoice.ExchangeRate > 0 ? refundReductionBase / invoice.ExchangeRate : 0m)), 0m);
      var maxAmount = Math.Max(Money(effectiveReceivable - otherCollected), oldAmount);
      if (request.Amount > maxAmount)
        throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationExceedsOutstanding,
          "A Payment correction may retain or reduce an existing overpayment, but cannot increase it.");
      var rate = await ResolveDirectInvoiceLineRateAsync(request.MoneyAccountId, invoice, request.ExchangeRate, ct);
      RemoveEffects(payment);
      payment.PaymentDate = request.PaymentDate;
      payment.Notes = Trim(request.Notes);
      payment.UpdatedAtUtc = DateTime.UtcNow;
      await PopulateEffectsAsync(payment,
        [new PaymentAllocationCommand(invoice.Id, request.Amount)],
        [new PaymentMoneyLineCommand(request.MoneyAccountId, request.Amount, rate, PaymentMoneyDirection.Collection)],
        userId, ct, allowExistingOverpayment: true);
      AddAudit(payment, userId, "edited", request.Reason, before, Snapshot(payment));
      await _db.SaveChangesAsync(ct);
      if (transaction is not null) await transaction.CommitAsync(ct);
      return await GetAsync(payment.Id, ct);
    }
    catch (DbUpdateConcurrencyException)
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw new ConflictException(ErrorCodes.Finance.PaymentConcurrencyConflict,
        "The Payment changed after it was loaded. Refresh and try again.");
    }
    catch
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw;
    }
  }

  public async Task DeleteInvoicePaymentAsync(
    Guid invoiceId,
    Guid paymentId,
    DeletePaymentRequest request,
    Guid userId,
    CancellationToken ct)
  {
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    try
    {
      var payment = await PaymentTrackingQuery().SingleOrDefaultAsync(item => item.Id == paymentId, ct)
        ?? throw PaymentNotFound();
      EnsureDirectInvoicePayment(payment, invoiceId);
      EnsureExpectedTimestamp(payment, request.ExpectedUpdatedAtUtc);
      await EnsureNoRefundDependencyAsync(payment, ct);
      var before = Snapshot(payment);
      RemoveEffects(payment);
      payment.IsDeleted = true;
      payment.DeletedAtUtc = DateTime.UtcNow;
      payment.DeletedByUserId = userId;
      payment.DeleteReason = request.Reason.Trim();
      payment.UpdatedAtUtc = payment.DeletedAtUtc.Value;
      AddAudit(payment, userId, "deleted", request.Reason, before, Snapshot(payment));
      await _db.SaveChangesAsync(ct);
      if (transaction is not null) await transaction.CommitAsync(ct);
    }
    catch (DbUpdateConcurrencyException)
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw new ConflictException(ErrorCodes.Finance.PaymentConcurrencyConflict,
        "The Payment changed after it was loaded. Refresh and try again.");
    }
    catch
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw;
    }
  }

  internal async Task<PaymentEntity> CreateAsync(
    CreatePaymentCommand command,
    Guid userId,
    CancellationToken ct)
  {
    var payment = new PaymentEntity
    {
      DocumentNumber = await NextDocumentNumberAsync(ct),
      BranchId = command.BranchId,
      CustomerId = command.CustomerId,
      PaymentDate = command.PaymentDate,
      CurrencyId = command.CurrencyId,
      Origin = command.Origin,
      SourceSalesInvoiceId = command.SourceSalesInvoiceId,
      Notes = Trim(command.Notes),
      CreatedByUserId = userId
    };
    await PopulateEffectsAsync(payment, command.Allocations, command.MoneyLines, userId, ct, false);
    _db.Payments.Add(payment);
    return payment;
  }

  internal async Task<PaymentEntity> CreateDirectInvoicePaymentAsync(
    SalesInvoiceEntity invoice,
    InvoicePaymentRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var rate = await ResolveDirectInvoiceLineRateAsync(request.MoneyAccountId, invoice, request.ExchangeRate, ct);
    return await CreateAsync(new CreatePaymentCommand(
      invoice.BranchId, invoice.CustomerId, request.PaymentDate, invoice.CurrencyId,
      PaymentOrigin.SalesInvoice, invoice.Id, request.Notes,
      [new PaymentAllocationCommand(invoice.Id, request.Amount)],
      [new PaymentMoneyLineCommand(request.MoneyAccountId, request.Amount, rate,
        PaymentMoneyDirection.Collection)]), userId, ct);
  }

  internal async Task DeleteOwnedPaymentAsync(PaymentEntity payment, string reason, Guid userId, CancellationToken ct)
  {
    await EnsureNoRefundDependencyAsync(payment, ct);
    var before = Snapshot(payment);
    RemoveEffects(payment);
    payment.IsDeleted = true;
    payment.DeletedAtUtc = DateTime.UtcNow;
    payment.DeletedByUserId = userId;
    payment.DeleteReason = reason.Trim();
    payment.UpdatedAtUtc = payment.DeletedAtUtc.Value;
    AddAudit(payment, userId, "deleted", reason, before, Snapshot(payment));
  }

  internal Task<PaymentEntity?> FindTrackedAsync(Guid id, CancellationToken ct) =>
    PaymentTrackingQuery().SingleOrDefaultAsync(payment => payment.Id == id, ct);

  internal async Task ReplaceOwnedPaymentAsync(
    PaymentEntity payment,
    DateOnly paymentDate,
    string? notes,
    IReadOnlyList<PaymentAllocationCommand> allocations,
    IReadOnlyList<PaymentMoneyLineCommand> moneyLines,
    string reason,
    Guid userId,
    CancellationToken ct)
  {
    await EnsureNoRefundDependencyAsync(payment, ct);
    var before = Snapshot(payment);
    RemoveEffects(payment);
    payment.PaymentDate = paymentDate;
    payment.Notes = Trim(notes);
    payment.UpdatedAtUtc = DateTime.UtcNow;
    await PopulateEffectsAsync(payment, allocations, moneyLines, userId, ct, allowExistingOverpayment: true);
    AddAudit(payment, userId, "edited", reason, before, Snapshot(payment));
  }

  private async Task PopulateEffectsAsync(
    PaymentEntity payment,
    IReadOnlyList<PaymentAllocationCommand> allocationCommands,
    IReadOnlyList<PaymentMoneyLineCommand> moneyLineCommands,
    Guid userId,
    CancellationToken ct,
    bool allowExistingOverpayment)
  {
    if (allocationCommands.Count == 0 || allocationCommands.Any(item => item.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationsRequired,
        "A Payment must have at least one positive invoice allocation.");
    if (allocationCommands.Select(item => item.SalesInvoiceId).Distinct().Count() != allocationCommands.Count)
      throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationDuplicate,
        "A Sales Invoice may be allocated only once per Payment.");
    if (moneyLineCommands.Count == 0 || moneyLineCommands.Any(item => item.Amount <= 0 || item.ExchangeRate <= 0))
      throw new BadRequestException(ErrorCodes.Finance.PaymentMoneyLinesInvalid,
        "A Payment must have valid positive Money Account movements.");

    var invoiceIds = allocationCommands.Select(item => item.SalesInvoiceId).ToArray();
    var invoices = _db.ChangeTracker.Entries<SalesInvoiceEntity>()
      .Where(entry => entry.State != EntityState.Deleted
        && invoiceIds.Contains(entry.Entity.Id)
        && entry.Entity.Status == SalesInvoiceStatus.Posted)
      .Select(entry => entry.Entity)
      .ToDictionary(invoice => invoice.Id);
    var persistedInvoiceIds = invoiceIds.Where(id => !invoices.ContainsKey(id)).ToArray();
    var persistedInvoices = await _db.SalesInvoices
      .Where(invoice => persistedInvoiceIds.Contains(invoice.Id) && invoice.Status == SalesInvoiceStatus.Posted)
      .ToListAsync(ct);
    foreach (var invoice in persistedInvoices) invoices[invoice.Id] = invoice;
    if (invoices.Count != invoiceIds.Length)
      throw new BadRequestException(ErrorCodes.Finance.SalesInvoiceInvalid,
        "Every allocation must reference an active Sales Invoice.");
    if (invoices.Values.Any(invoice => invoice.CustomerId != payment.CustomerId))
      throw new BadRequestException(ErrorCodes.Finance.PaymentCustomerMismatch,
        "Every allocated Sales Invoice must belong to the Payment customer.");
    if (invoices.Values.Any(invoice => invoice.BranchId != payment.BranchId))
      throw new BadRequestException(ErrorCodes.Finance.PaymentBranchMismatch,
        "Every allocated Sales Invoice must belong to the Payment branch.");
    if (invoices.Values.Any(invoice => invoice.CurrencyId != payment.CurrencyId))
      throw new BadRequestException(ErrorCodes.Finance.PaymentCurrencyMismatch,
        "Every allocated Sales Invoice must use the Payment allocation currency.");
    if (payment.Origin is PaymentOrigin.SalesInvoice or PaymentOrigin.Pos
      && (allocationCommands.Count != 1 || payment.SourceSalesInvoiceId != allocationCommands[0].SalesInvoiceId))
      throw new BadRequestException(ErrorCodes.Finance.PaymentSourceInvoiceMismatch,
        "This Payment must allocate exactly once to its source Sales Invoice.");

    var accountIds = moneyLineCommands.Select(item => item.MoneyAccountId).Distinct().ToArray();
    foreach (var accountId in accountIds)
      await EnsureMoneyAccountAccessAsync(accountId, userId, ct);
    var accounts = await _db.MoneyAccounts.Include(account => account.AccountingAccount)
      .Where(account => accountIds.Contains(account.Id)).ToDictionaryAsync(account => account.Id, ct);
    if (accounts.Count != accountIds.Length)
      throw new BadRequestException(ErrorCodes.Finance.MoneyAccountInvalid, "Select existing Money Accounts.");
    foreach (var account in accounts.Values)
    {
      FinanceService.EnsureActive(account);
      if (account.BranchId != payment.BranchId)
        throw new BadRequestException(ErrorCodes.Finance.PaymentBranchMismatch,
          "Every Payment Money Account must belong to the Payment branch.");
    }

    var baseCurrencyId = invoices.Values.Select(invoice => invoice.BaseCurrencyId).Distinct().Single();
    var allocations = allocationCommands.Select(command => new PaymentAllocationEntity
    {
      Payment = payment,
      SalesInvoiceId = command.SalesInvoiceId,
      Amount = Money(command.Amount),
      BaseAmount = Money(command.Amount * invoices[command.SalesInvoiceId].ExchangeRate)
    }).ToList();
    var amount = Money(allocations.Sum(item => item.Amount));
    var baseAmount = Money(allocations.Sum(item => item.BaseAmount));

    if (!allowExistingOverpayment)
    {
      foreach (var allocation in allocations)
      {
        var invoice = invoices[allocation.SalesInvoiceId];
        var alreadyCollected = await _db.PaymentAllocations.AsNoTracking()
          .Where(item => item.SalesInvoiceId == invoice.Id && !item.Payment.IsDeleted)
          .SumAsync(item => (decimal?)item.Amount, ct) ?? 0m;
        var refundReductionBase = await _db.PosRefunds.AsNoTracking()
          .Where(refund => refund.SalesInvoiceId == invoice.Id && refund.Status == PosRefundStatus.Posted)
          .SumAsync(refund => (decimal?)refund.ReceivableReversalBase, ct) ?? 0m;
        var refundReduction = invoice.ExchangeRate > 0 ? Money(refundReductionBase / invoice.ExchangeRate) : 0m;
        var outstanding = Math.Max(Money(invoice.Total - refundReduction - alreadyCollected), 0m);
        if (allocation.Amount > outstanding)
          throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationExceedsOutstanding,
            $"Allocation for Sales Invoice '{invoice.DocumentNumber}' exceeds its outstanding amount.");
      }
    }

    var moneyLines = moneyLineCommands.Select((command, index) =>
    {
      var account = accounts[command.MoneyAccountId];
      return new PaymentMoneyLineEntity
      {
        Payment = payment,
        Sequence = index + 1,
        MoneyAccountId = account.Id,
        CurrencyId = account.CurrencyId,
        Amount = Money(command.Amount),
        ExchangeRate = command.ExchangeRate,
        BaseAmount = Money(command.Amount * command.ExchangeRate),
        Direction = command.Direction
      };
    }).ToList();
    var moneyBase = Money(moneyLines.Sum(line => line.Direction == PaymentMoneyDirection.Collection
      ? line.BaseAmount : -line.BaseAmount));
    if (moneyBase != baseAmount)
      throw new BadRequestException(ErrorCodes.Finance.PaymentMoneyLinesUnbalanced,
        "Net Money Account movements must equal the Payment allocation base amount.");

    var postedAt = DateTime.UtcNow;
    var journal = new JournalEntryEntity
    {
      EntryDate = payment.PaymentDate,
      Reference = payment.DocumentNumber,
      Description = $"Customer payment {payment.DocumentNumber}",
      BranchId = payment.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = postedAt
    };
    foreach (var line in moneyLines)
    {
      var account = accounts[line.MoneyAccountId];
      journal.Lines.Add(new JournalLineEntity
      {
        AccountId = account.AccountingAccountId,
        CurrencyId = line.CurrencyId,
        ExchangeRate = line.ExchangeRate,
        OriginalDebitAmount = line.Direction == PaymentMoneyDirection.Collection ? line.Amount : 0m,
        OriginalCreditAmount = line.Direction == PaymentMoneyDirection.Change ? line.Amount : 0m,
        DebitBaseAmount = line.Direction == PaymentMoneyDirection.Collection ? line.BaseAmount : 0m,
        CreditBaseAmount = line.Direction == PaymentMoneyDirection.Change ? line.BaseAmount : 0m,
        Description = line.Direction == PaymentMoneyDirection.Collection
          ? $"Collected into {account.Code}" : $"Change returned from {account.Code}"
      });
    }
    foreach (var group in allocations.GroupBy(item => new
      {
        AccountId = invoices[item.SalesInvoiceId].AccountsReceivableAccountId,
        invoices[item.SalesInvoiceId].CurrencyId,
        invoices[item.SalesInvoiceId].ExchangeRate
      }))
    {
      if (group.Key.AccountId is null)
        throw new BadRequestException(ErrorCodes.Finance.PaymentReceivableAccountMissing,
          "Every allocated Sales Invoice must have an Accounts Receivable account.");
      journal.Lines.Add(new JournalLineEntity
      {
        AccountId = group.Key.AccountId.Value,
        CurrencyId = group.Key.CurrencyId,
        ExchangeRate = group.Key.ExchangeRate,
        OriginalCreditAmount = Money(group.Sum(item => item.Amount)),
        CreditBaseAmount = Money(group.Sum(item => item.BaseAmount)),
        Description = "Customer receivable settled"
      });
    }

    payment.Amount = amount;
    payment.BaseAmount = baseAmount;
    payment.BaseCurrencyId = baseCurrencyId;
    payment.JournalEntry = journal;
    payment.JournalEntryId = journal.Id;
    payment.Allocations = allocations;
    payment.MoneyLines = moneyLines;
    _db.PaymentAllocations.AddRange(allocations);
    _db.PaymentMoneyLines.AddRange(moneyLines);
    foreach (var line in moneyLines)
    {
      var account = accounts[line.MoneyAccountId];
      var sign = line.Direction == PaymentMoneyDirection.Collection ? 1m : -1m;
      var ledger = FinanceService.LedgerEntry(account, payment.PaymentDate,
        MoneyLedgerSourceType.Payment, payment.Id, payment.DocumentNumber,
        sign * line.Amount, sign * line.BaseAmount, baseCurrencyId, line.ExchangeRate,
        journal.Id, userId, payment.Notes, postedAt);
      line.MoneyLedgerEntry = ledger;
      line.MoneyLedgerEntryId = ledger.Id;
      _db.MoneyLedgerEntries.Add(ledger);
    }
    _db.JournalEntries.Add(journal);
  }

  private void RemoveEffects(PaymentEntity payment)
  {
    var moneyLines = payment.MoneyLines.ToList();
    var ledgers = moneyLines.Select(line => line.MoneyLedgerEntry).ToList();
    _db.PaymentMoneyLines.RemoveRange(moneyLines);
    _db.MoneyLedgerEntries.RemoveRange(ledgers);
    _db.PaymentAllocations.RemoveRange(payment.Allocations);
    if (payment.JournalEntry is not null) _db.JournalEntries.Remove(payment.JournalEntry);
    payment.MoneyLines.Clear();
    payment.Allocations.Clear();
    payment.JournalEntry = null;
    payment.JournalEntryId = null;
  }

  private async Task EnsureNoRefundDependencyAsync(PaymentEntity payment, CancellationToken ct)
  {
    var invoiceIds = payment.Allocations.Select(item => item.SalesInvoiceId).ToArray();
    if (await _db.PosRefunds.AnyAsync(refund => invoiceIds.Contains(refund.SalesInvoiceId)
      && refund.Status == PosRefundStatus.Posted, ct))
      throw new ConflictException(ErrorCodes.Finance.PaymentHasRefundDependency,
        "This Payment cannot be changed because an allocated invoice has a posted refund or void.");
  }

  private async Task<SalesInvoiceEntity> RequireInvoiceAsync(Guid invoiceId, CancellationToken ct)
  {
    var invoice = await _db.SalesInvoices
      .Include(item => item.PosContext)
      .SingleOrDefaultAsync(item => item.Id == invoiceId && item.Status == SalesInvoiceStatus.Posted, ct)
      ?? throw new NotFoundException(ErrorCodes.Sales.InvoiceNotFound, "Sales Invoice not found.");
    if (invoice.PosContext is not null)
      throw new BadRequestException(ErrorCodes.Finance.PaymentSourceInvoiceMismatch,
        "A POS invoice settlement can only be changed through the POS settlement workflow.");
    return invoice;
  }

  private async Task<decimal> ResolveDirectInvoiceLineRateAsync(
    Guid accountId,
    SalesInvoiceEntity invoice,
    decimal? explicitRate,
    CancellationToken ct)
  {
    var account = await _db.MoneyAccounts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == accountId, ct)
      ?? throw new NotFoundException(ErrorCodes.Finance.MoneyAccountNotFound, "Money Account not found.");
    if (account.CurrencyId != invoice.CurrencyId)
      throw new BadRequestException(ErrorCodes.Finance.PaymentMoneyAccountCurrencyMismatch,
        "A direct Sales Invoice Payment must use a Money Account in the invoice currency.");

    var expectedRate = invoice.CurrencyId == invoice.BaseCurrencyId ? 1m : invoice.ExchangeRate;
    if (explicitRate is not null
      && decimal.Round(explicitRate.Value, 6, MidpointRounding.AwayFromZero)
        != decimal.Round(expectedRate, 6, MidpointRounding.AwayFromZero))
      throw new BadRequestException(ErrorCodes.Finance.PaymentExchangeRateMismatch,
        "The Payment exchange rate must match the Sales Invoice exchange rate.");
    return expectedRate;
  }

  private async Task EnsureMoneyAccountAccessAsync(Guid accountId, Guid userId, CancellationToken ct)
  {
    var hasAccess = await _db.MoneyAccountAccess.AsNoTracking().AnyAsync(access =>
      access.MoneyAccountId == accountId && access.UserId == userId
      && access.AccessLevel == MoneyAccountAccessLevel.Operate, ct);
    if (!hasAccess)
      throw new ForbiddenException(ErrorCodes.Finance.MoneyAccountAccessDenied,
        "You do not have operating access to this Money Account.");
  }

  private async Task<string> NextDocumentNumberAsync(CancellationToken ct)
  {
    long value;
    if (_db.Database.ProviderName?.Contains("Npgsql", StringComparison.Ordinal) == true)
    {
      var connection = _db.Database.GetDbConnection();
      var closeConnection = connection.State != ConnectionState.Open;
      if (closeConnection) await connection.OpenAsync(ct);
      try
      {
        await using var command = connection.CreateCommand();
        command.Transaction = _db.Database.CurrentTransaction?.GetDbTransaction();
        command.CommandText = """
          INSERT INTO payment_document_counters ("Id", "NextValue")
          VALUES (1, 2)
          ON CONFLICT ("Id") DO UPDATE
          SET "NextValue" = payment_document_counters."NextValue" + 1
          RETURNING "NextValue" - 1;
          """;
        var result = await command.ExecuteScalarAsync(ct);
        if (result is null or DBNull)
          throw new InvalidOperationException("Payment document counter did not return a value.");
        value = Convert.ToInt64(result);
      }
      finally
      {
        if (closeConnection) await connection.CloseAsync();
      }
    }
    else
    {
      var counter = await _db.PaymentDocumentCounters.SingleOrDefaultAsync(item => item.Id == 1, ct);
      if (counter is null)
      {
        counter = new PaymentDocumentCounterEntity { Id = 1, NextValue = 1 };
        _db.PaymentDocumentCounters.Add(counter);
      }
      value = counter.NextValue++;
    }
    return $"PAY-{value:000000}";
  }

  private IQueryable<PaymentEntity> PaymentQuery() => _db.Payments.AsNoTracking()
    .Include(payment => payment.Customer)
    .Include(payment => payment.Currency)
    .Include(payment => payment.BaseCurrency)
    .Include(payment => payment.CreatedByUser)
    .Include(payment => payment.SourceSalesInvoice)
    .Include(payment => payment.SourceCustomerReceipt)
    .Include(payment => payment.Allocations).ThenInclude(allocation => allocation.SalesInvoice)
    .Include(payment => payment.MoneyLines).ThenInclude(line => line.MoneyAccount)
    .ThenInclude(account => account.Currency)
    .Where(payment => !payment.IsDeleted);

  private IQueryable<PaymentEntity> PaymentTrackingQuery() => _db.Payments
    .Include(payment => payment.Allocations).ThenInclude(allocation => allocation.SalesInvoice)
    .Include(payment => payment.MoneyLines).ThenInclude(line => line.MoneyLedgerEntry)
    .Include(payment => payment.JournalEntry).ThenInclude(journal => journal!.Lines)
    .Where(payment => !payment.IsDeleted);

  private static PaymentResponse ToResponse(PaymentEntity payment) => new(
    payment.Id, payment.DocumentNumber, payment.BranchId, payment.CustomerId, payment.Customer.Name,
    payment.PaymentDate, payment.CurrencyId, payment.Currency.Code, payment.BaseCurrencyId,
    payment.BaseCurrency.Code, payment.Amount, payment.BaseAmount, payment.Origin,
    payment.SourceSalesInvoiceId,
    payment.Origin switch
    {
      PaymentOrigin.SalesInvoice => payment.SourceSalesInvoiceId,
      PaymentOrigin.CustomerReceipt => payment.SourceCustomerReceipt?.Id,
      PaymentOrigin.Pos => payment.SourceSalesInvoiceId,
      _ => null
    },
    payment.Origin switch
    {
      PaymentOrigin.SalesInvoice => payment.SourceSalesInvoice?.DocumentNumber,
      PaymentOrigin.CustomerReceipt => payment.SourceCustomerReceipt?.DocumentNumber,
      PaymentOrigin.Pos => payment.SourceSalesInvoice?.DocumentNumber,
      _ => null
    },
    payment.Notes, payment.JournalEntryId!.Value,
    payment.CreatedByUserId, payment.CreatedByUser.Username, payment.CreatedAtUtc, payment.UpdatedAtUtc,
    payment.Allocations.OrderBy(item => item.SalesInvoice.DocumentNumber).Select(item =>
      new PaymentAllocationResponse(item.Id, item.SalesInvoiceId, item.SalesInvoice.DocumentNumber,
        item.Amount, item.BaseAmount)).ToList(),
    payment.MoneyLines.OrderBy(item => item.Sequence).Select(item =>
      new PaymentMoneyLineResponse(item.Id, item.Sequence, item.MoneyAccountId, item.MoneyAccount.Code,
        item.MoneyAccount.Name, item.CurrencyId, item.MoneyAccount.Currency.Code, item.Amount,
        item.ExchangeRate, item.BaseAmount, item.Direction, item.MoneyLedgerEntryId)).ToList());

  private static void EnsureDirectInvoicePayment(PaymentEntity payment, Guid invoiceId)
  {
    if (payment.Origin != PaymentOrigin.SalesInvoice || payment.SourceSalesInvoiceId != invoiceId
      || payment.Allocations.Count != 1 || payment.Allocations.Single().SalesInvoiceId != invoiceId)
      throw new BadRequestException(ErrorCodes.Finance.PaymentSourceInvoiceMismatch,
        "This Payment is not a direct Payment for the selected Sales Invoice.");
  }

  private static void EnsureExpectedTimestamp(PaymentEntity payment, DateTime expected) 
  {
    if (payment.UpdatedAtUtc != expected)
      throw new ConflictException(ErrorCodes.Finance.PaymentConcurrencyConflict,
        "The Payment changed after it was loaded. Refresh and try again.");
  }

  private void AddAudit(PaymentEntity payment, Guid userId, string action, string reason, string before, string after) =>
    _db.ActivityLogs.Add(new ActivityLogEntity
    {
      BranchId = payment.BranchId,
      UserId = userId,
      Action = action,
      EntityType = "Payment",
      EntityId = payment.Id,
      DocumentNumber = payment.DocumentNumber,
      Description = action == "deleted" ? "Deleted customer Payment" : "Edited customer Payment",
      Reason = reason.Trim(),
      BeforeState = before,
      AfterState = after,
      TimestampUtc = DateTime.UtcNow
    });

  private static string Snapshot(PaymentEntity payment) => JsonSerializer.Serialize(new
  {
    payment.Id,
    payment.DocumentNumber,
    payment.CustomerId,
    payment.BranchId,
    payment.CurrencyId,
    payment.Amount,
    payment.BaseAmount,
    payment.PaymentDate,
    payment.Origin,
    payment.SourceSalesInvoiceId,
    payment.Notes,
    payment.IsDeleted,
    Allocations = payment.Allocations.Select(item => new { item.SalesInvoiceId, item.Amount, item.BaseAmount }),
    MoneyLines = payment.MoneyLines.Select(item => new
      { item.MoneyAccountId, item.Amount, item.ExchangeRate, item.BaseAmount, item.Direction })
  });

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
  private static NotFoundException PaymentNotFound() =>
    new(ErrorCodes.Finance.PaymentNotFound, "Payment not found.");
}
