using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Pos;
using Api.Modules.Professional;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Modules.Sales;

public sealed class SalesService
{
  private readonly AppDbContext _db;
  private readonly SalesOptions _options;
  private readonly PaymentService _payments;
  private readonly InvoiceSettlementReader _settlements;

  public SalesService(
    AppDbContext db,
    IOptions<SalesOptions> options,
    PaymentService? payments = null,
    InvoiceSettlementReader? settlements = null)
  {
    _db = db;
    _options = options.Value;
    _payments = payments ?? new PaymentService(db);
    _settlements = settlements ?? new InvoiceSettlementReader(db);
  }

  public async Task<PagedResult<ServiceCategoryResponse>> GetServiceCategoriesAsync(
    ServiceCategoryListQuery request,
    CancellationToken ct)
  {
    var query = _db.ServiceCategories.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(category => category.Name.ToLower().Contains(search));
    }
    if (request.IsActive is not null) query = query.Where(category => category.IsActive == request.IsActive);

    return await query
      .OrderBy(category => category.Name)
      .ThenBy(category => category.Id)
      .Select(category => new ServiceCategoryResponse(category.Id, category.Name, category.IsActive))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<ServiceCategoryResponse> CreateServiceCategoryAsync(
    ServiceCategoryRequest request,
    CancellationToken ct)
  {
    var name = request.Name.Trim();
    await EnsureCategoryNameAvailableAsync(name, null, ct);
    var category = new ServiceCategoryEntity { Name = name, IsActive = request.IsActive };
    _db.ServiceCategories.Add(category);
    await SaveCategoryAsync(ct);
    return ToCategoryResponse(category);
  }

  public async Task<ServiceCategoryResponse> UpdateServiceCategoryAsync(
    Guid id,
    ServiceCategoryRequest request,
    CancellationToken ct)
  {
    var category = await _db.ServiceCategories.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Sales.ServiceCategoryNotFound, "Service category not found.");
    var name = request.Name.Trim();
    await EnsureCategoryNameAvailableAsync(name, id, ct);
    category.Name = name;
    category.IsActive = request.IsActive;
    await SaveCategoryAsync(ct);
    return ToCategoryResponse(category);
  }

  public async Task DeleteServiceCategoryAsync(Guid id, CancellationToken ct)
  {
    var category = await _db.ServiceCategories.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Sales.ServiceCategoryNotFound, "Service category not found.");
    if (await _db.Services.AnyAsync(service => service.CategoryId == id, ct))
      throw new BadRequestException(ErrorCodes.Sales.ServiceCategoryInUse, "A category used by services cannot be deleted. Deactivate it instead.");
    _db.ServiceCategories.Remove(category);
    await _db.SaveChangesAsync(ct);
  }

  public async Task<PagedResult<ServiceResponse>> GetServicesAsync(ServiceListQuery request, CancellationToken ct)
  {
    var query = _db.Services.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(service => service.Name.ToLower().Contains(search)
        || (service.Description != null && service.Description.ToLower().Contains(search)));
    }
    if (request.CategoryId is not null) query = query.Where(service => service.CategoryId == request.CategoryId);
    if (request.IsActive is not null) query = query.Where(service => service.IsActive == request.IsActive);

    return await query
      .OrderBy(service => service.Name)
      .ThenBy(service => service.Id)
      .Select(service => new ServiceResponse(
        service.Id,
        service.Name,
        service.CategoryId,
        service.Category.Name,
        service.SellingPriceBase,
        service.DurationMinutes,
        service.RevenueAccountId,
        service.RevenueAccount.Code,
        service.RevenueAccount.Name,
        service.IsActive,
        service.Description))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<ServiceResponse> GetServiceAsync(Guid id, CancellationToken ct)
  {
    var service = await ServiceQuery().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Sales.ServiceNotFound, "Service not found.");
    return ToServiceResponse(service);
  }

  public async Task<ServiceResponse> CreateServiceAsync(ServiceRequest request, CancellationToken ct)
  {
    await ValidateServiceAsync(request, null, ct);
    var service = new ServiceEntity();
    Apply(service, request);
    _db.Services.Add(service);
    await _db.SaveChangesAsync(ct);
    return await GetServiceAsync(service.Id, ct);
  }

  public async Task<ServiceResponse> UpdateServiceAsync(Guid id, ServiceRequest request, CancellationToken ct)
  {
    var service = await _db.Services.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Sales.ServiceNotFound, "Service not found.");
    await ValidateServiceAsync(request, service.CategoryId, ct);
    Apply(service, request);
    await _db.SaveChangesAsync(ct);
    return await GetServiceAsync(id, ct);
  }

  public async Task DeleteServiceAsync(Guid id, CancellationToken ct)
  {
    var service = await _db.Services.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Sales.ServiceNotFound, "Service not found.");
    if (await _db.SalesInvoiceLines.IgnoreQueryFilters().AnyAsync(line => line.ServiceId == id, ct))
      throw new BadRequestException(ErrorCodes.Sales.ServiceHasHistory, "A service with sales history cannot be deleted. Deactivate it instead.");
    _db.Services.Remove(service);
    await _db.SaveChangesAsync(ct);
  }

  public async Task<PagedResult<SalesInvoiceListResponse>> GetInvoicesAsync(
    SalesInvoiceListQuery request,
    CancellationToken ct)
  {
    // The current product workflow exposes only saved, effective invoices.
    // Draft rows remain available to the separate Draft/Post workflow.
    var query = _db.SalesInvoices.AsNoTracking()
      .Where(invoice => invoice.Status == SalesInvoiceStatus.Posted)
      .AsQueryable();
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(invoice => invoice.DocumentNumber.ToLower().Contains(search)
        || (invoice.Customer != null && invoice.Customer.Name.ToLower().Contains(search)));
    }
    if (request.CustomerId is not null) query = query.Where(invoice => invoice.CustomerId == request.CustomerId);
    if (request.FromDate is not null) query = query.Where(invoice => invoice.InvoiceDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(invoice => invoice.InvoiceDate <= request.ToDate);
    if (request.BranchId is not null) query = query.Where(invoice => invoice.BranchId == request.BranchId);
    if (request.CurrencyId is not null) query = query.Where(invoice => invoice.CurrencyId == request.CurrencyId);
    if (request.Status is not null) query = query.Where(invoice => invoice.Status == request.Status);

    var sortBy = request.SortBy?.Trim().ToLowerInvariant();
    var desc = request.SortDescending ?? false;

    var orderedQuery = sortBy switch
    {
      "document" or "documentnumber" => desc
        ? query.OrderByDescending(i => i.DocumentNumber)
        : query.OrderBy(i => i.DocumentNumber),
      "customer" or "customername" => desc
        ? query.OrderByDescending(i => i.Customer != null ? i.Customer.Name : string.Empty).ThenByDescending(i => i.InvoiceDate)
        : query.OrderBy(i => i.Customer != null ? i.Customer.Name : string.Empty).ThenBy(i => i.InvoiceDate),
      "date" or "invoicedate" => desc
        ? query.OrderByDescending(i => i.InvoiceDate).ThenByDescending(i => i.DocumentNumber)
        : query.OrderBy(i => i.InvoiceDate).ThenBy(i => i.DocumentNumber),
      "branch" or "branchname" => desc
        ? query.OrderByDescending(i => i.Branch.Name).ThenByDescending(i => i.InvoiceDate)
        : query.OrderBy(i => i.Branch.Name).ThenBy(i => i.InvoiceDate),
      "warehouse" or "warehousename" => desc
        ? query.OrderByDescending(i => i.Warehouse != null ? i.Warehouse.Name : string.Empty).ThenByDescending(i => i.InvoiceDate)
        : query.OrderBy(i => i.Warehouse != null ? i.Warehouse.Name : string.Empty).ThenBy(i => i.InvoiceDate),
      "currency" or "currencycode" => desc
        ? query.OrderByDescending(i => i.Currency.Code).ThenByDescending(i => i.InvoiceDate)
        : query.OrderBy(i => i.Currency.Code).ThenBy(i => i.InvoiceDate),
      "total" => desc
        ? query.OrderByDescending(i => i.Total).ThenByDescending(i => i.InvoiceDate)
        : query.OrderBy(i => i.Total).ThenBy(i => i.InvoiceDate),
      "createdby" or "createdbyusername" => desc
        ? query.OrderByDescending(i => i.CreatedByUser.Username).ThenByDescending(i => i.InvoiceDate)
        : query.OrderBy(i => i.CreatedByUser.Username).ThenBy(i => i.InvoiceDate),
      _ => query.OrderByDescending(invoice => invoice.InvoiceDate).ThenByDescending(invoice => invoice.DocumentNumber)
    };

    return await orderedQuery
      .Select(invoice => new SalesInvoiceListResponse(
        invoice.Id,
        invoice.DocumentNumber,
        invoice.CustomerId,
        invoice.Customer.Name,
        invoice.InvoiceDate,
        invoice.BranchId,
        invoice.Branch.Name,
        invoice.WarehouseId,
        invoice.Warehouse == null ? null : invoice.Warehouse.Name,
        invoice.CurrencyId,
        invoice.Currency.Code,
        invoice.Total,
        invoice.BaseTotal,
        invoice.Status,
        invoice.CreatedByUserId,
        invoice.CreatedByUser.Username,
        invoice.CreatedAtUtc,
        invoice.UpdatedAtUtc,
        invoice.PostedAtUtc))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<PagedResult<SalesCatalogItemResponse>> GetCatalogItemsAsync(
    SalesCatalogQuery query,
    CancellationToken ct)
  {
    var normalized = query.Normalize();

    var servicesQuery = _db.Services.AsNoTracking()
      .Include(s => s.Category)
      .Where(s => query.IsActive == null || s.IsActive == query.IsActive);

    var productsQuery = _db.Products.AsNoTracking()
      .Include(p => p.Category)
      .Include(p => p.UnitOfMeasure)
      .Include(p => p.UnitConversions).ThenInclude(u => u.UnitOfMeasure)
      .Where(p => p.TrackInventory && (p.Purpose == ProductPurpose.Resale || p.Purpose == ProductPurpose.Both))
      .Where(p => query.IsActive == null || p.IsActive == query.IsActive);

    if (query.CategoryId.HasValue)
    {
      servicesQuery = servicesQuery.Where(s => s.CategoryId == query.CategoryId.Value);
      productsQuery = productsQuery.Where(p => p.CategoryId == query.CategoryId.Value);
    }

    if (!string.IsNullOrWhiteSpace(query.Search))
    {
      var term = query.Search.Trim().ToLower();
      servicesQuery = servicesQuery.Where(s => s.Name.ToLower().Contains(term));
      productsQuery = productsQuery.Where(p =>
        p.Name.ToLower().Contains(term) || (p.SKU != null && p.SKU.ToLower().Contains(term)));
    }

    var services = servicesQuery.OrderBy(s => s.Name).Select(s => new SalesCatalogItemResponse(
      s.Id,
      s.Name,
      SalesLineType.Service,
      s.SellingPriceBase,
      s.CategoryId,
      s.Category.Name,
      null,
      null,
      null,
      null,
      s.DurationMinutes,
      s.IsActive,
      null,
      new List<ProductUnitConversionResponse>()));

    var products = productsQuery.OrderBy(p => p.Name).Select(p => new SalesCatalogItemResponse(
      p.Id,
      p.Name,
      SalesLineType.Product,
      p.SellingPriceBase,
      p.CategoryId,
      p.Category.Name,
      p.SKU,
      p.UnitOfMeasureId,
      p.UnitOfMeasure.Name,
      p.UnitOfMeasure.Code,
      null,
      p.IsActive,
      query.WarehouseId == null
        ? null
        : (decimal?)p.StockMovements.Where(m => m.WarehouseId == query.WarehouseId)
            .Sum(m => m.QuantityIn - m.QuantityOut),
      p.UnitConversions
        .OrderBy(u => u.UnitOfMeasure.Code)
        .Select(u => new ProductUnitConversionResponse(
          u.Id,
          u.UnitOfMeasureId,
          u.UnitOfMeasure.Name,
          u.UnitOfMeasure.Code,
          u.Operation,
          u.Factor))
        .ToList()));

    if (query.ItemType == SalesLineType.Service)
      return await services.ToPagedResultAsync(query, ct);
    if (query.ItemType == SalesLineType.Product)
      return await products.ToPagedResultAsync(query, ct);

    var serviceCount = await services.CountAsync(ct);
    var productCount = await products.CountAsync(ct);
    var skip = Math.Min((long)(normalized.Page - 1) * normalized.PageSize, int.MaxValue);
    var items = new List<SalesCatalogItemResponse>(normalized.PageSize);
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
    return new PagedResult<SalesCatalogItemResponse>(
      items, serviceCount + productCount, normalized.Page, normalized.PageSize);
  }

  public async Task<SalesInvoiceResponse> GetInvoiceAsync(Guid id, CancellationToken ct)
  {
    var invoice = await InvoiceQuery().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw InvoiceNotFound();
    var settlement = await _settlements.GetAsync(id, ct);
    return ToInvoiceResponse(invoice, settlement);
  }

  public async Task<SalesInvoiceResponse> CreateInvoiceAsync(
    SalesInvoiceDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var validation = await ValidateInvoiceAsync(request, true, ct);
    var invoice = new SalesInvoiceEntity
    {
      DocumentNumber = await NextDocumentNumberAsync(ct),
      CreatedByUserId = userId
    };
    Apply(invoice, request, validation.BaseCurrencyId, validation.ExchangeRate);
    ReplaceLines(invoice, request.Lines, validation);
    Recalculate(invoice);
    _db.SalesInvoices.Add(invoice);
    await SaveNewInvoiceAsync(ct);
    return await GetInvoiceAsync(invoice.Id, ct);
  }

  public async Task<SalesInvoiceResponse> CreateActiveInvoiceAsync(
    SalesInvoiceDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    await using var transaction = _db.Database.IsRelational()
      ? await _db.Database.BeginTransactionAsync(ct)
      : null;

    try
    {
      var validation = await ValidateInvoiceAsync(request, requireCustomer: true, ct);
      var invoice = new SalesInvoiceEntity
      {
        DocumentNumber = await NextDocumentNumberAsync(ct),
        CreatedByUserId = userId
      };
      Apply(invoice, request, validation.BaseCurrencyId, validation.ExchangeRate);
      ReplaceLines(invoice, request.Lines, validation);
      Recalculate(invoice);
      _db.SalesInvoices.Add(invoice);

      // This lower-level generator creates all accounting and stock effects but
      // does not write workflow activity. The single save below records one
      // user-facing "created" activity for the active invoice.
      await PreparePostingEffectsAsync(invoice, validation, userId, "Sales invoice", ct);
      var embeddedPayments = request.Payments ?? [];
      if (Money(embeddedPayments.Sum(payment => payment.Amount)) > invoice.Total)
        throw new BadRequestException(ErrorCodes.Finance.PaymentAllocationExceedsOutstanding,
          "Embedded Payments cannot exceed the Sales Invoice total.");
      foreach (var embedded in embeddedPayments)
        await _payments.CreateDirectInvoicePaymentAsync(invoice, new InvoicePaymentRequest(
          embedded.PaymentDate, embedded.MoneyAccountId, embedded.Amount,
          embedded.ExchangeRate, embedded.Notes), userId, ct);
      await SaveNewInvoiceAsync(ct);

      if (transaction is not null) await transaction.CommitAsync(ct);
      return await GetInvoiceAsync(invoice.Id, ct);
    }
    catch
    {
      if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
      throw;
    }
  }

  public async Task<SalesInvoiceResponse> UpdateInvoiceAsync(
    Guid id,
    SalesInvoiceDraftRequest request,
    CancellationToken ct)
  {
    var invoice = await _db.SalesInvoices.Include(item => item.Lines)
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw InvoiceNotFound();
    EnsureDraft(invoice.Status);
    var validation = await ValidateInvoiceAsync(request, true, ct);
    Apply(invoice, request, validation.BaseCurrencyId, validation.ExchangeRate);
    ReplaceLines(invoice, request.Lines, validation);
    Recalculate(invoice);
    invoice.UpdatedAtUtc = DateTime.UtcNow;
    await SaveInvoiceMutationAsync(ct);
    return await GetInvoiceAsync(id, ct);
  }

  public async Task DeleteInvoiceAsync(Guid id, CancellationToken ct)
  {
    var invoice = await _db.SalesInvoices.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw InvoiceNotFound();
    EnsureDraft(invoice.Status);
    _db.SalesInvoices.Remove(invoice);
    await SaveInvoiceMutationAsync(ct);
  }

  public async Task<SalesInvoiceResponse> PostInvoiceAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var invoice = await _db.SalesInvoices.Include(item => item.Lines)
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw InvoiceNotFound();
    EnsureDraft(invoice.Status);

    var request = new SalesInvoiceDraftRequest(
      invoice.CustomerId,
      invoice.InvoiceDate,
      invoice.BranchId,
      invoice.WarehouseId,
      invoice.CurrencyId,
      invoice.ExchangeRate,
      invoice.Notes,
      invoice.Lines.Select(line => new SalesInvoiceLineRequest(
        line.LineType,
        line.ServiceId,
        line.ProductId,
        line.UnitOfMeasureId,
        line.Description,
        line.Quantity,
        line.UnitPrice,
        line.ProfessionalId)).ToList());

    var validation = await ValidateInvoiceAsync(request, true, ct, validateUnits: false);
    Apply(invoice, request, validation.BaseCurrencyId, validation.ExchangeRate);
    Recalculate(invoice);

    await PreparePostingEffectsAsync(invoice, validation, userId, "Sales invoice", ct);
    await SaveInvoiceMutationAsync(ct);
    return await GetInvoiceAsync(id, ct);
  }

  internal async Task<SalesInvoiceEntity> PrepareImmediateSaleAsync(
    SalesInvoiceDraftRequest request,
    string documentNumber,
    Guid userId,
    CancellationToken ct)
  {
    var validation = await ValidateInvoiceAsync(request, false, ct);
    var invoice = new SalesInvoiceEntity
    {
      DocumentNumber = documentNumber,
      CreatedByUserId = userId
    };
    Apply(invoice, request, validation.BaseCurrencyId, validation.ExchangeRate);
    ReplaceLines(invoice, request.Lines, validation);
    Recalculate(invoice);
    _db.SalesInvoices.Add(invoice);

    await PreparePostingEffectsAsync(invoice, validation, userId, "POS sale", ct);
    return invoice;
  }

  internal async Task PreparePostingEffectsAsync(
    SalesInvoiceEntity invoice,
    InvoiceValidation validation,
    Guid userId,
    string journalDescription,
    CancellationToken ct,
    DateTime? postedAtUtc = null,
    bool preserveInvoiceTimestamps = false)
  {
    var productLines = invoice.Lines.Where(line => line.LineType == SalesLineType.Product).ToList();
    var receivableBase = invoice.BaseTotal;

    var accountCodes = new List<string>();
    accountCodes.Add(_options.AccountsReceivableAccountCode);
    if (productLines.Count > 0)
    {
      accountCodes.Add(_options.ProductRevenueAccountCode);
      accountCodes.Add(_options.CostOfGoodsSoldAccountCode);
      accountCodes.Add(_options.InventoryAccountCode);
    }
    var accounts = await _db.Accounts.Where(account => accountCodes.Contains(account.Code))
      .ToDictionaryAsync(account => account.Code, ct);

    var receivableAccount = GetPostingAccount(accounts, _options.AccountsReceivableAccountCode,
      AccountClassification.Asset, "accounts receivable");
    invoice.AccountsReceivableAccountId = receivableAccount.Id;

    AccountEntity? productRevenueAccount = null;
    AccountEntity? costOfGoodsSoldAccount = null;
    AccountEntity? inventoryAccount = null;
    var balances = new Dictionary<Guid, ProductBalance>();
    if (productLines.Count > 0)
    {
      productRevenueAccount = GetPostingAccount(accounts, _options.ProductRevenueAccountCode, AccountClassification.Revenue, "product sales revenue");
      costOfGoodsSoldAccount = GetPostingAccount(accounts, _options.CostOfGoodsSoldAccountCode, AccountClassification.Expense, "cost of goods sold");
      inventoryAccount = GetPostingAccount(accounts, _options.InventoryAccountCode, AccountClassification.Asset, "inventory");
      balances = await GetProductBalancesAsync(invoice.WarehouseId!.Value, productLines.Select(line => line.ProductId!.Value), ct);
      foreach (var line in productLines)
      {
        var balance = balances.GetValueOrDefault(line.ProductId!.Value);
        if (balance is null || line.BaseQuantity > balance.Quantity)
          throw new BadRequestException(ErrorCodes.Sales.InsufficientStock, "A product line exceeds current warehouse stock.");
      }
    }

    var postedAt = postedAtUtc ?? DateTime.UtcNow;
    var journalLines = new List<JournalLineEntity>();
    if (receivableBase > 0)
    {
      journalLines.Add(new JournalLineEntity
      {
        AccountId = receivableAccount.Id,
        Description = $"Receivable from customer on {invoice.DocumentNumber}",
        CurrencyId = invoice.CurrencyId,
        ExchangeRate = invoice.ExchangeRate,
        OriginalDebitAmount = invoice.Total,
        DebitBaseAmount = receivableBase
      });
    }

    foreach (var line in invoice.Lines.Where(line => line.LineType == SalesLineType.Service))
      line.RevenueAccountId = validation.Services[line.ServiceId!.Value].RevenueAccountId;

    foreach (var group in invoice.Lines.Where(line => line.LineType == SalesLineType.Service)
      .GroupBy(line => validation.Services[line.ServiceId!.Value].RevenueAccountId))
    {
      journalLines.Add(new JournalLineEntity
      {
        AccountId = group.Key,
        Description = $"Service revenue on {invoice.DocumentNumber}",
        CurrencyId = invoice.CurrencyId,
        ExchangeRate = invoice.ExchangeRate,
        OriginalCreditAmount = group.Sum(line => line.LineAmount),
        CreditBaseAmount = group.Sum(line => line.BaseLineAmount)
      });
    }

    if (productLines.Count > 0)
    {
      foreach (var line in productLines)
      {
        var balance = balances[line.ProductId!.Value];
        line.RevenueAccountId = productRevenueAccount!.Id;
        line.InventoryAccountId = inventoryAccount!.Id;
        line.CostOfGoodsSoldAccountId = costOfGoodsSoldAccount!.Id;
        line.OriginalUnitCostBase = Money(balance.Value / balance.Quantity);
      }
      journalLines.Add(new JournalLineEntity
      {
        AccountId = productRevenueAccount!.Id,
        Description = $"Product revenue on {invoice.DocumentNumber}",
        CurrencyId = invoice.CurrencyId,
        ExchangeRate = invoice.ExchangeRate,
        OriginalCreditAmount = productLines.Sum(line => line.LineAmount),
        CreditBaseAmount = productLines.Sum(line => line.BaseLineAmount)
      });

      var totalCost = productLines.Sum(line => Money(line.BaseQuantity * line.OriginalUnitCostBase!.Value));
      if (totalCost > 0)
      {
        journalLines.Add(new JournalLineEntity
        {
          AccountId = costOfGoodsSoldAccount!.Id,
          Description = $"Cost of products sold on {invoice.DocumentNumber}",
          CurrencyId = invoice.BaseCurrencyId,
          ExchangeRate = 1,
          OriginalDebitAmount = totalCost,
          DebitBaseAmount = totalCost
        });
        journalLines.Add(new JournalLineEntity
        {
          AccountId = inventoryAccount!.Id,
          Description = $"Inventory issued on {invoice.DocumentNumber}",
          CurrencyId = invoice.BaseCurrencyId,
          ExchangeRate = 1,
          OriginalCreditAmount = totalCost,
          CreditBaseAmount = totalCost
        });
      }
    }

    var journal = new JournalEntryEntity
    {
      EntryDate = invoice.InvoiceDate,
      Reference = invoice.DocumentNumber,
      Description = $"{journalDescription} {invoice.DocumentNumber}",
      BranchId = invoice.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = postedAt,
      Lines = journalLines
    };
    invoice.JournalEntry = journal;
    _db.JournalEntries.Add(journal);

    foreach (var line in productLines)
    {
      var unitCostBase = line.OriginalUnitCostBase!.Value;
      var movement = new StockMovementEntity
      {
        ProductId = line.ProductId!.Value,
        WarehouseId = invoice.WarehouseId!.Value,
        Type = StockMovementType.Sale,
        MovementDate = invoice.InvoiceDate,
        QuantityIn = 0,
        QuantityOut = line.BaseQuantity,
        UnitCostBase = unitCostBase,
        Reference = invoice.DocumentNumber,
        Note = invoice.Notes,
        SalesInvoiceId = invoice.Id,
        SalesInvoiceLineId = line.Id,
        PerformedByUserId = userId
      };
      invoice.Movements.Add(movement);
      _db.StockMovements.Add(movement);
    }

    invoice.Status = SalesInvoiceStatus.Posted;
    if (!preserveInvoiceTimestamps)
    {
      invoice.PostedAtUtc = postedAt;
      invoice.UpdatedAtUtc = postedAt;
    }
  }

  private async Task ValidateServiceAsync(ServiceRequest request, Guid? currentCategoryId, CancellationToken ct)
  {
    if (request.SellingPriceBase < 0)
      throw new BadRequestException(ErrorCodes.Sales.ServicePriceInvalid, "Service selling price cannot be negative.");
    if (request.DurationMinutes <= 0)
      throw new BadRequestException(ErrorCodes.Sales.ServiceDurationInvalid, "Service duration must be greater than zero.");

    var category = await _db.ServiceCategories.AsNoTracking().SingleOrDefaultAsync(item => item.Id == request.CategoryId, ct)
      ?? throw new BadRequestException(ErrorCodes.Sales.ServiceCategoryInvalid, "Select a valid service category.");
    if (!category.IsActive && category.Id != currentCategoryId)
      throw new BadRequestException(ErrorCodes.Sales.ServiceCategoryInvalid, "Select an active service category.");

    var account = await _db.Accounts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == request.RevenueAccountId, ct);
    if (account is null || !account.IsActive || account.IsGroup || account.Classification != AccountClassification.Revenue)
      throw new BadRequestException(ErrorCodes.Sales.ServiceRevenueAccountInvalid, "Select an active Revenue posting account.");
  }

  internal async Task<List<SalesInvoiceLineRequest>> NormalizeLinesAsync(
    IEnumerable<SalesInvoiceLineRequest> lines,
    CancellationToken ct)
  {
    var lineList = lines.ToList();
    if (lineList.Count == 0) return lineList;

    var candidateIds = lineList
      .Select(line => line.ItemId ?? line.ServiceId ?? line.ProductId)
      .Where(id => id.HasValue && id != Guid.Empty)
      .Select(id => id!.Value)
      .Distinct()
      .ToList();

    var knownServices = await _db.Services.AsNoTracking()
      .Where(s => candidateIds.Contains(s.Id))
      .ToDictionaryAsync(s => s.Id, ct);

    var knownProducts = await _db.Products.AsNoTracking()
      .Where(p => candidateIds.Contains(p.Id))
      .ToDictionaryAsync(p => p.Id, ct);

    var normalized = new List<SalesInvoiceLineRequest>(lineList.Count);
    foreach (var line in lineList)
    {
      var targetId = line.ItemId ?? line.ServiceId ?? line.ProductId;
      if (targetId is null || targetId == Guid.Empty)
      {
        normalized.Add(line);
        continue;
      }

      var resolvedType = line.LineType;
      if (resolvedType is null)
      {
        if (knownServices.ContainsKey(targetId.Value))
          resolvedType = SalesLineType.Service;
        else if (knownProducts.ContainsKey(targetId.Value))
          resolvedType = SalesLineType.Product;
      }

      if (resolvedType == SalesLineType.Service)
      {
        normalized.Add(line with
        {
          LineType = SalesLineType.Service,
          ServiceId = targetId.Value,
          ProductId = null,
          UnitOfMeasureId = null,
          ItemId = targetId.Value,
        });
      }
      else if (resolvedType == SalesLineType.Product)
      {
        var defaultUomId = line.UnitOfMeasureId;
        if ((defaultUomId is null || defaultUomId == Guid.Empty) && knownProducts.TryGetValue(targetId.Value, out var prod))
        {
          defaultUomId = prod.UnitOfMeasureId;
        }

        normalized.Add(line with
        {
          LineType = SalesLineType.Product,
          ProductId = targetId.Value,
          ServiceId = null,
          UnitOfMeasureId = defaultUomId,
          ItemId = targetId.Value,
        });
      }
      else
      {
        normalized.Add(line);
      }
    }

    return normalized;
  }

  internal async Task<InvoiceValidation> ValidateInvoiceAsync(
    SalesInvoiceDraftRequest request,
    bool requireCustomer,
    CancellationToken ct,
    bool validateUnits = true)
  {
    var normalizedLines = await NormalizeLinesAsync(request.Lines, ct);
    request.Lines.Clear();
    request.Lines.AddRange(normalizedLines);

    if (request.Lines.Count == 0)
      throw new BadRequestException(ErrorCodes.Sales.LinesRequired, "Add at least one sales line.");
    if (request.Lines.Any(line => line.Quantity <= 0))
      throw new BadRequestException(ErrorCodes.Sales.QuantityInvalid, "Sales quantities must be greater than zero.");
    if (request.Lines.Any(line => line.UnitPrice < 0))
      throw new BadRequestException(ErrorCodes.Sales.UnitPriceInvalid, "Sales unit prices cannot be negative.");

    foreach (var line in request.Lines)
    {
      var validServiceLine = line.LineType == SalesLineType.Service
        && line.ServiceId is not null && line.ServiceId != Guid.Empty
        && line.ProductId is null && line.UnitOfMeasureId is null;
      var validProductLine = line.LineType == SalesLineType.Product
        && line.ProductId is not null && line.ProductId != Guid.Empty
        && line.UnitOfMeasureId is not null && line.UnitOfMeasureId != Guid.Empty
        && line.ServiceId is null && line.ProfessionalId is null;
      if (!validServiceLine && !validProductLine)
        throw new BadRequestException(ErrorCodes.Sales.LineTypeInvalid, "Each sales line must reference exactly one Service or Product.");
    }

    var serviceIds = request.Lines.Where(line => line.LineType == SalesLineType.Service)
      .Select(line => line.ServiceId!.Value).ToList();
    var productIds = request.Lines.Where(line => line.LineType == SalesLineType.Product)
      .Select(line => line.ProductId!.Value).ToList();
    if (serviceIds.Distinct().Count() != serviceIds.Count || productIds.Distinct().Count() != productIds.Count)
      throw new BadRequestException(ErrorCodes.Sales.DuplicateLine, "A Service or Product can appear only once on a sales invoice.");

    if (request.CustomerId is null)
      throw new BadRequestException(ErrorCodes.Sales.CustomerRequired, "Every Sales Invoice requires a customer.");
    var customer = await _db.Contacts.AsNoTracking().SingleOrDefaultAsync(contact =>
      contact.Id == request.CustomerId && contact.IsActive && contact.IsCustomer, ct);
    if (customer is null || (requireCustomer && customer.SystemRole is not null))
      throw new BadRequestException(ErrorCodes.Sales.CustomerInvalid,
        requireCustomer ? "Select an active non-system customer contact." : "Select an active customer contact.");

    var validBranch = await _db.Branches.AsNoTracking()
      .AnyAsync(branch => branch.Id == request.BranchId && branch.IsActive, ct);
    if (!validBranch)
      throw new BadRequestException(ErrorCodes.Sales.BranchInvalid, "Select an active branch.");

    if (productIds.Count > 0 && request.WarehouseId is null)
      throw new BadRequestException(ErrorCodes.Sales.WarehouseRequired, "Select a warehouse for product sales.");
    if (request.WarehouseId is not null)
    {
      var warehouse = await _db.Warehouses.AsNoTracking()
        .SingleOrDefaultAsync(item => item.Id == request.WarehouseId && item.IsActive, ct)
        ?? throw new BadRequestException(ErrorCodes.Sales.WarehouseInvalid, "Select an active warehouse.");
      if (warehouse.BranchId != request.BranchId)
        throw new BadRequestException(ErrorCodes.Sales.WarehouseBranchMismatch, "The selected warehouse does not belong to the sales branch.");
    }

    var validCurrency = await _db.Currencies.AsNoTracking()
      .AnyAsync(currency => currency.Id == request.CurrencyId && currency.IsActive, ct);
    if (!validCurrency)
      throw new BadRequestException(ErrorCodes.Sales.CurrencyInvalid, "Select an active currency.");

    var business = await _db.Businesses.AsNoTracking()
      .SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Sales.BusinessNotConfigured, "Complete Business Setup before recording sales.");
    var exchangeRate = request.CurrencyId == business.BaseCurrencyId
      ? 1m
      : request.ExchangeRate ?? await ExchangeRateResolver.FindAsync(
        _db,
        request.CurrencyId,
        business.BaseCurrencyId,
        request.InvoiceDate,
        ct);
    if (exchangeRate is null || exchangeRate <= 0)
      throw new BadRequestException(ErrorCodes.Sales.ExchangeRateRequired, "Enter a positive exchange rate for a foreign-currency sale.");

    var services = await _db.Services.AsNoTracking().Include(service => service.RevenueAccount)
      .Where(service => serviceIds.Contains(service.Id) && service.IsActive)
      .ToDictionaryAsync(service => service.Id, ct);
    if (services.Count != serviceIds.Count)
      throw new BadRequestException(ErrorCodes.Sales.ServiceInvalid, "Every Service line must use an active Service.");
    if (services.Values.Any(service => !service.RevenueAccount.IsActive
      || service.RevenueAccount.IsGroup
      || service.RevenueAccount.Classification != AccountClassification.Revenue))
      throw new BadRequestException(ErrorCodes.Sales.ServiceRevenueAccountInvalid, "Every Service requires an active Revenue posting account.");

    var professionalIds = request.Lines.Where(line => line.ProfessionalId is not null)
      .Select(line => line.ProfessionalId!.Value).Distinct().ToList();
    if (professionalIds.Count > 0)
    {
      var validProfessionals = await _db.Professionals.AsNoTracking().CountAsync(professional =>
        professionalIds.Contains(professional.Id) && professional.IsActive
        && professional.BranchAssignments.Any(assignment => assignment.BranchId == request.BranchId), ct);
      if (validProfessionals != professionalIds.Count)
        throw new BadRequestException(ErrorCodes.Sales.ProfessionalInvalid,
          "Every assigned Professional must be active and assigned to the sales branch.");
    }

    var products = await _db.Products.AsNoTracking()
      .Include(product => product.UnitOfMeasure)
      .Include(product => product.UnitConversions).ThenInclude(item => item.UnitOfMeasure)
      .Where(product => productIds.Contains(product.Id)
        && product.IsActive
        && product.TrackInventory
        && (product.Purpose == ProductPurpose.Resale || product.Purpose == ProductPurpose.Both))
      .ToDictionaryAsync(product => product.Id, ct);
    if (products.Count != productIds.Count)
      throw new BadRequestException(ErrorCodes.Sales.ProductInvalid, "Every Product line must use an active resale inventory Product.");
    var productUnits = new Dictionary<Guid, ProductUnitSelection>();
    if (validateUnits)
    {
      foreach (var line in request.Lines.Where(line => line.LineType == SalesLineType.Product))
      {
        var selection = UnitConversionCalculator.Resolve(
          products[line.ProductId!.Value],
          line.UnitOfMeasureId!.Value);
        if (selection is null || !selection.Value.IsActive || !selection.Value.IsValid)
          throw new BadRequestException(
            ErrorCodes.Sales.UnitInvalid,
            "Each Product line must use an active base unit or configured conversion unit.");

        var baseQuantity = Quantity(UnitConversionCalculator.ConvertToBaseQuantity(
          line.Quantity,
          selection.Value.Operation,
          selection.Value.Factor));
        if (baseQuantity <= 0)
          throw new BadRequestException(
            ErrorCodes.Sales.QuantityInvalid,
            "The selected quantity is too small for the Product's base-unit precision.");

        productUnits.Add(line.ProductId.Value, selection.Value);
      }
    }

    return new InvoiceValidation(
      business.BaseCurrencyId,
      exchangeRate.Value,
      services,
      products,
      productUnits);
  }

  internal static void Apply(
    SalesInvoiceEntity invoice,
    SalesInvoiceDraftRequest request,
    Guid baseCurrencyId,
    decimal exchangeRate)
  {
    invoice.CustomerId = request.CustomerId!.Value;
    invoice.InvoiceDate = request.InvoiceDate;
    invoice.BranchId = request.BranchId;
    invoice.WarehouseId = request.WarehouseId;
    invoice.CurrencyId = request.CurrencyId;
    invoice.BaseCurrencyId = baseCurrencyId;
    invoice.ExchangeRate = exchangeRate;
    invoice.Notes = Trim(request.Notes);
  }

  internal void ReplaceLines(
    SalesInvoiceEntity invoice,
    List<SalesInvoiceLineRequest> requests,
    InvoiceValidation validation)
  {
    foreach (var existing in invoice.Lines.ToList()) _db.SalesInvoiceLines.Remove(existing);
    invoice.Lines.Clear();
    foreach (var request in requests)
    {
      var selection = request.LineType == SalesLineType.Product
        ? validation.ProductUnits[request.ProductId!.Value]
        : new ProductUnitSelection(Guid.Empty, null, 1m, true);
      var masterBaseUnitPrice = request.LineType == SalesLineType.Product
        ? validation.Products[request.ProductId!.Value].SellingPriceBase
        : validation.Services[request.ServiceId!.Value].SellingPriceBase;
      var baseUnitPrice = request.UseMasterPrice
        ? Price(masterBaseUnitPrice)
        : Price(UnitConversionCalculator.ConvertUnitPriceToBasePrice(
          request.UnitPrice,
          selection.Operation,
          selection.Factor) * invoice.ExchangeRate);
      var unitPrice = request.UseMasterPrice
        ? Price(UnitConversionCalculator.ConvertBasePriceToUnitPrice(
          baseUnitPrice,
          selection.Operation,
          selection.Factor) / invoice.ExchangeRate)
        : Price(request.UnitPrice);
      var line = new SalesInvoiceLineEntity
      {
        SalesInvoiceId = invoice.Id,
        LineType = request.LineType!.Value,
        ServiceId = request.ServiceId,
        ProductId = request.ProductId,
        UnitOfMeasureId = request.UnitOfMeasureId,
        Description = Trim(request.Description),
        Quantity = request.Quantity,
        ConversionOperation = selection.Operation,
        ConversionFactor = selection.Factor,
        BaseQuantity = Quantity(UnitConversionCalculator.ConvertToBaseQuantity(
          request.Quantity,
          selection.Operation,
          selection.Factor)),
        UnitPrice = unitPrice,
        BaseUnitPrice = baseUnitPrice,
        IsPriceOverridden = !request.UseMasterPrice,
        ProfessionalId = request.ProfessionalId
      };
      invoice.Lines.Add(line);
      _db.SalesInvoiceLines.Add(line);
    }
  }

  internal static void Recalculate(SalesInvoiceEntity invoice)
  {
    foreach (var line in invoice.Lines)
    {
      line.LineSubtotal = Money(line.Quantity * line.UnitPrice);
      line.LineAmount = line.LineSubtotal;
      line.BaseLineAmount = Money(line.BaseQuantity * line.BaseUnitPrice);
    }
    invoice.Subtotal = invoice.Lines.Sum(line => line.LineSubtotal);
    invoice.Total = invoice.Lines.Sum(line => line.LineAmount);
    invoice.BaseTotal = invoice.Lines.Sum(line => line.BaseLineAmount);
  }

  private static void Apply(ServiceEntity service, ServiceRequest request)
  {
    service.Name = request.Name.Trim();
    service.CategoryId = request.CategoryId;
    service.SellingPriceBase = request.SellingPriceBase;
    service.DurationMinutes = request.DurationMinutes;
    service.RevenueAccountId = request.RevenueAccountId;
    service.IsActive = request.IsActive;
    service.Description = Trim(request.Description);
  }

  private async Task<Dictionary<Guid, ProductBalance>> GetProductBalancesAsync(
    Guid warehouseId,
    IEnumerable<Guid> productIds,
    CancellationToken ct)
  {
    var ids = productIds.Distinct().ToList();
    var rows = await _db.StockMovements.AsNoTracking()
      .Where(movement => movement.WarehouseId == warehouseId && ids.Contains(movement.ProductId))
      .GroupBy(movement => movement.ProductId)
      .Select(group => new
      {
        ProductId = group.Key,
        Quantity = group.Sum(movement => movement.QuantityIn - movement.QuantityOut),
        Value = group.Sum(movement => movement.QuantityIn * movement.UnitCostBase - movement.QuantityOut * movement.UnitCostBase)
      })
      .ToListAsync(ct);
    return rows.ToDictionary(row => row.ProductId, row => new ProductBalance(row.Quantity, row.Value));
  }

  private static AccountEntity GetPostingAccount(
    IReadOnlyDictionary<string, AccountEntity> accounts,
    string code,
    AccountClassification classification,
    string purpose)
  {
    if (!accounts.TryGetValue(code, out var account)
      || !account.IsActive
      || account.IsGroup
      || account.Classification != classification)
      throw new BadRequestException(ErrorCodes.Sales.AccountMappingInvalid, $"Configure an active posting account for {purpose}.");
    return account;
  }

  private async Task EnsureCategoryNameAvailableAsync(string name, Guid? excludedId, CancellationToken ct)
  {
    var normalized = name.ToLower();
    if (await _db.ServiceCategories.AnyAsync(category => category.Id != excludedId && category.Name.ToLower() == normalized, ct))
      throw new ConflictException(ErrorCodes.Sales.ServiceCategoryNameTaken, $"Service category '{name}' already exists.");
  }

  private async Task SaveCategoryAsync(CancellationToken ct)
  {
    try
    {
      await _db.SaveChangesAsync(ct);
    }
    catch (DbUpdateException)
    {
      throw new ConflictException(ErrorCodes.Sales.ServiceCategoryNameTaken, "A Service Category with this name already exists.");
    }
  }

  private async Task<string> NextDocumentNumberAsync(CancellationToken ct)
  {
    var last = await _db.SalesInvoices.IgnoreQueryFilters().Select(invoice => invoice.DocumentNumber)
      .Where(number => number.StartsWith("SI-"))
      .OrderByDescending(number => number)
      .FirstOrDefaultAsync(ct);
    var next = 1;
    if (last is not null && last.StartsWith("SI-") && int.TryParse(last[3..], out var current)) next = current + 1;
    return $"SI-{next:000000}";
  }

  private async Task SaveNewInvoiceAsync(CancellationToken ct)
  {
    try
    {
      await _db.SaveChangesAsync(ct);
    }
    catch (DbUpdateException)
    {
      throw new ConflictException(ErrorCodes.Sales.DocumentNumberConflict, "Could not allocate a unique Sales Invoice number. Try again.");
    }
  }

  private async Task SaveInvoiceMutationAsync(CancellationToken ct)
  {
    try
    {
      await _db.SaveChangesAsync(ct);
    }
    catch (DbUpdateConcurrencyException)
    {
      throw new ConflictException(ErrorCodes.Sales.DocumentNotDraft, "This Sales Invoice is no longer a Draft.");
    }
  }

  private IQueryable<ServiceEntity> ServiceQuery() => _db.Services.AsNoTracking()
    .Include(service => service.Category)
    .Include(service => service.RevenueAccount);

  private IQueryable<SalesInvoiceEntity> InvoiceQuery() => _db.SalesInvoices.AsNoTracking()
    .Include(invoice => invoice.Customer)
    .Include(invoice => invoice.Branch)
    .Include(invoice => invoice.Warehouse)
    .Include(invoice => invoice.Currency)
    .Include(invoice => invoice.BaseCurrency)
    .Include(invoice => invoice.CreatedByUser)
    .Include(invoice => invoice.PosContext).ThenInclude(context => context!.PosSession).ThenInclude(session => session.OpeningCounts).ThenInclude(count => count.MoneyAccount)
    .Include(invoice => invoice.PosContext).ThenInclude(context => context!.PosSession).ThenInclude(session => session.OpeningCounts).ThenInclude(count => count.Currency)
    .Include(invoice => invoice.PosContext).ThenInclude(context => context!.Payment)
    .Include(invoice => invoice.PosContext).ThenInclude(context => context!.CashierUser)
    .Include(invoice => invoice.PosContext).ThenInclude(context => context!.Tenders).ThenInclude(tender => tender.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(invoice => invoice.PosContext).ThenInclude(context => context!.Tenders).ThenInclude(tender => tender.PaymentMoneyLine)
    .Include(invoice => invoice.PosContext).ThenInclude(context => context!.Change).ThenInclude(change => change!.MoneyAccount).ThenInclude(account => account.Currency)
    .Include(invoice => invoice.PosContext).ThenInclude(context => context!.Change).ThenInclude(change => change!.PaymentMoneyLine)
    .Include(invoice => invoice.PosRefunds)
    .Include(invoice => invoice.Movements)
    .Include(invoice => invoice.PaymentAllocations).ThenInclude(allocation => allocation.Payment)
    .Include(invoice => invoice.Lines).ThenInclude(line => line.Service)
    .Include(invoice => invoice.Lines).ThenInclude(line => line.Product)
    .Include(invoice => invoice.Lines).ThenInclude(line => line.UnitOfMeasure)
    .Include(invoice => invoice.Lines).ThenInclude(line => line.Professional);

  private static SalesInvoiceResponse ToInvoiceResponse(
    SalesInvoiceEntity invoice,
    InvoiceSettlement settlement)
  {
    var payments = invoice.PaymentAllocations
      .OrderBy(allocation => allocation.Payment.PaymentDate)
      .ThenBy(allocation => allocation.Payment.DocumentNumber)
      .Select(allocation => new SalesInvoicePaymentResponse(
        allocation.PaymentId,
        allocation.Payment.DocumentNumber,
        allocation.Payment.PaymentDate,
        allocation.Amount,
        allocation.BaseAmount,
        allocation.Payment.Origin,
        allocation.Payment.JournalEntryId!.Value))
      .ToList();
    var paymentStatus = settlement.OverpaidAmount > 0
      ? SalesInvoicePaymentStatus.Overpaid
      : settlement.OutstandingAmount <= 0
        ? SalesInvoicePaymentStatus.Paid
      : settlement.CollectedAmount <= 0
        ? SalesInvoicePaymentStatus.Unpaid
        : SalesInvoicePaymentStatus.PartiallyPaid;
    SalesInvoicePosContextResponse? posContext = null;
    if (invoice.PosContext is not null)
    {
      var sale = invoice.PosContext;
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
        tender.PaymentMoneyLineId,
        tender.PaymentMoneyLine.MoneyLedgerEntryId)).ToList();
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
        sale.Change.PaymentMoneyLineId,
        sale.Change.PaymentMoneyLine.MoneyLedgerEntryId);
      var settledBase = Money(tenders.Sum(tender => tender.BaseAmount) - (change?.BaseAmount ?? 0m));
      var mode = settledBase <= 0
        ? PosPaymentMode.Credit
        : settledBase < invoice.BaseTotal
          ? PosPaymentMode.Partial
          : PosPaymentMode.Paid;
      posContext = new SalesInvoicePosContextResponse(
        sale.PosSessionId,
        sale.PosSession.SessionNumber,
        sale.PosSession.Status,
        sale.CashierUserId,
        sale.CashierUser.Username,
        sale.PaymentId,
        sale.Payment?.DocumentNumber,
        mode,
        sale.CompletedAtUtc,
        sale.PosSession.OpeningCounts.OrderBy(count => count.Currency.Code)
          .Select(count => new PosSessionCountResponse(
            count.MoneyAccountId,
            count.MoneyAccount.Code,
            count.MoneyAccount.Name,
            count.CurrencyId,
            count.Currency.Code,
            count.Currency.DecimalPlaces,
            count.Amount,
            count.ExchangeRate,
            count.BaseAmount))
          .ToList(),
        tenders,
        change);
    }

    return new SalesInvoiceResponse(
    invoice.Id,
    invoice.DocumentNumber,
    invoice.CustomerId,
    invoice.Customer.Name,
    invoice.InvoiceDate,
    invoice.BranchId,
    invoice.Branch.Code,
    invoice.Branch.Name,
    invoice.WarehouseId,
    invoice.Warehouse?.Code,
    invoice.Warehouse?.Name,
    invoice.CurrencyId,
    invoice.Currency.Code,
    invoice.BaseCurrencyId,
    invoice.BaseCurrency.Code,
    invoice.ExchangeRate,
    invoice.Subtotal,
    invoice.Total,
    invoice.BaseTotal,
    invoice.Status,
    invoice.Notes,
    invoice.CreatedByUserId,
    invoice.CreatedByUser.Username,
    invoice.CreatedAtUtc,
    invoice.UpdatedAtUtc,
    invoice.PostedAtUtc,
    invoice.JournalEntryId,
    settlement.CollectedAmount,
    settlement.ReceivableReductionAmount,
    settlement.OutstandingAmount,
    settlement.OverpaidAmount,
    paymentStatus,
    payments,
    invoice.Movements.OrderBy(movement => movement.Id).Select(movement => movement.Id).ToList(),
    invoice.Lines.OrderBy(line => line.LineType).ThenBy(line => line.Id).Select(line => new SalesInvoiceLineResponse(
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
      line.Description,
      line.Quantity,
      line.ConversionOperation,
      line.ConversionFactor,
      line.BaseQuantity,
      line.UnitPrice,
      line.BaseUnitPrice,
      line.IsPriceOverridden,
      line.LineSubtotal,
      line.LineAmount,
      line.BaseLineAmount)).ToList(),
    posContext);
  }

  private static ServiceResponse ToServiceResponse(ServiceEntity service) => new(
    service.Id,
    service.Name,
    service.CategoryId,
    service.Category.Name,
    service.SellingPriceBase,
    service.DurationMinutes,
    service.RevenueAccountId,
    service.RevenueAccount.Code,
    service.RevenueAccount.Name,
    service.IsActive,
    service.Description);

  private static ServiceCategoryResponse ToCategoryResponse(ServiceCategoryEntity category) =>
    new(category.Id, category.Name, category.IsActive);

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
  private static decimal Price(decimal value) => decimal.Round(value, 6, MidpointRounding.AwayFromZero);
  private static decimal Quantity(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private static void EnsureDraft(SalesInvoiceStatus status)
  {
    if (status != SalesInvoiceStatus.Draft)
      throw new ConflictException(ErrorCodes.Sales.DocumentNotDraft, "Posted Sales Invoices are immutable.");
  }

  private static NotFoundException InvoiceNotFound() =>
    new(ErrorCodes.Sales.InvoiceNotFound, "Sales Invoice not found.");

  internal sealed record InvoiceValidation(
    Guid BaseCurrencyId,
    decimal ExchangeRate,
    Dictionary<Guid, ServiceEntity> Services,
    Dictionary<Guid, ProductEntity> Products,
    IReadOnlyDictionary<Guid, ProductUnitSelection> ProductUnits);

  private sealed record ProductBalance(decimal Quantity, decimal Value);
}
