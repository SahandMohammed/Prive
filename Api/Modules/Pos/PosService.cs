using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Dashboard;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Sales;
using Api.Modules.Professional;
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
  private readonly PosSettlementService _settlements;
  private readonly PaymentService _payments;
  private readonly InvoiceSettlementReader _invoiceSettlements;

  public PosService(
    AppDbContext db,
    SalesService sales,
    PosSettlementService settlements,
    PaymentService payments,
    InvoiceSettlementReader invoiceSettlements)
  {
    _db = db;
    _sales = sales;
    _settlements = settlements;
    _payments = payments;
    _invoiceSettlements = invoiceSettlements;
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
    var professionals = await _db.Professionals.AsNoTracking()
      .Where(professional => professional.IsActive
        && (selectedBranchId == null || professional.BranchAssignments.Any(assignment => assignment.BranchId == selectedBranchId)))
      .OrderBy(professional => professional.Name)
      .Select(professional => new PosProfessionalResponse(professional.Id, professional.Name))
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
        CurrencyDecimalPlaces = account.Currency.DecimalPlaces,
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
        account.CurrencyDecimalPlaces,
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
    var query = _db.Contacts.AsNoTracking().Where(contact => contact.IsActive
      && contact.IsCustomer && contact.SystemRole == null);
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
    var query = _db.PosContexts.AsNoTracking().Where(context => !context.SalesInvoice.IsDeleted);
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(sale => sale.SalesInvoice.DocumentNumber.ToLower().Contains(search)
        || (sale.SalesInvoice.Customer != null && sale.SalesInvoice.Customer.Name.ToLower().Contains(search)));
    }
    if (request.CustomerId is not null) query = query.Where(sale => sale.SalesInvoice.CustomerId == request.CustomerId);
    if (request.BranchId is not null) query = query.Where(sale => sale.SalesInvoice.BranchId == request.BranchId);
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

    return await query.OrderByDescending(sale => sale.CompletedAtUtc).ThenByDescending(sale => sale.SalesInvoice.DocumentNumber)
      .Select(sale => new PosSaleListResponse(
        sale.SalesInvoiceId,
        sale.SalesInvoice.DocumentNumber,
        sale.CompletedAtUtc,
        sale.SalesInvoice.BranchId,
        sale.SalesInvoice.Branch.Name,
        sale.SalesInvoice.CustomerId,
        sale.SalesInvoice.Customer.Name,
        sale.SalesInvoice.Total,
        sale.SalesInvoice.PaymentAllocations.Where(allocation => !allocation.Payment.IsDeleted)
          .Sum(allocation => (decimal?)allocation.BaseAmount) ?? 0m,
        Math.Max(sale.SalesInvoice.BaseTotal
          - (sale.SalesInvoice.PaymentAllocations.Where(allocation => !allocation.Payment.IsDeleted)
            .Sum(allocation => (decimal?)allocation.BaseAmount) ?? 0m)
          - (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted).Sum(refund => (decimal?)refund.ReceivableReversalBase) ?? 0m),
          0m),
        Math.Max((sale.SalesInvoice.PaymentAllocations.Where(allocation => !allocation.Payment.IsDeleted)
            .Sum(allocation => (decimal?)allocation.BaseAmount) ?? 0m)
          - Math.Max(sale.SalesInvoice.BaseTotal
            - (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted)
              .Sum(refund => (decimal?)refund.ReceivableReversalBase) ?? 0m), 0m), 0m),
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
        (sale.SalesInvoice.PaymentAllocations.Where(allocation => !allocation.Payment.IsDeleted)
            .Sum(allocation => (decimal?)allocation.BaseAmount) ?? 0m)
            > Math.Max(sale.SalesInvoice.BaseTotal
              - (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted)
                .Sum(refund => (decimal?)refund.ReceivableReversalBase) ?? 0m), 0m)
          ? SalesInvoicePaymentStatus.Overpaid
          : (sale.SalesInvoice.PaymentAllocations.Where(allocation => !allocation.Payment.IsDeleted)
              .Sum(allocation => (decimal?)allocation.BaseAmount) ?? 0m)
              >= Math.Max(sale.SalesInvoice.BaseTotal
                - (sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted)
                  .Sum(refund => (decimal?)refund.ReceivableReversalBase) ?? 0m), 0m)
            ? SalesInvoicePaymentStatus.Paid
            : (sale.SalesInvoice.PaymentAllocations.Where(allocation => !allocation.Payment.IsDeleted)
                .Sum(allocation => (decimal?)allocation.BaseAmount) ?? 0m) <= 0m
              ? SalesInvoicePaymentStatus.Unpaid
              : SalesInvoicePaymentStatus.PartiallyPaid,
        sale.SalesInvoice.BaseCurrency.Code,
        sale.OperatorUser.Username))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PosSaleResponse> GetSaleAsync(Guid salesInvoiceId, CancellationToken ct)
  {
    var sale = await SaleQuery().SingleOrDefaultAsync(item => item.SalesInvoiceId == salesInvoiceId, ct)
      ?? throw new NotFoundException(ErrorCodes.Pos.SaleNotFound, "POS Sale not found.");
    var settlement = await _invoiceSettlements.GetAsync(salesInvoiceId, ct);
    return ToResponse(sale, settlement);
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
        "Another checkout changed stock, balance, or numbering. Review the cart and try again.");
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
        "Another checkout changed stock, balance, or numbering. Review the cart and try again.");
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
    if (request.Lines.Any(line => line.LineType == SalesLineType.Service
      && (line.ProfessionalId is null || line.ProfessionalId == Guid.Empty)))
      throw new BadRequestException(ErrorCodes.Sales.ProfessionalInvalid,
        "Every POS Service line requires a Professional.");
    var professionalIds = request.Lines.Where(line => line.ProfessionalId is not null)
      .Select(line => line.ProfessionalId!.Value).Distinct().ToList();
    if (professionalIds.Count > 0)
    {
      var validProfessionals = await _db.Professionals.AsNoTracking().CountAsync(professional =>
        professionalIds.Contains(professional.Id) && professional.IsActive
        && professional.BranchAssignments.Any(assignment => assignment.BranchId == request.BranchId), ct);
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
        line.ProfessionalId)
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

    var settlement = await _settlements.PrepareAsync(new PosSettlementRequest(
      request.BranchId,
      request.CustomerId,
      saleTotal,
      request.PaymentMode,
      request.Collections,
      request.Change), userId, ct, business, rateAtUtc);

    var branch = await _db.Branches.AsNoTracking().SingleOrDefaultAsync(item => item.Id == request.BranchId, ct)
      ?? throw new BadRequestException(ErrorCodes.Finance.BranchInvalid, "Select an active branch.");
    var customerId = request.CustomerId ?? branch.WalkInCustomerId;
    var invoiceRequest = new SalesInvoiceDraftRequest(
      customerId,
      date,
      request.BranchId,
      request.WarehouseId,
      business.BaseCurrencyId,
      null,
      "Immediate POS sale",
      salesLines);
    var invoice = await _sales.PrepareImmediateSaleAsync(invoiceRequest, userId, ct);
    var completedAt = invoice.PostedAtUtc!.Value;
    var sale = new PosContextEntity
    {
      SalesInvoiceId = invoice.Id,
      SalesInvoice = invoice,
      OperatorUserId = userId,
      CompletedAtUtc = completedAt,
      ClientRequestId = request.ClientRequestId,
      RequestFingerprint = fingerprint
    };

    _db.PosContexts.Add(sale);

    var settledBase = Money(settlement.Collections.Sum(line => line.BaseAmount)
      - (settlement.Change?.BaseAmount ?? 0m));
    if (settledBase > 0)
    {
      var moneyLines = settlement.Collections.Select(line => new PaymentMoneyLineCommand(
        line.Account.Id, line.Request.Amount, line.ExchangeRate, PaymentMoneyDirection.Collection)).ToList();
      if (settlement.Change is not null)
        moneyLines.Add(new PaymentMoneyLineCommand(settlement.Change.Account.Id,
          settlement.Change.Request.Amount, settlement.Change.ExchangeRate, PaymentMoneyDirection.Change));
      var payment = await _payments.CreateAsync(new CreatePaymentCommand(
        invoice.BranchId,
        invoice.CustomerId,
        date,
        invoice.CurrencyId,
        PaymentOrigin.Pos,
        invoice.Id,
        "POS checkout settlement",
        [new PaymentAllocationCommand(invoice.Id, settledBase)],
        moneyLines), userId, ct);
    }
    await _db.SaveChangesAsync(ct);
    if (transaction is not null) await transaction.CommitAsync(ct);

    return await GetSaleAsync(sale.SalesInvoiceId, ct);
  }

  public async Task<PosSaleResponse> CorrectSettlementAsync(
    Guid salesInvoiceId,
    CorrectPosSettlementRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var reason = request.Reason.Trim();
    if (reason.Length == 0)
      throw new BadRequestException(ErrorCodes.Common.ValidationFailed,
        "A POS settlement correction reason is required.");

    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct)
      : null;
    try
    {
      if (_db.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
        await _db.Database.ExecuteSqlInterpolatedAsync(
          $"SELECT \"SalesInvoiceId\" FROM pos_contexts WHERE \"SalesInvoiceId\" = {salesInvoiceId} FOR UPDATE", ct);

      var context = await SettlementCorrectionQuery()
        .SingleOrDefaultAsync(item => item.SalesInvoiceId == salesInvoiceId, ct)
        ?? throw new NotFoundException(ErrorCodes.Pos.SaleNotFound, "POS Sale not found.");
      var invoice = context.SalesInvoice;
      EnsureSettlementTimestamp(invoice, request.ExpectedUpdatedAtUtc);
      if (invoice.Status != SalesInvoiceStatus.Posted || invoice.IsDeleted)
        throw new ConflictException(ErrorCodes.Sales.DocumentNotDraft,
          "Only an active POS Sales Invoice can have its settlement corrected.");
      if (invoice.CurrencyId != invoice.BaseCurrencyId)
        throw new BadRequestException(ErrorCodes.Sales.CurrencyInvalid,
          "A POS-generated invoice must use the Business base currency.");
      if (context.Refunds.Any(refund => refund.Status == PosRefundStatus.Posted))
        throw new ConflictException(ErrorCodes.Pos.SettlementHasRefundDependency,
          "This POS settlement cannot be changed because a posted refund or void depends on it.");

      var preparation = await _settlements.PrepareAsync(new PosSettlementRequest(
        invoice.BranchId,
        invoice.CustomerId,
        invoice.BaseTotal,
        request.PaymentMode,
        request.Collections,
        request.Change), userId, ct);
      var paymentId = await _db.Payments.AsNoTracking().IgnoreQueryFilters()
        .Where(item => !item.IsDeleted && item.Origin == PaymentOrigin.Pos
          && item.SourceSalesInvoiceId == invoice.Id)
        .Select(item => (Guid?)item.Id)
        .SingleOrDefaultAsync(ct);
      var payment = paymentId is Guid id
        ? await _payments.FindTrackedAsync(id, ct)
          ?? throw SettlementDependent("The POS Payment could not be identified safely.")
        : null;
      if (payment is not null
        && (payment.Origin != PaymentOrigin.Pos
          || payment.SourceSalesInvoiceId != invoice.Id
          || payment.CustomerId != invoice.CustomerId
          || payment.BranchId != invoice.BranchId
          || payment.CurrencyId != invoice.CurrencyId))
        throw new BadRequestException(ErrorCodes.Finance.PaymentSourceInvoiceMismatch,
          "The POS Payment does not match its source Sales Invoice.");

      var before = SettlementSnapshot(context, payment);

      var settledBase = Money(preparation.Collections.Sum(line => line.BaseAmount)
        - (preparation.Change?.BaseAmount ?? 0m));
      if (settledBase > 0m)
      {
        var moneyLines = preparation.Collections.Select(line => new PaymentMoneyLineCommand(
          line.Account.Id,
          line.Request.Amount,
          line.ExchangeRate,
          PaymentMoneyDirection.Collection)).ToList();
        if (preparation.Change is not null)
          moneyLines.Add(new PaymentMoneyLineCommand(
            preparation.Change.Account.Id,
            preparation.Change.Request.Amount,
            preparation.Change.ExchangeRate,
            PaymentMoneyDirection.Change));

        if (payment is null)
          payment = await _payments.CreateAsync(new CreatePaymentCommand(
            invoice.BranchId,
            invoice.CustomerId,
            invoice.InvoiceDate,
            invoice.CurrencyId,
            PaymentOrigin.Pos,
            invoice.Id,
            "POS checkout settlement",
            [new PaymentAllocationCommand(invoice.Id, settledBase)],
            moneyLines), userId, ct);
        else
          await _payments.ReplaceOwnedPaymentAsync(
            payment,
            invoice.InvoiceDate,
            "POS checkout settlement",
            [new PaymentAllocationCommand(invoice.Id, settledBase)],
            moneyLines,
            reason,
            userId,
            ct);

      }
      else if (payment is not null)
      {
        await _payments.DeleteOwnedPaymentAsync(payment, reason, userId, ct);
        payment = null;
      }

      var correctedAtUtc = DateTime.UtcNow;
      invoice.UpdatedAtUtc = correctedAtUtc;
      _db.ActivityLogs.Add(new ActivityLogEntity
      {
        BranchId = invoice.BranchId,
        UserId = userId,
        Action = "corrected",
        EntityType = "POS Settlement",
        EntityId = invoice.Id,
        DocumentNumber = invoice.DocumentNumber,
        Description = "Corrected POS settlement",
        Reason = reason,
        BeforeState = before,
        AfterState = SettlementSnapshot(context, payment),
        TimestampUtc = correctedAtUtc
      });

      await _db.SaveChangesAsync(ct);
      if (transaction is not null) await transaction.CommitAsync(ct);
      return await GetSaleAsync(salesInvoiceId, ct);
    }
    catch (DbUpdateConcurrencyException)
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw SettlementConcurrencyConflict();
    }
    catch
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw;
    }
  }

  private IQueryable<PosContextEntity> SettlementCorrectionQuery() => _db.PosContexts
    .Include(context => context.SalesInvoice).ThenInclude(invoice => invoice.Customer)
    .Include(context => context.SalesInvoice).ThenInclude(invoice => invoice.BaseCurrency)
    .Include(context => context.Refunds);

  private static void EnsureSettlementTimestamp(SalesInvoiceEntity invoice, DateTime expectedUpdatedAtUtc)
  {
    var expected = expectedUpdatedAtUtc.Kind == DateTimeKind.Utc
      ? expectedUpdatedAtUtc
      : expectedUpdatedAtUtc.ToUniversalTime();
    if (expected == default || invoice.UpdatedAtUtc != expected)
      throw SettlementConcurrencyConflict();
  }

  private static string SettlementSnapshot(PosContextEntity context, PaymentEntity? payment) =>
    JsonSerializer.Serialize(new
    {
      context.SalesInvoiceId,
      context.SalesInvoice.UpdatedAtUtc,
      PaymentId = payment?.Id,
      PaymentDocumentNumber = payment?.DocumentNumber,
      MoneyLines = payment?.MoneyLines.OrderBy(line => line.Sequence).Select(line => new
      {
        line.Id,
        line.Sequence,
        line.Direction,
        line.MoneyAccountId,
        line.Amount,
        line.ExchangeRate,
        line.BaseAmount,
        line.MoneyLedgerEntryId
      })
    });

  private static ConflictException SettlementDependent(string message) =>
    new(ErrorCodes.Sales.InvoiceHasDependentTransaction, message);

  private static ConflictException SettlementConcurrencyConflict() =>
    new(ErrorCodes.Pos.SettlementConcurrencyConflict,
      "This POS sale changed after it was loaded. Refresh it and try again.");

  private IQueryable<PosContextEntity> SaleQuery() => _db.PosContexts.AsNoTracking()
    .Where(sale => !sale.SalesInvoice.IsDeleted)
    .Include(sale => sale.OperatorUser)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Customer)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Branch)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Warehouse)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.BaseCurrency)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Movements)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.PaymentAllocations).ThenInclude(allocation => allocation.Payment)
      .ThenInclude(payment => payment.MoneyLines).ThenInclude(line => line.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines).ThenInclude(line => line.Service)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines).ThenInclude(line => line.Product)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines).ThenInclude(line => line.UnitOfMeasure)
    .Include(sale => sale.SalesInvoice).ThenInclude(invoice => invoice.Lines).ThenInclude(line => line.Professional)
    .Include(sale => sale.Refunds).ThenInclude(refund => refund.ApprovedByUser);

  private static PosSaleResponse ToResponse(PosContextEntity sale, InvoiceSettlement settlement)
  {
    var invoice = sale.SalesInvoice;
    var payment = invoice.PaymentAllocations.Select(allocation => allocation.Payment)
      .Where(item => !item.IsDeleted && item.Origin == PaymentOrigin.Pos
        && item.SourceSalesInvoiceId == invoice.Id)
      .DistinctBy(item => item.Id)
      .SingleOrDefault();
    var moneyLines = payment?.MoneyLines.OrderBy(line => line.Sequence)
      .Select(ToMoneyLineResponse).ToList() ?? [];
    var collections = moneyLines.Where(line => line.Direction == PaymentMoneyDirection.Collection).ToList();
    var change = moneyLines.SingleOrDefault(line => line.Direction == PaymentMoneyDirection.Change);
    var grossCollectionBase = Money(collections.Sum(line => line.BaseAmount));
    var changeBase = change?.BaseAmount ?? 0m;
    var postedRefunds = sale.Refunds.Where(refund => refund.Status == PosRefundStatus.Posted)
      .OrderBy(refund => refund.PostedAtUtc).ToList();
    var refundedBase = Money(postedRefunds.Sum(refund => refund.TotalRefundBase));
    var remainingRefundableBase = Math.Max(Money(invoice.BaseTotal - refundedBase), 0);
    var refundStatus = refundedBase <= 0
      ? PosRefundState.NotRefunded
      : remainingRefundableBase <= 0
        ? PosRefundState.FullyRefunded
        : PosRefundState.PartiallyRefunded;
    return new PosSaleResponse(
      sale.SalesInvoiceId,
      invoice.DocumentNumber,
      invoice.CustomerId,
      invoice.Customer.Name,
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
      grossCollectionBase,
      changeBase,
      settlement.CollectedBaseAmount,
      settlement.OutstandingBaseAmount,
      settlement.OverpaidBaseAmount,
      refundedBase,
      remainingRefundableBase,
      Money(invoice.BaseTotal - refundedBase),
      refundStatus,
      PaymentStatus(settlement),
      payment?.Id,
      payment?.DocumentNumber,
      sale.OperatorUserId,
      sale.OperatorUser.Username,
      sale.CompletedAtUtc,
      invoice.UpdatedAtUtc,
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
        line.ProfessionalId,
        line.Professional?.Name,
        line.Quantity,
        line.ConversionOperation,
        line.ConversionFactor,
        line.BaseQuantity,
        line.UnitPrice,
        line.BaseUnitPrice,
        line.LineAmount)).ToList(),
      collections,
      change,
      postedRefunds.Select(refund => new PosRefundSummaryResponse(
        refund.Id, refund.DocumentNumber, refund.IsVoid, refund.Reason,
        refund.TotalRefundBase, refund.ReceivableReversalBase, refund.CashRefundBase,
        refund.PostedAtUtc, refund.ApprovedByUser.Username)).ToList());
  }

  private static PosPaymentMoneyLineResponse ToMoneyLineResponse(PaymentMoneyLineEntity line) => new(
    line.Id,
    line.Sequence,
    line.Direction,
    line.MoneyAccountId,
    line.MoneyAccount.Code,
    line.MoneyAccount.Name,
    line.MoneyAccount.CurrencyId,
    line.MoneyAccount.Currency.Code,
    line.Amount,
    line.ExchangeRate,
    line.BaseAmount,
    line.MoneyLedgerEntryId);

  private static SalesInvoicePaymentStatus PaymentStatus(InvoiceSettlement settlement) =>
    settlement.OverpaidBaseAmount > 0m
      ? SalesInvoicePaymentStatus.Overpaid
      : settlement.OutstandingBaseAmount <= 0m
        ? SalesInvoicePaymentStatus.Paid
        : settlement.CollectedBaseAmount <= 0m
          ? SalesInvoicePaymentStatus.Unpaid
          : SalesInvoicePaymentStatus.PartiallyPaid;

  private static void ValidateRequestShape(CompletePosSaleRequest request)
  {
    if (request.Lines.Count == 0)
      throw new BadRequestException(ErrorCodes.Pos.LinesRequired, "Add at least one Service or Product.");
    if (!Enum.IsDefined(request.PaymentMode))
      throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid, "Select a valid POS payment mode.");
    if (request.PaymentMode is PosPaymentMode.Paid or PosPaymentMode.Partial && request.Collections.Count == 0)
      throw new BadRequestException(ErrorCodes.Pos.CollectionRequired, "Add at least one collection money line.");
    if (request.PaymentMode == PosPaymentMode.Credit && request.Collections.Count > 0)
      throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid,
        "Credit POS Sales cannot include collection money lines. Choose Partial when money is received now.");
    if (request.PaymentMode != PosPaymentMode.Paid && request.Change is not null)
      throw new BadRequestException(ErrorCodes.Pos.ChangeNotDue,
        "Change can only be recorded for a fully paid POS Sale.");
    if (request.Lines.Any(line => line.Quantity <= 0))
      throw new BadRequestException(ErrorCodes.Pos.LineInvalid, "POS quantities must be greater than zero.");
    if (request.Collections.Any(line => line.MoneyAccountId == Guid.Empty || line.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Pos.CollectionInvalid,
        "Every collection requires a Money Account and an amount greater than zero.");
    if (request.Change is not null
      && (request.Change.MoneyAccountId == Guid.Empty || request.Change.Amount <= 0))
      throw new BadRequestException(ErrorCodes.Pos.ChangeMismatch,
        "Change requires a Money Account and an amount greater than zero.");
    if (request.Lines.Any(line => line.LineType == SalesLineType.Service
      && (line.ProfessionalId is null || line.ProfessionalId == Guid.Empty)))
      throw new BadRequestException(ErrorCodes.Sales.ProfessionalInvalid,
        "Every POS Service line requires a Professional.");

    foreach (var line in request.Lines)
    {
      var service = line.LineType == SalesLineType.Service && line.ServiceId is not null && line.ServiceId != Guid.Empty
        && line.ProductId is null && line.UnitOfMeasureId is null
        && line.ProfessionalId is not null && line.ProfessionalId != Guid.Empty;
      var product = line.LineType == SalesLineType.Product && line.ProductId is not null && line.ProductId != Guid.Empty
        && line.ServiceId is null && line.ProfessionalId is null
        && line.UnitOfMeasureId is not null && line.UnitOfMeasureId != Guid.Empty;
      if (!service && !product)
        throw new BadRequestException(ErrorCodes.Pos.LineInvalid,
          "Each POS line must reference exactly one Service or Product, and every Service requires a Professional.");
    }

    var serviceIds = request.Lines.Where(line => line.LineType == SalesLineType.Service)
      .Select(line => line.ServiceId!.Value).ToList();
    var productIds = request.Lines.Where(line => line.LineType == SalesLineType.Product)
      .Select(line => line.ProductId!.Value).ToList();
    if (serviceIds.Distinct().Count() != serviceIds.Count || productIds.Distinct().Count() != productIds.Count)
      throw new BadRequestException(ErrorCodes.Pos.DuplicateLine, "A Service or Product can appear only once in the POS cart.");
  }

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);

  private async Task<PosSaleResponse?> FindIdempotentSaleAsync(Guid clientRequestId, string fingerprint, CancellationToken ct)
  {
    var query = _db.PosContexts.IgnoreQueryFilters().AsNoTracking()
      .Include(sale => sale.SalesInvoice)
      .Where(sale => sale.ClientRequestId == clientRequestId);
    if (_db.SelectedBranchId is Guid branchId)
      query = query.Where(sale => sale.SalesInvoice.BranchId == branchId);
    var existing = await query.SingleOrDefaultAsync(ct);
    if (existing is null) return null;
    if (!string.Equals(existing.RequestFingerprint, fingerprint, StringComparison.Ordinal))
      throw new ConflictException(ErrorCodes.Pos.IdempotencyKeyReused,
        "This client request ID was already used with different checkout data.");
    if (existing.SalesInvoice.IsDeleted)
      throw new ConflictException(ErrorCodes.Pos.IdempotencyKeyReused,
        "This client request ID belongs to a deleted POS Sale and cannot be reused.");
    return await GetSaleAsync(existing.SalesInvoiceId, ct);
  }

  private static string Fingerprint(CompletePosSaleRequest request) => Hash(new
  {
    request.BranchId,
    request.WarehouseId,
    request.CustomerId,
    request.PaymentMode,
    Lines = request.Lines
      .OrderBy(line => line.LineType).ThenBy(line => line.ServiceId).ThenBy(line => line.ProductId)
      .Select(line => new { line.LineType, line.ServiceId, line.ProductId, line.UnitOfMeasureId, line.Quantity, line.ProfessionalId }),
    Collections = request.Collections.OrderBy(line => line.MoneyAccountId).ThenBy(line => line.Amount)
      .Select(line => new { line.MoneyAccountId, line.Amount }),
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

}
