using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Api.Shared.Time;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Pos;

public sealed class PosService
{
  private readonly AppDbContext _db;
  private readonly SalesService _sales;
  private readonly FinanceService _finance;
  private readonly PosSessionService _sessions;

  public PosService(AppDbContext db, SalesService sales, FinanceService finance, PosSessionService sessions)
  {
    _db = db;
    _sales = sales;
    _finance = finance;
    _sessions = sessions;
  }

  public async Task<PosSetupResponse> GetSetupAsync(Guid userId, CancellationToken ct)
  {
    var business = await _db.Businesses.AsNoTracking().Include(item => item.BaseCurrency)
      .SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw BusinessNotConfigured();
    var asOfUtc = DateTime.UtcNow;

    var branches = await _db.Branches.AsNoTracking().Where(branch => branch.IsActive && (_db.SelectedBranchId == null || branch.Id == _db.SelectedBranchId))
      .OrderByDescending(branch => branch.IsMainBranch).ThenBy(branch => branch.Name)
      .Select(branch => new PosBranchResponse(branch.Id, branch.Code, branch.Name, branch.IsMainBranch))
      .ToListAsync(ct);
    var warehouses = await _db.Warehouses.AsNoTracking().Where(warehouse => warehouse.IsActive && warehouse.Branch.IsActive)
      .OrderBy(warehouse => warehouse.Name)
      .Select(warehouse => new PosWarehouseResponse(warehouse.Id, warehouse.Code, warehouse.Name, warehouse.BranchId))
      .ToListAsync(ct);
    var serviceCategories = await _db.ServiceCategories.AsNoTracking().Where(category => category.IsActive)
      .Select(category => new PosCategoryResponse(category.Id, category.Name, PosCatalogItemType.Service))
      .ToListAsync(ct);
    var productCategories = await _db.ProductCategories.AsNoTracking().Where(category => category.IsActive)
      .Select(category => new PosCategoryResponse(category.Id, category.Name, PosCatalogItemType.Product))
      .ToListAsync(ct);
    var categories = serviceCategories.Concat(productCategories)
      .OrderBy(category => category.ItemType).ThenBy(category => category.Name).ToList();
    var selectedBranchId = _db.SelectedBranchId;
    var professionals = await _db.Users.AsNoTracking()
      .Where(user => user.IsActive && user.Role == UserRole.Professional
        && (selectedBranchId == null || _db.UserBranchAccess.Any(access => access.UserId == user.Id && access.BranchId == selectedBranchId)))
      .OrderBy(user => user.Username)
      .Select(user => new PosProfessionalResponse(user.Id, user.Username))
      .ToListAsync(ct);

    var accountRows = await _db.MoneyAccounts.AsNoTracking()
      .Where(account => account.IsActive && account.Branch.IsActive && account.Currency.IsActive
        && account.AccountingAccount.IsActive && !account.AccountingAccount.IsGroup
        && account.AccountingAccount.Classification == AccountClassification.Asset
        && account.AccessAssignments.Any(access => access.UserId == userId
          && access.AccessLevel == MoneyAccountAccessLevel.Operate))
      .OrderBy(account => account.Code)
      .Select(account => new
      {
        account.Id,
        account.Code,
        account.Name,
        account.Type,
        account.BranchId,
        account.CurrencyId,
        CurrencyCode = account.Currency.Code,
        Balance = account.LedgerEntries.Sum(entry => (decimal?)entry.Amount) ?? 0m
      })
      .ToListAsync(ct);

    var foreignCurrencyIds = accountRows.Select(account => account.CurrencyId)
      .Where(currencyId => currencyId != business.BaseCurrencyId).Distinct().ToList();
    var currentRates = await _db.ExchangeRates.AsNoTracking()
      .Where(rate => foreignCurrencyIds.Contains(rate.FromCurrencyId)
        && rate.ToCurrencyId == business.BaseCurrencyId && rate.IsActive && rate.EffectiveAtUtc <= asOfUtc)
      .OrderByDescending(rate => rate.EffectiveAtUtc)
      .ToListAsync(ct);
    var ratesByCurrency = currentRates.GroupBy(rate => rate.FromCurrencyId)
      .ToDictionary(group => group.Key, group => group.First().Rate);

    var accounts = accountRows.Select(account =>
    {
      decimal? currentRate = account.CurrencyId == business.BaseCurrencyId
        ? 1m
        : ratesByCurrency.TryGetValue(account.CurrencyId, out var rate) ? rate : null;
      return new PosMoneyAccountResponse(
        account.Id,
        account.Code,
        account.Name,
        account.Type,
        account.BranchId,
        account.CurrencyId,
        account.CurrencyCode,
        account.Balance,
        currentRate);
    }).ToList();

    return new PosSetupResponse(
      business.BaseCurrencyId,
      business.BaseCurrency.Code,
      branches,
      warehouses,
      categories,
      professionals,
      accounts);
  }

  public async Task<PagedResult<PosCatalogItemResponse>> GetCatalogAsync(PosCatalogQuery request, CancellationToken ct)
  {
    var serviceQuery = _db.Services.AsNoTracking().Where(service => service.IsActive && service.Category.IsActive);
    var productQuery = _db.Products.AsNoTracking().Where(product => product.IsActive && product.Category.IsActive
      && product.TrackInventory && (product.Purpose == ProductPurpose.Resale || product.Purpose == ProductPurpose.Both));

    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      serviceQuery = serviceQuery.Where(service => service.Name.ToLower().Contains(search)
        || service.Category.Name.ToLower().Contains(search));
      productQuery = productQuery.Where(product => product.Name.ToLower().Contains(search)
        || product.SKU.ToLower().Contains(search)
        || (product.Barcode != null && product.Barcode.ToLower().Contains(search)));
    }
    if (request.CategoryId is not null)
    {
      serviceQuery = serviceQuery.Where(service => service.CategoryId == request.CategoryId);
      productQuery = productQuery.Where(product => product.CategoryId == request.CategoryId);
    }

    var services = serviceQuery
      .OrderBy(service => service.Name)
      .ThenBy(service => service.Id)
      .Select(service => new PosCatalogItemResponse(
        PosCatalogItemType.Service,
        service.Id,
        service.Name,
        service.CategoryId,
        service.Category.Name,
        service.SellingPriceBase,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        new List<ProductUnitConversionResponse>()));
    var products = productQuery
      .OrderBy(product => product.Name)
      .ThenBy(product => product.Id)
      .Select(product => new PosCatalogItemResponse(
        PosCatalogItemType.Product,
        product.Id,
        product.Name,
        product.CategoryId,
        product.Category.Name,
        product.SellingPriceBase,
        product.SKU,
        product.Barcode,
        product.UnitOfMeasureId,
        product.UnitOfMeasure.Name,
        product.UnitOfMeasure.Code,
        request.WarehouseId == null
          ? null
          : (decimal?)product.StockMovements.Where(movement => movement.WarehouseId == request.WarehouseId)
            .Sum(movement => movement.QuantityIn - movement.QuantityOut),
        product.ImageReference,
        product.UnitConversions
          .OrderBy(item => item.UnitOfMeasure.Code)
          .Select(item => new ProductUnitConversionResponse(
            item.Id,
            item.UnitOfMeasureId,
            item.UnitOfMeasure.Name,
            item.UnitOfMeasure.Code,
            item.Operation,
            item.Factor))
          .ToList()));

    if (request.ItemType == PosCatalogItemType.Service)
      return await services.ToPagedResultAsync(request, ct);
    if (request.ItemType == PosCatalogItemType.Product)
      return await products.ToPagedResultAsync(request, ct);

    var normalized = request.Normalize();
    var serviceCount = await services.CountAsync(ct);
    var productCount = await products.CountAsync(ct);
    var skip = Math.Min((long)(normalized.Page - 1) * normalized.PageSize, int.MaxValue);
    var items = new List<PosCatalogItemResponse>(normalized.PageSize);
    if (skip < serviceCount)
    {
      items.AddRange(await services.Skip((int)skip).Take(normalized.PageSize).ToListAsync(ct));
    }
    var productSkip = Math.Max(skip - serviceCount, 0);
    var remaining = normalized.PageSize - items.Count;
    if (remaining > 0 && productSkip < productCount)
    {
      items.AddRange(await products.Skip((int)productSkip).Take(remaining).ToListAsync(ct));
    }
    return new PagedResult<PosCatalogItemResponse>(
      items, serviceCount + productCount, normalized.Page, normalized.PageSize);
  }

  public async Task<PagedResult<PosCustomerResponse>> GetCustomersAsync(
    PosCustomerListQuery request,
    CancellationToken ct)
  {
    var query = _db.Contacts.AsNoTracking().Where(contact => contact.IsActive && contact.IsCustomer);
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(contact => contact.Name.ToLower().Contains(search)
        || (contact.PrimaryPhoneNumber != null && contact.PrimaryPhoneNumber.Contains(search)));
    }
    return await query.OrderBy(contact => contact.Name).ThenBy(contact => contact.Id)
      .Select(contact => new PosCustomerResponse(contact.Id, contact.Name, contact.PrimaryPhoneNumber))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PagedResult<PosSaleListResponse>> GetSalesAsync(PosSaleListQuery request, CancellationToken ct)
  {
    var business = await _db.Businesses.AsNoTracking().SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw BusinessNotConfigured();
    var query = _db.PosSales.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(sale => sale.DocumentNumber.ToLower().Contains(search)
        || (sale.SalesInvoice.Customer != null && sale.SalesInvoice.Customer.Name.ToLower().Contains(search)));
    }
    if (request.CustomerId is not null) query = query.Where(sale => sale.SalesInvoice.CustomerId == request.CustomerId);
    if (request.BranchId is not null) query = query.Where(sale => sale.SalesInvoice.BranchId == request.BranchId);
    if (request.PosSessionId is not null) query = query.Where(sale => sale.PosSessionId == request.PosSessionId);
    if (request.FromDate is not null)
    {
      var from = BusinessTime.UtcRange(business, request.FromDate.Value, request.FromDate.Value).FromUtc;
      query = query.Where(sale => sale.CompletedAtUtc >= from);
    }
    if (request.ToDate is not null)
    {
      var to = BusinessTime.UtcRange(business, request.ToDate.Value, request.ToDate.Value).ToUtc;
      query = query.Where(sale => sale.CompletedAtUtc < to);
    }
    if (request.PaymentMode is not null)
    {
      query = request.PaymentMode switch
      {
        PosPaymentMode.Credit => query.Where(sale => (sale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m) - (sale.Change == null ? 0m : sale.Change.BaseAmount) <= 0m),
        PosPaymentMode.Partial => query.Where(sale => (sale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m) - (sale.Change == null ? 0m : sale.Change.BaseAmount) > 0m
          && (sale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m) - (sale.Change == null ? 0m : sale.Change.BaseAmount) < sale.SalesInvoice.BaseTotal),
        _ => query.Where(sale => (sale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m) - (sale.Change == null ? 0m : sale.Change.BaseAmount) >= sale.SalesInvoice.BaseTotal)
      };
    }
    if (request.RefundState is not null)
    {
      query = request.RefundState switch
      {
        PosRefundState.NotRefunded => query.Where(sale => !sale.Refunds.Any(refund => refund.Status == PosRefundStatus.Posted)),
        PosRefundState.FullyRefunded => query.Where(sale => (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted).Sum(refund => (decimal?)refund.TotalRefundBase) ?? 0m) >= sale.SalesInvoice.BaseTotal),
        _ => query.Where(sale => (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted).Sum(refund => (decimal?)refund.TotalRefundBase) ?? 0m) > 0m
          && (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted).Sum(refund => (decimal?)refund.TotalRefundBase) ?? 0m) < sale.SalesInvoice.BaseTotal)
      };
    }

    return await query.OrderByDescending(sale => sale.CompletedAtUtc).ThenByDescending(sale => sale.DocumentNumber)
      .Select(sale => new PosSaleListResponse(
        sale.Id,
        sale.DocumentNumber,
        sale.CompletedAtUtc,
        sale.SalesInvoice.BranchId,
        sale.SalesInvoice.Branch.Name,
        sale.SalesInvoice.CustomerId,
        sale.SalesInvoice.Customer == null ? null : sale.SalesInvoice.Customer.Name,
        sale.PosSessionId,
        sale.PosSession == null ? null : sale.PosSession.SessionNumber,
        sale.SalesInvoice.Total,
        (sale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m) - (sale.Change == null ? 0m : sale.Change.BaseAmount),
        sale.SalesInvoice.BaseTotal - ((sale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m) - (sale.Change == null ? 0m : sale.Change.BaseAmount))
          - (sale.SalesInvoice.ReceiptAllocations.Where(allocation => allocation.CustomerReceipt.Status == FinanceDocumentStatus.Posted).Sum(allocation => (decimal?)allocation.BaseAmount) ?? 0m)
          - (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted).Sum(refund => (decimal?)refund.ReceivableReversalBase) ?? 0m),
        sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted)
          .Sum(refund => (decimal?)refund.TotalRefundBase) ?? 0m,
        sale.SalesInvoice.BaseTotal - (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted)
          .Sum(refund => (decimal?)refund.TotalRefundBase) ?? 0m),
        !sale.Refunds.Any(refund => refund.Status == PosRefundStatus.Posted)
          ? PosRefundState.NotRefunded
          : (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted)
              .Sum(refund => (decimal?)refund.TotalRefundBase) ?? 0m) >= sale.SalesInvoice.BaseTotal
            ? PosRefundState.FullyRefunded
            : PosRefundState.PartiallyRefunded,
        (sale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m) - (sale.Change == null ? 0m : sale.Change.BaseAmount) <= 0m
          ? PosPaymentMode.Credit
          : (sale.Tenders.Sum(tender => (decimal?)tender.BaseAmount) ?? 0m) - (sale.Change == null ? 0m : sale.Change.BaseAmount) < sale.SalesInvoice.BaseTotal
            ? PosPaymentMode.Partial : PosPaymentMode.Paid,
        sale.SalesInvoice.BaseCurrency.Code,
        sale.CashierUser.Username))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PosSaleResponse> GetSaleAsync(Guid id, CancellationToken ct)
  {
    var sale = await SaleQuery().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Pos.SaleNotFound, "POS Sale not found.");
    return ToResponse(sale);
  }

  public async Task<PosSaleResponse> CompleteSaleAsync(
    CompletePosSaleRequest request,
    Guid userId,
    CancellationToken ct)
  {
    // Internal callers predate the HTTP idempotency contract. The controller enforces it for public requests.
    if (request.ClientRequestId == Guid.Empty) request = request with { ClientRequestId = Guid.NewGuid() };
    ValidateRequestShape(request);
    var fingerprint = Fingerprint(request);
    PosSaleResponse? existing;
    try
    {
      existing = await FindIdempotentSaleAsync(request.ClientRequestId, fingerprint, ct);
    }
    catch (Exception exception) when (PosConcurrency.IsConflict(exception))
    {
      throw new ConflictException(ErrorCodes.Pos.ConcurrentCheckout,
        "Another checkout changed stock, balance, session, or numbering. Review the cart and try again.");
    }
    if (existing is not null) return existing;
    try
    {
      return await CompleteSaleCoreAsync(request, userId, fingerprint, ct);
    }
    catch (Exception exception) when (PosConcurrency.IsConflict(exception))
    {
      _db.ChangeTracker.Clear();
      existing = await FindIdempotentSaleAsync(request.ClientRequestId, fingerprint, ct);
      if (existing is not null) return existing;
      throw new ConflictException(ErrorCodes.Pos.ConcurrentCheckout,
        "Another checkout changed stock, balance, session, or numbering. Review the cart and try again.");
    }
  }

  private async Task<PosSaleResponse> CompleteSaleCoreAsync(
    CompletePosSaleRequest request,
    Guid userId,
    string fingerprint,
    CancellationToken ct)
  {
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;

    var session = await _sessions.RequireOpenSessionAsync(
      userId, request.PosSessionId, request.BranchId, ct);
    var business = await _db.Businesses.AsNoTracking().Include(item => item.BaseCurrency)
      .SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw BusinessNotConfigured();
    var existing = await FindIdempotentSaleAsync(request.ClientRequestId, fingerprint, ct);
    if (existing is not null) return existing;
    var date = BusinessTime.DateAt(business, DateTime.UtcNow);
    var rateAtUtc = DateTime.UtcNow;

    var serviceIds = request.Lines.Where(line => line.LineType == SalesLineType.Service)
      .Select(line => line.ServiceId!.Value).ToList();
    var productIds = request.Lines.Where(line => line.LineType == SalesLineType.Product)
      .Select(line => line.ProductId!.Value).ToList();
    var services = await _db.Services.AsNoTracking().Where(service => serviceIds.Contains(service.Id))
      .ToDictionaryAsync(service => service.Id, ct);
    var products = await _db.Products.AsNoTracking()
      .Include(product => product.UnitOfMeasure)
      .Include(product => product.UnitConversions).ThenInclude(item => item.UnitOfMeasure)
      .Where(product => productIds.Contains(product.Id))
      .ToDictionaryAsync(product => product.Id, ct);
    if (services.Count != serviceIds.Count || products.Count != productIds.Count)
      throw new BadRequestException(ErrorCodes.Pos.LineInvalid, "Every POS line must reference an existing Service or Product.");
    var professionalIds = request.Lines.Where(line => line.ProfessionalUserId is not null)
      .Select(line => line.ProfessionalUserId!.Value).Distinct().ToList();
    if (professionalIds.Count > 0)
    {
      var validProfessionals = await _db.Users.AsNoTracking().CountAsync(user =>
        professionalIds.Contains(user.Id) && user.IsActive && user.Role == UserRole.Professional
        && _db.UserBranchAccess.Any(access => access.UserId == user.Id && access.BranchId == request.BranchId), ct);
      if (validProfessionals != professionalIds.Count)
        throw new BadRequestException(ErrorCodes.Sales.ProfessionalInvalid,
          "Every selected Professional must be active and assigned to the selected branch.");
    }

    var salesLines = request.Lines.Select(line => line.LineType == SalesLineType.Service
      ? new SalesInvoiceLineRequest(
        SalesLineType.Service,
        line.ServiceId,
        null,
        null,
        services[line.ServiceId!.Value].Name,
        line.Quantity,
        services[line.ServiceId.Value].SellingPriceBase,
        line.ProfessionalUserId)
      : new SalesInvoiceLineRequest(
        SalesLineType.Product,
        null,
        line.ProductId,
        line.UnitOfMeasureId,
        products[line.ProductId!.Value].Name,
        line.Quantity,
        SelectedProductPrice(products[line.ProductId!.Value], line.UnitOfMeasureId)))
      .ToList();
    var saleTotal = salesLines.Sum(line => Money(line.Quantity * line.UnitPrice));

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
      throw new BadRequestException(ErrorCodes.Pos.MoneyAccountInvalid, "Every tender and change line must use an existing Money Account.");
    foreach (var account in accounts.Values)
    {
      FinanceService.EnsureActive(account);
      if (!account.Currency.IsActive)
        throw new BadRequestException(ErrorCodes.Pos.MoneyAccountInvalid,
          $"Money Account '{account.Code}' uses an inactive currency.");
      if (account.BranchId != request.BranchId)
        throw new BadRequestException(ErrorCodes.Pos.MoneyAccountBranchMismatch,
          $"Money Account '{account.Code}' does not belong to the selected POS branch.");
      if (account.Type == MoneyAccountType.Cashbox
        && !session.OpeningCounts.Any(count => count.CurrencyId == account.CurrencyId))
        throw new BadRequestException(ErrorCodes.Pos.SessionCurrencyNotAllowed,
          $"Cashbox currency '{account.Currency.Code}' was not part of this POS Session opening snapshot.");
    }

    var rates = new Dictionary<Guid, decimal>();
    foreach (var currencyId in accounts.Values.Select(account => account.CurrencyId).Distinct())
      rates[currencyId] = await _finance.ResolveCurrentRateAsync(currencyId, business.BaseCurrencyId, rateAtUtc, ct);

    var tenders = request.Tenders.Select((tender, index) =>
    {
      var account = accounts[tender.MoneyAccountId];
      var rate = rates[account.CurrencyId];
      return new TenderPosting(index + 1, tender, account, rate, Money(tender.Amount * rate));
    }).ToList();
    var tenderedBase = Money(tenders.Sum(tender => tender.BaseAmount));

    var changeDueBase = 0m;
    ChangePosting? change = null;
    switch (request.PaymentMode)
    {
      case PosPaymentMode.Paid:
        if (tenderedBase < saleTotal)
          throw new BadRequestException(ErrorCodes.Pos.Underpayment,
            $"POS Sale is underpaid by {Money(saleTotal - tenderedBase)} {business.BaseCurrency.Code}.");
        changeDueBase = Money(tenderedBase - saleTotal);
        break;
      case PosPaymentMode.Partial:
        if (tenderedBase <= 0 || tenderedBase >= saleTotal)
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
      throw new BadRequestException(ErrorCodes.Pos.ChangeNotDue, "Do not record change when tender exactly settles the Sale.");
    if (request.PaymentMode == PosPaymentMode.Paid && changeDueBase > 0 && request.Change is null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeRequired,
        $"Record {changeDueBase} {business.BaseCurrency.Code} of change before completing the Sale.");
    if (request.Change is not null)
    {
      var account = accounts[request.Change.MoneyAccountId];
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
      change = new ChangePosting(request.Change, account, rate, baseAmount);
    }

    var settlementLines = tenders.Select(tender => new JournalLineEntity
    {
      AccountId = tender.Account.AccountingAccountId,
      Description = $"Tender received in {tender.Account.Code}",
      CurrencyId = tender.Account.CurrencyId,
      ExchangeRate = tender.ExchangeRate,
      OriginalDebitAmount = tender.Request.Amount,
      DebitBaseAmount = tender.BaseAmount
    }).ToList();
    if (change is not null)
    {
      settlementLines.Add(new JournalLineEntity
      {
        AccountId = change.Account.AccountingAccountId,
        Description = $"Change returned from {change.Account.Code}",
        CurrencyId = change.Account.CurrencyId,
        ExchangeRate = change.ExchangeRate,
        OriginalCreditAmount = change.Request.Amount,
        CreditBaseAmount = change.BaseAmount
      });
    }

    var documentNumber = await NextDocumentNumberAsync(ct);
    var invoiceRequest = new SalesInvoiceDraftRequest(
      request.CustomerId,
      date,
      request.BranchId,
      request.WarehouseId,
      business.BaseCurrencyId,
      null,
      "Immediate POS sale",
      salesLines);
    var invoice = await _sales.PrepareImmediateSaleAsync(
      invoiceRequest, documentNumber, userId, settlementLines, ct);
    var completedAt = invoice.PostedAtUtc!.Value;
    var sale = new PosSaleEntity
    {
      DocumentNumber = documentNumber,
      SalesInvoice = invoice,
      PosSessionId = session.Id,
      Status = PosSaleStatus.Completed,
      CashierUserId = userId,
      CompletedAtUtc = completedAt,
      ClientRequestId = request.ClientRequestId,
      RequestFingerprint = fingerprint
    };

    foreach (var tender in tenders)
    {
      var ledger = FinanceService.LedgerEntry(
        tender.Account,
        date,
        MoneyLedgerSourceType.PosSale,
        sale.Id,
        documentNumber,
        tender.Request.Amount,
        tender.BaseAmount,
        business.BaseCurrencyId,
        tender.ExchangeRate,
        invoice.JournalEntry!.Id,
        userId,
        "POS tender",
        completedAt);
      _db.MoneyLedgerEntries.Add(ledger);
      sale.Tenders.Add(new PosTenderEntity
      {
        Sequence = tender.Sequence,
        MoneyAccountId = tender.Account.Id,
        TenderedAmount = tender.Request.Amount,
        ExchangeRate = tender.ExchangeRate,
        BaseAmount = tender.BaseAmount,
        MoneyLedgerEntry = ledger
      });
    }
    if (change is not null)
    {
      var ledger = FinanceService.LedgerEntry(
        change.Account,
        date,
        MoneyLedgerSourceType.PosSale,
        sale.Id,
        documentNumber,
        -change.Request.Amount,
        -change.BaseAmount,
        business.BaseCurrencyId,
        change.ExchangeRate,
        invoice.JournalEntry!.Id,
        userId,
        "POS change",
        completedAt);
      _db.MoneyLedgerEntries.Add(ledger);
      sale.Change = new PosChangeEntity
      {
        MoneyAccountId = change.Account.Id,
        Amount = change.Request.Amount,
        ExchangeRate = change.ExchangeRate,
        BaseAmount = change.BaseAmount,
        MoneyLedgerEntry = ledger
      };
    }
    _db.PosSales.Add(sale);

    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);

    return await GetSaleAsync(sale.Id, ct);
  }

  private IQueryable<PosSaleEntity> SaleQuery() => _db.PosSales.AsNoTracking()
    .Include(sale => sale.CashierUser)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Customer)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Branch)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Warehouse)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.BaseCurrency)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Movements)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.ReceiptAllocations).ThenInclude(allocation => allocation.CustomerReceipt)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines).ThenInclude(line => line.Service)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines).ThenInclude(line => line.Product)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines).ThenInclude(line => line.UnitOfMeasure)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines).ThenInclude(line => line.ProfessionalUser)
    .Include(sale => sale.Tenders).ThenInclude(tender => tender.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(sale => sale.Change).ThenInclude(change => change!.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(sale => sale.Refunds).ThenInclude(refund => refund.ApprovedByUser);

  private static PosSaleResponse ToResponse(PosSaleEntity sale)
  {
    var invoice = sale.SalesInvoice;
    var tenders = sale.Tenders.OrderBy(tender => tender.Sequence).Select(tender => new PosTenderResponse(
      tender.Id,
      tender.Sequence,
      tender.MoneyAccountId,
      tender.MoneyAccount.Code,
      tender.MoneyAccount.Name,
      tender.MoneyAccount.CurrencyId,
      tender.MoneyAccount.Currency.Code,
      tender.TenderedAmount,
      tender.ExchangeRate,
      tender.BaseAmount,
      tender.MoneyLedgerEntryId)).ToList();
    var change = sale.Change is null ? null : new PosChangeResponse(
      sale.Change.Id,
      sale.Change.MoneyAccountId,
      sale.Change.MoneyAccount.Code,
      sale.Change.MoneyAccount.Name,
      sale.Change.MoneyAccount.CurrencyId,
      sale.Change.MoneyAccount.Currency.Code,
      sale.Change.Amount,
      sale.Change.ExchangeRate,
      sale.Change.BaseAmount,
      sale.Change.MoneyLedgerEntryId);
    var tenderedBase = Money(tenders.Sum(tender => tender.BaseAmount));
    var changeBase = change?.BaseAmount ?? 0;
    var settledBase = Money(tenderedBase - changeBase);
    var receiptBase = Money(invoice.ReceiptAllocations
      .Where(allocation => allocation.CustomerReceipt.Status == FinanceDocumentStatus.Posted)
      .Sum(allocation => allocation.BaseAmount));
    var postedRefunds = sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted)
      .OrderBy(refund => refund.PostedAtUtc).ToList();
    var refundedBase = Money(postedRefunds.Sum(refund => refund.TotalRefundBase));
    var receivableReversalBase = Money(postedRefunds.Sum(refund => refund.ReceivableReversalBase));
    var outstandingBase = Math.Max(Money(invoice.BaseTotal - settledBase - receiptBase - receivableReversalBase), 0);
    var remainingRefundableBase = Math.Max(Money(invoice.BaseTotal - refundedBase), 0);
    var refundStatus = refundedBase <= 0
      ? PosRefundState.NotRefunded
      : remainingRefundableBase <= 0
        ? PosRefundState.FullyRefunded
        : PosRefundState.PartiallyRefunded;
    var paymentMode = settledBase <= 0
      ? PosPaymentMode.Credit
      : settledBase < invoice.BaseTotal
        ? PosPaymentMode.Partial
        : PosPaymentMode.Paid;

    return new PosSaleResponse(
      sale.Id,
      sale.DocumentNumber,
      sale.Status,
      sale.PosSessionId,
      invoice.Id,
      invoice.CustomerId,
      invoice.Customer?.Name,
      invoice.BranchId,
      invoice.Branch.Code,
      invoice.Branch.Name,
      invoice.WarehouseId,
      invoice.Warehouse?.Code,
      invoice.Warehouse?.Name,
      invoice.BaseCurrencyId,
      invoice.BaseCurrency.Code,
      invoice.Subtotal,
      invoice.Total,
      tenderedBase,
      changeBase,
      settledBase,
      outstandingBase,
      refundedBase,
      remainingRefundableBase,
      Money(invoice.BaseTotal - refundedBase),
      refundStatus,
      paymentMode,
      sale.CashierUserId,
      sale.CashierUser.Username,
      sale.CompletedAtUtc,
      invoice.JournalEntryId!.Value,
      invoice.Movements.OrderBy(movement => movement.Id).Select(movement => movement.Id).ToList(),
      invoice.Lines.OrderBy(line => line.LineType).ThenBy(line => line.Id).Select(line => new PosSaleLineResponse(
        line.Id,
        line.LineType,
        line.ServiceId,
        line.Service?.Name,
        line.ProductId,
        line.Product?.Name,
        line.Product?.SKU,
        line.UnitOfMeasureId,
        line.UnitOfMeasure?.Code,
        line.ProfessionalUserId,
        line.ProfessionalUser?.Username,
        line.Quantity,
        line.ConversionOperation,
        line.ConversionFactor,
        line.BaseQuantity,
        line.UnitPrice,
        line.BaseUnitPrice,
        line.LineAmount)).ToList(),
      tenders,
      change,
      postedRefunds.Select(refund => new PosRefundSummaryResponse(
        refund.Id, refund.DocumentNumber, refund.IsVoid, refund.Reason,
        refund.TotalRefundBase, refund.ReceivableReversalBase, refund.CashRefundBase,
        refund.PostedAtUtc, refund.ApprovedByUser.Username)).ToList());
  }

  private static void ValidateRequestShape(CompletePosSaleRequest request)
  {
    if (request.PosSessionId == Guid.Empty)
      throw new BadRequestException(ErrorCodes.Pos.SessionRequired, "Open a POS Session before completing a checkout.");
    if (request.Lines.Count == 0)
      throw new BadRequestException(ErrorCodes.Pos.LinesRequired, "Add at least one Service or Product.");
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
    if (request.PaymentMode != PosPaymentMode.Paid && request.Change is not null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeNotDue,
        "Change can only be recorded for a fully paid POS Sale.");
    if (request.Lines.Any(line => line.Quantity <= 0))
      throw new BadRequestException(ErrorCodes.Pos.LineInvalid, "POS quantities must be greater than zero.");
    if (request.Tenders.Any(tender => tender.MoneyAccountId == Guid.Empty || tender.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Pos.TenderInvalid,
        "Every tender requires a Money Account and an amount greater than zero.");
    if (request.Change is not null
      && (request.Change.MoneyAccountId == Guid.Empty || request.Change.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Pos.ChangeMismatch,
        "Change requires a Money Account and an amount greater than zero.");

    foreach (var line in request.Lines)
    {
      var service = line.LineType == SalesLineType.Service && line.ServiceId is not null && line.ServiceId != Guid.Empty
        && line.ProductId is null && line.UnitOfMeasureId is null;
      var product = line.LineType == SalesLineType.Product && line.ProductId is not null && line.ProductId != Guid.Empty
        && line.ServiceId is null && line.ProfessionalUserId is null
        && line.UnitOfMeasureId is not null && line.UnitOfMeasureId != Guid.Empty;
      if (!service && !product)
        throw new BadRequestException(ErrorCodes.Pos.LineInvalid,
          "Each POS line must reference exactly one Service or Product; only Services may have a Professional.");
    }

    var serviceIds = request.Lines.Where(line => line.LineType == SalesLineType.Service)
      .Select(line => line.ServiceId!.Value).ToList();
    var productIds = request.Lines.Where(line => line.LineType == SalesLineType.Product)
      .Select(line => line.ProductId!.Value).ToList();
    if (serviceIds.Distinct().Count() != serviceIds.Count || productIds.Distinct().Count() != productIds.Count)
      throw new BadRequestException(ErrorCodes.Pos.DuplicateLine, "A Service or Product can appear only once in the POS cart.");
  }

  private async Task<string> NextDocumentNumberAsync(CancellationToken ct)
  {
    var last = await _db.PosSales.IgnoreQueryFilters().Select(sale => sale.DocumentNumber)
      .OrderByDescending(number => number).FirstOrDefaultAsync(ct);
    var next = last is not null && last.StartsWith("POS-") && int.TryParse(last[4..], out var value) ? value + 1 : 1;
    return $"POS-{next:000000}";
  }

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);

  private async Task<PosSaleResponse?> FindIdempotentSaleAsync(Guid clientRequestId, string fingerprint, CancellationToken ct)
  {
    var existing = await _db.PosSales.AsNoTracking().SingleOrDefaultAsync(sale => sale.ClientRequestId == clientRequestId, ct);
    if (existing is null) return null;
    if (!string.Equals(existing.RequestFingerprint, fingerprint, StringComparison.Ordinal))
      throw new ConflictException(ErrorCodes.Pos.IdempotencyKeyReused,
        "This client request ID was already used with different checkout data.");
    return await GetSaleAsync(existing.Id, ct);
  }

  private static string Fingerprint(CompletePosSaleRequest request) => Hash(new
  {
    request.BranchId,
    request.PosSessionId,
    request.WarehouseId,
    request.CustomerId,
    request.PaymentMode,
    Lines = request.Lines
      .OrderBy(line => line.LineType).ThenBy(line => line.ServiceId).ThenBy(line => line.ProductId)
      .Select(line => new { line.LineType, line.ServiceId, line.ProductId, line.UnitOfMeasureId, line.Quantity, line.ProfessionalUserId }),
    Tenders = request.Tenders.OrderBy(tender => tender.MoneyAccountId).ThenBy(tender => tender.Amount)
      .Select(tender => new { tender.MoneyAccountId, tender.Amount }),
    Change = request.Change is null ? null : new { request.Change.MoneyAccountId, request.Change.Amount }
  });

  private static string Hash<T>(T value) => Convert.ToHexString(SHA256.HashData(
    Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value))));

  private static decimal SelectedProductPrice(ProductEntity product, Guid? unitOfMeasureId)
  {
    var selection = unitOfMeasureId is null
      ? null
      : UnitConversionCalculator.Resolve(product, unitOfMeasureId.Value);
    if (selection is null || !selection.Value.IsActive || !selection.Value.IsValid)
      throw new BadRequestException(
        ErrorCodes.Pos.LineInvalid,
        "Each Product line must use an active base unit or configured conversion unit.");

    return Money(UnitConversionCalculator.ConvertBasePriceToUnitPrice(
      product.SellingPriceBase,
      selection.Value.Operation,
      selection.Value.Factor));
  }

  private static BadRequestException BusinessNotConfigured() => new(
    ErrorCodes.Pos.BusinessNotConfigured,
    "Complete Business Setup before using POS.");

  private sealed record TenderPosting(
    int Sequence,
    PosTenderRequest Request,
    MoneyAccountEntity Account,
    decimal ExchangeRate,
    decimal BaseAmount);

  private sealed record ChangePosting(
    PosChangeRequest Request,
    MoneyAccountEntity Account,
    decimal ExchangeRate,
    decimal BaseAmount);
}
