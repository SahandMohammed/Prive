using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Modules.Purchase;

public sealed class PurchaseService
{
  private readonly AppDbContext _db;
  private readonly PurchaseOptions _options;

  public PurchaseService(AppDbContext db, IOptions<PurchaseOptions> options)
  {
    _db = db;
    _options = options.Value;
  }

  public async Task<PagedResult<PurchaseInvoiceListResponse>> GetAllAsync(
    PurchaseInvoiceListQuery request,
    CancellationToken ct)
  {
    var query = _db.PurchaseInvoices.AsNoTracking().AsQueryable();

    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(invoice =>
        invoice.DocumentNumber.ToLower().Contains(search) ||
        (invoice.SupplierReference != null && invoice.SupplierReference.ToLower().Contains(search)) ||
        invoice.Supplier.Name.ToLower().Contains(search));
    }

    if (request.SupplierId is not null) query = query.Where(invoice => invoice.SupplierId == request.SupplierId);
    if (request.FromDate is not null) query = query.Where(invoice => invoice.InvoiceDate >= request.FromDate);
    if (request.ToDate is not null) query = query.Where(invoice => invoice.InvoiceDate <= request.ToDate);
    if (request.BranchId is not null) query = query.Where(invoice => invoice.BranchId == request.BranchId);
    if (request.WarehouseId is not null) query = query.Where(invoice => invoice.WarehouseId == request.WarehouseId);
    if (request.CurrencyId is not null) query = query.Where(invoice => invoice.CurrencyId == request.CurrencyId);
    if (request.Status is not null) query = query.Where(invoice => invoice.Status == request.Status);

    return await query
      .OrderByDescending(invoice => invoice.InvoiceDate)
      .ThenByDescending(invoice => invoice.DocumentNumber)
      .Select(invoice => new PurchaseInvoiceListResponse(
        invoice.Id,
        invoice.DocumentNumber,
        invoice.SupplierId,
        invoice.Supplier.Name,
        invoice.InvoiceDate,
        invoice.SupplierReference,
        invoice.BranchId,
        invoice.Branch.Name,
        invoice.WarehouseId,
        invoice.Warehouse.Name,
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

  public async Task<PurchaseInvoiceResponse> GetByIdAsync(Guid id, CancellationToken ct)
  {
    var invoice = await InvoiceQuery().SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw NotFound();

    return ToResponse(invoice);
  }

  public async Task<PurchaseInvoiceResponse> CreateAsync(
    PurchaseInvoiceDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    var validation = await ValidateAsync(request, ct);
    var invoice = new PurchaseInvoiceEntity
    {
      DocumentNumber = await NextDocumentNumberAsync(ct),
      CreatedByUserId = userId
    };

    Apply(invoice, request, validation.BaseCurrencyId, validation.ExchangeRate);
    ReplaceLines(invoice, request.Lines, validation);
    Recalculate(invoice);
    _db.PurchaseInvoices.Add(invoice);
    await SaveDraftAsync(ct);

    return await GetByIdAsync(invoice.Id, ct);
  }

  public async Task<PurchaseInvoiceResponse> UpdateAsync(
    Guid id,
    PurchaseInvoiceDraftRequest request,
    CancellationToken ct)
  {
    var invoice = await _db.PurchaseInvoices.Include(item => item.Lines)
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw NotFound();
    EnsureDraft(invoice.Status);

    var validation = await ValidateAsync(request, ct);
    Apply(invoice, request, validation.BaseCurrencyId, validation.ExchangeRate);
    ReplaceLines(invoice, request.Lines, validation);
    Recalculate(invoice);
    invoice.UpdatedAtUtc = DateTime.UtcNow;
    await SaveDraftMutationAsync(ct);

    return await GetByIdAsync(id, ct);
  }

  public async Task DeleteAsync(Guid id, CancellationToken ct)
  {
    var invoice = await _db.PurchaseInvoices.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw NotFound();
    EnsureDraft(invoice.Status);
    _db.PurchaseInvoices.Remove(invoice);
    await SaveDraftMutationAsync(ct);
  }

  public async Task<PurchaseInvoiceResponse> PostAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var invoice = await _db.PurchaseInvoices
      .Include(item => item.Lines)
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw NotFound();
    EnsureDraft(invoice.Status);

    var request = new PurchaseInvoiceDraftRequest(
      invoice.SupplierId,
      invoice.InvoiceDate,
      invoice.SupplierReference,
      invoice.BranchId,
      invoice.WarehouseId,
      invoice.CurrencyId,
      invoice.ExchangeRate,
      invoice.Notes,
      invoice.Lines.Select(line => new PurchaseInvoiceLineRequest(
        line.ProductId,
        line.UnitOfMeasureId,
        line.Quantity,
        line.UnitCost)).ToList());

    var validation = await ValidateAsync(request, ct, validateUnits: false);
    Apply(invoice, request, validation.BaseCurrencyId, validation.ExchangeRate);
    Recalculate(invoice);

    var accountCodes = new[] { _options.InventoryAccountCode, _options.AccountsPayableAccountCode };
    var accounts = await _db.Accounts
      .Where(account => accountCodes.Contains(account.Code))
      .ToDictionaryAsync(account => account.Code, ct);
    var inventoryAccount = GetPostingAccount(accounts, _options.InventoryAccountCode, AccountClassification.Asset, "inventory");
    var payableAccount = GetPostingAccount(accounts, _options.AccountsPayableAccountCode, AccountClassification.Liability, "accounts payable");

    var postedAt = DateTime.UtcNow;
    var journal = new JournalEntryEntity
    {
      EntryDate = invoice.InvoiceDate,
      Reference = invoice.DocumentNumber,
      Description = $"Inventory purchase {invoice.DocumentNumber}",
      BranchId = invoice.BranchId,
      Status = JournalEntryStatus.Posted,
      Type = JournalEntryType.Standard,
      PostedAtUtc = postedAt,
      Lines =
      {
        new JournalLineEntity
        {
          AccountId = inventoryAccount.Id,
          Description = $"Inventory received on {invoice.DocumentNumber}",
          CurrencyId = invoice.CurrencyId,
          ExchangeRate = invoice.ExchangeRate,
          OriginalDebitAmount = invoice.Total,
          DebitBaseAmount = invoice.BaseTotal
        },
        new JournalLineEntity
        {
          AccountId = payableAccount.Id,
          Description = $"Payable to supplier on {invoice.DocumentNumber}",
          CurrencyId = invoice.CurrencyId,
          ExchangeRate = invoice.ExchangeRate,
          OriginalCreditAmount = invoice.Total,
          CreditBaseAmount = invoice.BaseTotal
        }
      }
    };

    invoice.JournalEntry = journal;
    _db.JournalEntries.Add(journal);
    foreach (var line in invoice.Lines)
    {
      var movement = new StockMovementEntity
      {
        ProductId = line.ProductId,
        WarehouseId = invoice.WarehouseId,
        Type = StockMovementType.Purchase,
        MovementDate = invoice.InvoiceDate,
        QuantityIn = line.BaseQuantity,
        QuantityOut = 0,
        UnitCostBase = line.BaseUnitCost,
        Reference = invoice.DocumentNumber,
        Note = invoice.Notes,
        PurchaseInvoiceId = invoice.Id,
        PurchaseInvoiceLineId = line.Id,
        PerformedByUserId = userId
      };
      invoice.Movements.Add(movement);
      _db.StockMovements.Add(movement);
    }

    invoice.Status = PurchaseInvoiceStatus.Posted;
    invoice.PostedAtUtc = postedAt;
    invoice.UpdatedAtUtc = postedAt;

    await SaveDraftMutationAsync(ct);

    return await GetByIdAsync(id, ct);
  }

  private async Task<PurchaseValidation> ValidateAsync(
    PurchaseInvoiceDraftRequest request,
    CancellationToken ct,
    bool validateUnits = true)
  {
    if (request.Lines.Count == 0)
      throw new BadRequestException(ErrorCodes.Purchase.LinesRequired, "Add at least one purchase line.");
    if (request.Lines.Any(line => line.ProductId == Guid.Empty || line.UnitOfMeasureId == Guid.Empty))
      throw new BadRequestException(ErrorCodes.Purchase.ProductInvalid, "Select a product and unit for every line.");
    if (request.Lines.Select(line => line.ProductId).Distinct().Count() != request.Lines.Count)
      throw new BadRequestException(ErrorCodes.Purchase.DuplicateProduct, "A product can appear only once in a purchase invoice.");
    if (request.Lines.Any(line => line.Quantity <= 0))
      throw new BadRequestException(ErrorCodes.Purchase.QuantityInvalid, "Purchase quantities must be greater than zero.");
    if (request.Lines.Any(line => line.UnitCost < 0))
      throw new BadRequestException(ErrorCodes.Purchase.UnitCostInvalid, "Purchase unit costs cannot be negative.");

    var supplierIsValid = await _db.Contacts.AsNoTracking()
      .AnyAsync(contact => contact.Id == request.SupplierId && contact.IsActive && contact.IsSupplier, ct);
    if (!supplierIsValid)
      throw new BadRequestException(ErrorCodes.Purchase.SupplierInvalid, "Select an active supplier contact.");

    var branchIsValid = await _db.Branches.AsNoTracking()
      .AnyAsync(branch => branch.Id == request.BranchId && branch.IsActive, ct);
    if (!branchIsValid)
      throw new BadRequestException(ErrorCodes.Purchase.BranchInvalid, "Select an active branch.");

    var warehouse = await _db.Warehouses.AsNoTracking()
      .SingleOrDefaultAsync(item => item.Id == request.WarehouseId && item.IsActive, ct)
      ?? throw new BadRequestException(ErrorCodes.Purchase.WarehouseInvalid, "Select an active warehouse.");
    if (warehouse.BranchId != request.BranchId)
      throw new BadRequestException(ErrorCodes.Purchase.WarehouseBranchMismatch, "The selected warehouse does not belong to the purchase branch.");

    var currencyIsValid = await _db.Currencies.AsNoTracking()
      .AnyAsync(currency => currency.Id == request.CurrencyId && currency.IsActive, ct);
    if (!currencyIsValid)
      throw new BadRequestException(ErrorCodes.Purchase.CurrencyInvalid, "Select an active currency.");

    var business = await _db.Businesses.AsNoTracking()
      .SingleOrDefaultAsync(item => item.IsActive && item.IsSetupCompleted, ct)
      ?? throw new BadRequestException(ErrorCodes.Purchase.BusinessNotConfigured, "Complete Business Setup before recording purchases.");

    var exchangeRate = request.CurrencyId == business.BaseCurrencyId
      ? 1m
      : request.ExchangeRate ?? await ExchangeRateResolver.FindAsync(
        _db,
        request.CurrencyId,
        business.BaseCurrencyId,
        request.InvoiceDate,
        ct);
    if (exchangeRate is null || exchangeRate <= 0)
      throw new BadRequestException(ErrorCodes.Purchase.ExchangeRateRequired, "Enter a positive exchange rate for a foreign-currency purchase.");

    var productIds = request.Lines.Select(line => line.ProductId).ToList();
    var products = await _db.Products.AsNoTracking()
      .Include(product => product.UnitOfMeasure)
      .Include(product => product.UnitConversions).ThenInclude(item => item.UnitOfMeasure)
      .Where(product => productIds.Contains(product.Id) && product.IsActive && product.TrackInventory)
      .ToDictionaryAsync(product => product.Id, ct);
    if (products.Count != productIds.Count)
      throw new BadRequestException(ErrorCodes.Purchase.ProductInvalid, "Every line must use an active inventory-tracked product.");

    var productUnits = new Dictionary<Guid, ProductUnitSelection>();
    if (validateUnits)
    {
      foreach (var line in request.Lines)
      {
        var selection = UnitConversionCalculator.Resolve(
          products[line.ProductId],
          line.UnitOfMeasureId);
        if (selection is null || !selection.Value.IsActive || !selection.Value.IsValid)
          throw new BadRequestException(
            ErrorCodes.Purchase.UnitInvalid,
            "Each purchase line must use an active base unit or configured conversion unit.");

        var baseQuantity = Quantity(UnitConversionCalculator.ConvertToBaseQuantity(
          line.Quantity,
          selection.Value.Operation,
          selection.Value.Factor));
        if (baseQuantity <= 0)
          throw new BadRequestException(
            ErrorCodes.Purchase.QuantityInvalid,
            "The selected quantity is too small for the product's base-unit precision.");

        productUnits.Add(line.ProductId, selection.Value);
      }
    }

    return new PurchaseValidation(
      business.BaseCurrencyId,
      exchangeRate.Value,
      products,
      productUnits);
  }

  private static void Apply(
    PurchaseInvoiceEntity invoice,
    PurchaseInvoiceDraftRequest request,
    Guid baseCurrencyId,
    decimal exchangeRate)
  {
    invoice.SupplierId = request.SupplierId;
    invoice.InvoiceDate = request.InvoiceDate;
    invoice.SupplierReference = Trim(request.SupplierReference);
    invoice.BranchId = request.BranchId;
    invoice.WarehouseId = request.WarehouseId;
    invoice.CurrencyId = request.CurrencyId;
    invoice.BaseCurrencyId = baseCurrencyId;
    invoice.ExchangeRate = exchangeRate;
    invoice.Notes = Trim(request.Notes);
  }

  private void ReplaceLines(
    PurchaseInvoiceEntity invoice,
    List<PurchaseInvoiceLineRequest> requests,
    PurchaseValidation validation)
  {
    foreach (var existing in invoice.Lines.ToList()) _db.PurchaseInvoiceLines.Remove(existing);
    invoice.Lines.Clear();
    foreach (var request in requests)
    {
      var selection = validation.ProductUnits[request.ProductId];
      var product = validation.Products[request.ProductId];
      var baseUnitCost = request.UseMasterPrice
        ? Price(product.PurchasePriceBase)
        : Price(UnitConversionCalculator.ConvertUnitPriceToBasePrice(
          request.UnitCost,
          selection.Operation,
          selection.Factor) * invoice.ExchangeRate);
      var unitCost = request.UseMasterPrice
        ? Price(UnitConversionCalculator.ConvertBasePriceToUnitPrice(
          baseUnitCost,
          selection.Operation,
          selection.Factor) / invoice.ExchangeRate)
        : Price(request.UnitCost);
      var line = new PurchaseInvoiceLineEntity
      {
        ProductId = request.ProductId,
        UnitOfMeasureId = request.UnitOfMeasureId,
        Quantity = request.Quantity,
        ConversionOperation = selection.Operation,
        ConversionFactor = selection.Factor,
        BaseQuantity = Quantity(UnitConversionCalculator.ConvertToBaseQuantity(
          request.Quantity,
          selection.Operation,
          selection.Factor)),
        UnitCost = unitCost,
        BaseUnitCost = baseUnitCost,
        IsPriceOverridden = !request.UseMasterPrice
      };
      invoice.Lines.Add(line);
      _db.PurchaseInvoiceLines.Add(line);
    }
  }

  private static void Recalculate(PurchaseInvoiceEntity invoice)
  {
    foreach (var line in invoice.Lines)
    {
      line.LineSubtotal = Money(line.Quantity * line.UnitCost);
      line.LineAmount = line.LineSubtotal;
      line.BaseLineAmount = Money(line.BaseQuantity * line.BaseUnitCost);
    }

    invoice.Subtotal = invoice.Lines.Sum(line => line.LineSubtotal);
    invoice.Total = invoice.Lines.Sum(line => line.LineAmount);
    invoice.BaseTotal = invoice.Lines.Sum(line => line.BaseLineAmount);
  }

  private static AccountEntity GetPostingAccount(
    IReadOnlyDictionary<string, AccountEntity> accounts,
    string code,
    AccountClassification classification,
    string purpose)
  {
    if (!accounts.TryGetValue(code, out var account) || !account.IsActive || account.IsGroup || account.Classification != classification)
      throw new BadRequestException(ErrorCodes.Purchase.AccountMappingInvalid, $"Configure an active posting account for {purpose}.");
    return account;
  }

  private async Task<string> NextDocumentNumberAsync(CancellationToken ct)
  {
    var last = await _db.PurchaseInvoices.Select(invoice => invoice.DocumentNumber)
      .OrderByDescending(number => number)
      .FirstOrDefaultAsync(ct);
    var next = 1;
    if (last is not null && last.StartsWith("PI-") && int.TryParse(last[3..], out var current)) next = current + 1;
    return $"PI-{next:000000}";
  }

  private async Task SaveDraftAsync(CancellationToken ct)
  {
    try
    {
      await _db.SaveChangesAsync(ct);
    }
    catch (DbUpdateException)
    {
      throw new ConflictException(ErrorCodes.Purchase.DocumentNumberConflict, "Could not allocate a unique purchase invoice number. Try again.");
    }
  }

  private async Task SaveDraftMutationAsync(CancellationToken ct)
  {
    try
    {
      await _db.SaveChangesAsync(ct);
    }
    catch (DbUpdateConcurrencyException)
    {
      throw new ConflictException(ErrorCodes.Purchase.DocumentNotDraft, "This purchase invoice is no longer a draft.");
    }
  }

  private IQueryable<PurchaseInvoiceEntity> InvoiceQuery() => _db.PurchaseInvoices
    .AsNoTracking()
    .Include(invoice => invoice.Supplier)
    .Include(invoice => invoice.Branch)
    .Include(invoice => invoice.Warehouse)
    .Include(invoice => invoice.Currency)
    .Include(invoice => invoice.BaseCurrency)
    .Include(invoice => invoice.CreatedByUser)
    .Include(invoice => invoice.Movements)
    .Include(invoice => invoice.Lines).ThenInclude(line => line.Product)
    .Include(invoice => invoice.Lines).ThenInclude(line => line.UnitOfMeasure);

  private static PurchaseInvoiceResponse ToResponse(PurchaseInvoiceEntity invoice) => new(
    invoice.Id,
    invoice.DocumentNumber,
    invoice.SupplierId,
    invoice.Supplier.Name,
    invoice.InvoiceDate,
    invoice.SupplierReference,
    invoice.BranchId,
    invoice.Branch.Code,
    invoice.Branch.Name,
    invoice.WarehouseId,
    invoice.Warehouse.Code,
    invoice.Warehouse.Name,
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
    invoice.Movements.OrderBy(movement => movement.Id).Select(movement => movement.Id).ToList(),
    invoice.Lines.OrderBy(line => line.Product.SKU).ThenBy(line => line.Id).Select(line => new PurchaseInvoiceLineResponse(
      line.Id,
      line.ProductId,
      line.Product.Name,
      line.Product.SKU,
      line.UnitOfMeasureId,
      line.UnitOfMeasure.Code,
      line.Quantity,
      line.ConversionOperation,
      line.ConversionFactor,
      line.BaseQuantity,
      line.UnitCost,
      line.BaseUnitCost,
      line.IsPriceOverridden,
      line.LineSubtotal,
      line.LineAmount,
      line.BaseLineAmount)).ToList());

  private static decimal Money(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);
  private static decimal Price(decimal value) => decimal.Round(value, 6, MidpointRounding.AwayFromZero);
  private static decimal Quantity(decimal value) => decimal.Round(value, 4, MidpointRounding.AwayFromZero);

  private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private sealed record PurchaseValidation(
    Guid BaseCurrencyId,
    decimal ExchangeRate,
    IReadOnlyDictionary<Guid, ProductEntity> Products,
    IReadOnlyDictionary<Guid, ProductUnitSelection> ProductUnits);

  private static void EnsureDraft(PurchaseInvoiceStatus status)
  {
    if (status != PurchaseInvoiceStatus.Draft)
      throw new ConflictException(ErrorCodes.Purchase.DocumentNotDraft, "Posted purchase invoices are immutable.");
  }

  private static NotFoundException NotFound() => new(
    ErrorCodes.Purchase.NotFound,
    "Purchase invoice not found.");
}
