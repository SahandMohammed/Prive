using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Inventory;

public sealed class InventoryService
{
  private readonly AppDbContext _db;

  public InventoryService(AppDbContext db)
  {
    _db = db;
  }

  // ===========================================================================
  // Categories
  // ===========================================================================

  public async Task<PagedResult<CategoryResponse>> GetCategoriesAsync(
    MasterListQuery query,
    CancellationToken ct)
  {
    return await Filter(_db.ProductCategories.AsNoTracking(), query)
      .OrderBy(x => x.Name)
      .Select(x => new CategoryResponse(
        x.Id,
        x.Name,
        x.IsActive))
      .ToPagedResultAsync(query, ct);
  }

  public async Task<CategoryResponse> CreateCategoryAsync(
    CreateCategoryRequest request,
    CancellationToken ct)
  {
    var name = request.Name.Trim();

    if (await _db.ProductCategories.AnyAsync(
      x => x.Name == name,
      ct))
    {
      throw new ConflictException(
        ErrorCodes.Inventory.CategoryNameTaken,
        "That category name is already in use.");
    }

    var category = new ProductCategoryEntity
    {
      Name = name,
      IsActive = request.IsActive
    };

    _db.ProductCategories.Add(category);

    await _db.SaveChangesAsync(ct);

    return new CategoryResponse(
      category.Id,
      category.Name,
      category.IsActive);
  }

  public async Task<CategoryResponse> UpdateCategoryAsync(
    Guid id,
    UpdateCategoryRequest request,
    CancellationToken ct)
  {
    var category = await GetCategoryEntity(id, ct);
    var name = request.Name.Trim();

    if (name != category.Name &&
        await _db.ProductCategories.AnyAsync(
          x => x.Name == name && x.Id != id,
          ct))
    {
      throw new ConflictException(
        ErrorCodes.Inventory.CategoryNameTaken,
        "That category name is already in use.");
    }

    category.Name = name;
    category.IsActive = request.IsActive;

    await _db.SaveChangesAsync(ct);

    return new CategoryResponse(
      category.Id,
      category.Name,
      category.IsActive);
  }

  public async Task DeleteCategoryAsync(
    Guid id,
    CancellationToken ct)
  {
    var category = await GetCategoryEntity(id, ct);

    if (await _db.Products.AnyAsync(
      x => x.CategoryId == id,
      ct))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.CategoryInUse,
        "A category assigned to products cannot be deleted.");
    }

    _db.ProductCategories.Remove(category);

    await _db.SaveChangesAsync(ct);
  }

  // ===========================================================================
  // Units
  // ===========================================================================

  public async Task<PagedResult<UnitResponse>> GetUnitsAsync(
    MasterListQuery query,
    CancellationToken ct)
  {
    return await Filter(_db.UnitsOfMeasure.AsNoTracking(), query)
      .OrderBy(x => x.Code)
      .Select(x => new UnitResponse(
        x.Id,
        x.Name,
        x.Code,
        x.IsActive))
      .ToPagedResultAsync(query, ct);
  }

  public async Task<UnitResponse> CreateUnitAsync(
    CreateUnitRequest request,
    CancellationToken ct)
  {
    var code = Code(request.Code);

    if (await _db.UnitsOfMeasure.AnyAsync(
      x => x.Code == code,
      ct))
    {
      throw new ConflictException(
        ErrorCodes.Inventory.UnitCodeTaken,
        "That unit code is already in use.");
    }

    var unit = new UnitOfMeasureEntity
    {
      Name = request.Name.Trim(),
      Code = code,
      IsActive = request.IsActive
    };

    _db.UnitsOfMeasure.Add(unit);

    await _db.SaveChangesAsync(ct);

    return new UnitResponse(
      unit.Id,
      unit.Name,
      unit.Code,
      unit.IsActive);
  }

  public async Task<UnitResponse> UpdateUnitAsync(
    Guid id,
    UpdateUnitRequest request,
    CancellationToken ct)
  {
    var unit = await GetUnitEntity(id, ct);
    var code = Code(request.Code);

    if (code != unit.Code &&
        await _db.UnitsOfMeasure.AnyAsync(
          x => x.Code == code && x.Id != id,
          ct))
    {
      throw new ConflictException(
        ErrorCodes.Inventory.UnitCodeTaken,
        "That unit code is already in use.");
    }

    unit.Name = request.Name.Trim();
    unit.Code = code;
    unit.IsActive = request.IsActive;

    await _db.SaveChangesAsync(ct);

    return new UnitResponse(
      unit.Id,
      unit.Name,
      unit.Code,
      unit.IsActive);
  }

  public async Task DeleteUnitAsync(
    Guid id,
    CancellationToken ct)
  {
    var unit = await GetUnitEntity(id, ct);

    if (await _db.Products.AnyAsync(
      x => x.UnitOfMeasureId == id,
      ct))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.UnitInUse,
        "A unit assigned to products cannot be deleted.");
    }

    _db.UnitsOfMeasure.Remove(unit);

    await _db.SaveChangesAsync(ct);
  }

  // ===========================================================================
  // Products
  // ===========================================================================

  public async Task<PagedResult<ProductResponse>> GetProductsAsync(
    ProductListQuery query,
    CancellationToken ct)
  {
    var productsQuery = _db.Products
      .AsNoTracking()
      .Include(x => x.Category)
      .Include(x => x.UnitOfMeasure)
      .AsQueryable();

    if (!string.IsNullOrWhiteSpace(query.Search))
    {
      var search = query.Search.Trim().ToLower();

      productsQuery = productsQuery.Where(x =>
        x.Name.ToLower().Contains(search) ||
        x.SKU.ToLower().Contains(search) ||
        (x.Barcode != null &&
         x.Barcode.ToLower().Contains(search)));
    }

    if (query.IsActive is not null)
    {
      productsQuery = productsQuery.Where(
        x => x.IsActive == query.IsActive);
    }

    if (query.CategoryId is not null)
    {
      productsQuery = productsQuery.Where(
        x => x.CategoryId == query.CategoryId);
    }

    if (query.Purpose is not null)
    {
      productsQuery = productsQuery.Where(
        x => x.Purpose == query.Purpose);
    }

    var normalized = query.Normalize();

    var count = await productsQuery.CountAsync(ct);

    var products = await productsQuery
      .OrderBy(x => x.Name)
      .Skip((normalized.Page - 1) * normalized.PageSize)
      .Take(normalized.PageSize)
      .ToListAsync(ct);

    var balances = await GetProductBalancesAsync(
      products.Select(x => x.Id),
      null,
      ct);

    var items = products
      .Select(x => ToProduct(
        x,
        balances.GetValueOrDefault(x.Id)))
      .ToList();

    return new PagedResult<ProductResponse>(
      items,
      count,
      normalized.Page,
      normalized.PageSize);
  }

  public async Task<ProductResponse> CreateProductAsync(
    CreateProductRequest request,
    CancellationToken ct)
  {
    await ValidateProductReferences(
      request.CategoryId,
      request.UnitOfMeasureId,
      ct);

    await EnsureProductCodes(
      null,
      request.SKU,
      request.Barcode,
      ct);

    var product = new ProductEntity();

    Apply(product, request);

    _db.Products.Add(product);

    await _db.SaveChangesAsync(ct);

    await _db.Entry(product)
      .Reference(x => x.Category)
      .LoadAsync(ct);

    await _db.Entry(product)
      .Reference(x => x.UnitOfMeasure)
      .LoadAsync(ct);

    return ToProduct(product, default);
  }

  public async Task<ProductResponse> UpdateProductAsync(
    Guid id,
    UpdateProductRequest request,
    CancellationToken ct)
  {
    var product = await _db.Products
      .Include(x => x.Category)
      .Include(x => x.UnitOfMeasure)
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Inventory.ProductNotFound,
        "Product not found.");

    await ValidateProductReferences(
      request.CategoryId,
      request.UnitOfMeasureId,
      ct);

    await EnsureProductCodes(
      id,
      request.SKU,
      request.Barcode,
      ct);

    Apply(product, request);

    await _db.SaveChangesAsync(ct);

    await _db.Entry(product)
      .Reference(x => x.Category)
      .LoadAsync(ct);

    await _db.Entry(product)
      .Reference(x => x.UnitOfMeasure)
      .LoadAsync(ct);

    var balances = await GetProductBalancesAsync(
      [id],
      null,
      ct);

    return ToProduct(
      product,
      balances.GetValueOrDefault(id));
  }

  public async Task DeleteProductAsync(
    Guid id,
    CancellationToken ct)
  {
    var product = await _db.Products
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Inventory.ProductNotFound,
        "Product not found.");

    if (await _db.StockMovements.AnyAsync(
      x => x.ProductId == id,
      ct))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.ProductHasHistory,
        "A product with stock history cannot be deleted. Deactivate it instead.");
    }

    _db.Products.Remove(product);

    await _db.SaveChangesAsync(ct);
  }

  // ===========================================================================
  // Warehouses
  // ===========================================================================

  public async Task<PagedResult<WarehouseResponse>> GetWarehousesAsync(
    WarehouseListQuery query,
    CancellationToken ct)
  {
    var warehousesQuery = _db.Warehouses
      .AsNoTracking()
      .Include(x => x.Branch)
      .AsQueryable();

    if (!string.IsNullOrWhiteSpace(query.Search))
    {
      var search = query.Search.Trim().ToLower();

      warehousesQuery = warehousesQuery.Where(x =>
        x.Code.ToLower().Contains(search) ||
        x.Name.ToLower().Contains(search));
    }

    if (query.IsActive is not null)
    {
      warehousesQuery = warehousesQuery.Where(
        x => x.IsActive == query.IsActive);
    }

    if (query.BranchId is not null)
    {
      warehousesQuery = warehousesQuery.Where(
        x => x.BranchId == query.BranchId);
    }

    return await warehousesQuery
      .OrderBy(x => x.Code)
      .Select(x => ToWarehouse(x))
      .ToPagedResultAsync(query, ct);
  }

  public async Task<WarehouseResponse> CreateWarehouseAsync(
    CreateWarehouseRequest request,
    CancellationToken ct)
  {
    await ValidateBranch(request.BranchId, ct);

    var code = Code(request.Code);

    if (await _db.Warehouses.AnyAsync(
      x => x.Code == code,
      ct))
    {
      throw new ConflictException(
        ErrorCodes.Inventory.WarehouseCodeTaken,
        "That warehouse code is already in use.");
    }

    var warehouse = new WarehouseEntity
    {
      Code = code,
      Name = request.Name.Trim(),
      BranchId = request.BranchId,
      IsActive = request.IsActive
    };

    _db.Warehouses.Add(warehouse);

    await _db.SaveChangesAsync(ct);

    await _db.Entry(warehouse)
      .Reference(x => x.Branch)
      .LoadAsync(ct);

    return ToWarehouse(warehouse);
  }

  public async Task<WarehouseResponse> UpdateWarehouseAsync(
    Guid id,
    UpdateWarehouseRequest request,
    CancellationToken ct)
  {
    var warehouse = await _db.Warehouses
      .Include(x => x.Branch)
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Inventory.WarehouseNotFound,
        "Warehouse not found.");

    await ValidateBranch(request.BranchId, ct);

    var code = Code(request.Code);

    if (code != warehouse.Code &&
        await _db.Warehouses.AnyAsync(
          x => x.Code == code && x.Id != id,
          ct))
    {
      throw new ConflictException(
        ErrorCodes.Inventory.WarehouseCodeTaken,
        "That warehouse code is already in use.");
    }

    if (!request.IsActive &&
        await QuantityAsync(id, null, ct) != 0)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.WarehouseHasStock,
        "Move or adjust stock out before deactivating a warehouse.");
    }

    warehouse.Code = code;
    warehouse.Name = request.Name.Trim();
    warehouse.BranchId = request.BranchId;
    warehouse.IsActive = request.IsActive;

    await _db.SaveChangesAsync(ct);

    await _db.Entry(warehouse)
      .Reference(x => x.Branch)
      .LoadAsync(ct);

    return ToWarehouse(warehouse);
  }

  public async Task DeleteWarehouseAsync(
    Guid id,
    CancellationToken ct)
  {
    var warehouse = await _db.Warehouses
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Inventory.WarehouseNotFound,
        "Warehouse not found.");

    if (await _db.StockMovements.AnyAsync(
      x => x.WarehouseId == id,
      ct))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.WarehouseHasHistory,
        "A warehouse with stock history cannot be deleted. Deactivate it instead.");
    }

    _db.Warehouses.Remove(warehouse);

    await _db.SaveChangesAsync(ct);
  }

  // ===========================================================================
  // Opening Stock
  // ===========================================================================

  public async Task<PagedResult<OpeningStockListResponse>> GetOpeningStocksAsync(
    OpeningStockListQuery query,
    CancellationToken ct)
  {
    var documentsQuery = FilterDocuments(
      _db.OpeningStockDocuments.AsNoTracking(),
      query);

    if (query.WarehouseId is not null)
    {
      documentsQuery = documentsQuery.Where(
        x => x.WarehouseId == query.WarehouseId);
    }

    return await documentsQuery
      .OrderByDescending(x => x.DocumentDate)
      .ThenByDescending(x => x.DocumentNumber)
      .Select(x => new OpeningStockListResponse(
        x.Id,
        x.DocumentNumber,
        x.DocumentDate,
        x.BranchId,
        x.Branch.Name,
        x.WarehouseId,
        x.Warehouse.Name,
        x.Lines.Count,
        x.Lines.Sum(line => line.Quantity * line.UnitCostBase),
        x.Status,
        x.CreatedByUserId,
        x.CreatedByUser.Username,
        x.CreatedAtUtc,
        x.UpdatedAtUtc,
        x.PostedAtUtc))
      .ToPagedResultAsync(query, ct);
  }

  public async Task<OpeningStockResponse> GetOpeningStockAsync(
    Guid id,
    CancellationToken ct)
  {
    var document = await OpeningStockQuery()
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    return ToOpeningStock(document);
  }

  public async Task<OpeningStockResponse> CreateOpeningStockAsync(
    OpeningStockDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    await ValidateSingleWarehouseDocumentAsync(
      request.BranchId,
      request.WarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    ValidateLines(
      request.Lines.Select(x => x.ProductId));

    ValidateOpeningLines(
      request.Lines.Select(x => (
        x.Quantity,
        x.UnitCostBase)));

    var document = new OpeningStockDocumentEntity
    {
      DocumentNumber = await NextDocumentNumberAsync(
        _db.OpeningStockDocuments.Select(x => x.DocumentNumber),
        "OS",
        ct),
      DocumentDate = request.DocumentDate,
      BranchId = request.BranchId,
      WarehouseId = request.WarehouseId,
      Notes = Trim(request.Notes),
      CreatedByUserId = userId
    };

    foreach (var line in request.Lines)
    {
      document.Lines.Add(new OpeningStockLineEntity
      {
        ProductId = line.ProductId,
        Quantity = line.Quantity,
        UnitCostBase = line.UnitCostBase
      });
    }

    _db.OpeningStockDocuments.Add(document);

    await SaveDocumentAsync(ct);

    return await GetOpeningStockAsync(document.Id, ct);
  }

  public async Task<OpeningStockResponse> UpdateOpeningStockAsync(
    Guid id,
    OpeningStockDraftRequest request,
    CancellationToken ct)
  {
    var document = await _db.OpeningStockDocuments
      .Include(x => x.Lines)
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    await ValidateSingleWarehouseDocumentAsync(
      request.BranchId,
      request.WarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    ValidateLines(
      request.Lines.Select(x => x.ProductId));

    ValidateOpeningLines(
      request.Lines.Select(x => (
        x.Quantity,
        x.UnitCostBase)));

    document.DocumentDate = request.DocumentDate;
    document.BranchId = request.BranchId;
    document.WarehouseId = request.WarehouseId;
    document.Notes = Trim(request.Notes);
    document.UpdatedAtUtc = DateTime.UtcNow;

    foreach (var line in document.Lines.ToList())
    {
      var update = request.Lines.SingleOrDefault(
        x => x.ProductId == line.ProductId);

      if (update is null)
      {
        _db.OpeningStockLines.Remove(line);
        continue;
      }

      line.Quantity = update.Quantity;
      line.UnitCostBase = update.UnitCostBase;
    }

    foreach (var line in request.Lines.Where(
      x => document.Lines.All(
        y => y.ProductId != x.ProductId)))
    {
      document.Lines.Add(new OpeningStockLineEntity
      {
        ProductId = line.ProductId,
        Quantity = line.Quantity,
        UnitCostBase = line.UnitCostBase
      });
    }

    await _db.SaveChangesAsync(ct);

    return await GetOpeningStockAsync(id, ct);
  }

  public async Task DeleteOpeningStockAsync(
    Guid id,
    CancellationToken ct)
  {
    var document = await _db.OpeningStockDocuments
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    _db.OpeningStockDocuments.Remove(document);

    await _db.SaveChangesAsync(ct);
  }

  public async Task<OpeningStockResponse> PostOpeningStockAsync(
    Guid id,
    Guid userId,
    CancellationToken ct)
  {
    var document = await _db.OpeningStockDocuments
      .Include(x => x.Lines)
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    ValidateLines(
      document.Lines.Select(x => x.ProductId));

    ValidateOpeningLines(
      document.Lines.Select(x => (
        x.Quantity,
        x.UnitCostBase)));

    await ValidateSingleWarehouseDocumentAsync(
      document.BranchId,
      document.WarehouseId,
      document.Lines.Select(x => x.ProductId),
      ct);

    foreach (var line in document.Lines)
    {
      AddOpeningMovement(
        document,
        line,
        userId);
    }

    document.Status = InventoryDocumentStatus.Posted;
    document.PostedAtUtc = DateTime.UtcNow;
    document.UpdatedAtUtc = document.PostedAtUtc.Value;

    await _db.SaveChangesAsync(ct);

    return await GetOpeningStockAsync(id, ct);
  }

  // ===========================================================================
  // Stock Adjustments
  // ===========================================================================

  public async Task<PagedResult<StockAdjustmentListResponse>> GetAdjustmentsAsync(
    StockAdjustmentListQuery query,
    CancellationToken ct)
  {
    var documentsQuery = FilterDocuments(
      _db.StockAdjustmentDocuments.AsNoTracking(),
      query);

    if (query.WarehouseId is not null)
    {
      documentsQuery = documentsQuery.Where(
        x => x.WarehouseId == query.WarehouseId);
    }

    return await documentsQuery
      .OrderByDescending(x => x.DocumentDate)
      .ThenByDescending(x => x.DocumentNumber)
      .Select(x => new StockAdjustmentListResponse(
        x.Id,
        x.DocumentNumber,
        x.DocumentDate,
        x.BranchId,
        x.Branch.Name,
        x.WarehouseId,
        x.Warehouse.Name,
        x.Reason,
        x.Lines.Count,
        x.Status,
        x.CreatedByUserId,
        x.CreatedByUser.Username,
        x.CreatedAtUtc,
        x.UpdatedAtUtc,
        x.PostedAtUtc))
      .ToPagedResultAsync(query, ct);
  }

  public async Task<StockAdjustmentResponse> GetAdjustmentAsync(
    Guid id,
    CancellationToken ct)
  {
    var document = await AdjustmentQuery()
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    IReadOnlyDictionary<Guid, decimal>? currentQuantities = null;

    if (document.Status == InventoryDocumentStatus.Draft)
    {
      currentQuantities = await GetQuantitiesAsync(
        document.WarehouseId,
        document.Lines.Select(x => x.ProductId),
        ct);
    }

    return ToAdjustment(
      document,
      currentQuantities);
  }

  public async Task<StockAdjustmentResponse> CreateAdjustmentAsync(
    StockAdjustmentDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    ValidateReason(request.Reason);

    ValidateLines(
      request.Lines.Select(x => x.ProductId));

    ValidateActualQuantities(
      request.Lines.Select(x => x.ActualQuantity));

    await ValidateSingleWarehouseDocumentAsync(
      request.BranchId,
      request.WarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    var quantities = await GetQuantitiesAsync(
      request.WarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    var document = new StockAdjustmentDocumentEntity
    {
      DocumentNumber = await NextDocumentNumberAsync(
        _db.StockAdjustmentDocuments.Select(
          x => x.DocumentNumber),
        "ADJ",
        ct),
      DocumentDate = request.DocumentDate,
      BranchId = request.BranchId,
      WarehouseId = request.WarehouseId,
      Reason = request.Reason.Trim(),
      Notes = Trim(request.Notes),
      CreatedByUserId = userId
    };

    foreach (var line in request.Lines)
    {
      document.Lines.Add(new StockAdjustmentLineEntity
      {
        ProductId = line.ProductId,
        SystemQuantity = quantities.GetValueOrDefault(
          line.ProductId),
        ActualQuantity = line.ActualQuantity
      });
    }

    _db.StockAdjustmentDocuments.Add(document);

    await SaveDocumentAsync(ct);

    return await GetAdjustmentAsync(document.Id, ct);
  }

  public async Task<StockAdjustmentResponse> UpdateAdjustmentAsync(
    Guid id,
    StockAdjustmentDraftRequest request,
    CancellationToken ct)
  {
    var document = await _db.StockAdjustmentDocuments
      .Include(x => x.Lines)
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    ValidateReason(request.Reason);

    ValidateLines(
      request.Lines.Select(x => x.ProductId));

    ValidateActualQuantities(
      request.Lines.Select(x => x.ActualQuantity));

    await ValidateSingleWarehouseDocumentAsync(
      request.BranchId,
      request.WarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    var quantities = await GetQuantitiesAsync(
      request.WarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    document.DocumentDate = request.DocumentDate;
    document.BranchId = request.BranchId;
    document.WarehouseId = request.WarehouseId;
    document.Reason = request.Reason.Trim();
    document.Notes = Trim(request.Notes);
    document.UpdatedAtUtc = DateTime.UtcNow;

    foreach (var line in document.Lines.ToList())
    {
      var update = request.Lines.SingleOrDefault(
        x => x.ProductId == line.ProductId);

      if (update is null)
      {
        _db.StockAdjustmentLines.Remove(line);
        continue;
      }

      line.SystemQuantity = quantities.GetValueOrDefault(
        line.ProductId);

      line.ActualQuantity = update.ActualQuantity;
    }

    foreach (var line in request.Lines.Where(
      x => document.Lines.All(
        y => y.ProductId != x.ProductId)))
    {
      document.Lines.Add(new StockAdjustmentLineEntity
      {
        ProductId = line.ProductId,
        SystemQuantity = quantities.GetValueOrDefault(
          line.ProductId),
        ActualQuantity = line.ActualQuantity
      });
    }

    await _db.SaveChangesAsync(ct);

    return await GetAdjustmentAsync(id, ct);
  }

  public async Task DeleteAdjustmentAsync(
    Guid id,
    CancellationToken ct)
  {
    var document = await _db.StockAdjustmentDocuments
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    _db.StockAdjustmentDocuments.Remove(document);

    await _db.SaveChangesAsync(ct);
  }

  public async Task<StockAdjustmentResponse> PostAdjustmentAsync(
    Guid id,
    Guid userId,
    CancellationToken ct)
  {
    var document = await _db.StockAdjustmentDocuments
      .Include(x => x.Lines)
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    ValidateReason(document.Reason);

    ValidateLines(
      document.Lines.Select(x => x.ProductId));

    ValidateActualQuantities(
      document.Lines.Select(x => x.ActualQuantity));

    await ValidateSingleWarehouseDocumentAsync(
      document.BranchId,
      document.WarehouseId,
      document.Lines.Select(x => x.ProductId),
      ct);

    var quantities = await GetQuantitiesAsync(
      document.WarehouseId,
      document.Lines.Select(x => x.ProductId),
      ct);

    var costs = new Dictionary<Guid, decimal>();

    foreach (var line in document.Lines)
    {
      line.SystemQuantity = quantities.GetValueOrDefault(
        line.ProductId);

      if (line.ActualQuantity < 0)
      {
        throw new BadRequestException(
          ErrorCodes.Inventory.InsufficientStock,
          "Actual quantity cannot be negative.");
      }

      var difference =
        line.ActualQuantity - line.SystemQuantity;

      if (difference != 0)
      {
        costs[line.ProductId] = await ValuationCostAsync(
          document.WarehouseId,
          line.ProductId,
          ct);
      }
    }

    foreach (var line in document.Lines)
    {
      var difference =
        line.ActualQuantity - line.SystemQuantity;

      if (difference == 0)
      {
        continue;
      }

      AddAdjustmentMovement(
        document,
        line,
        difference,
        costs[line.ProductId],
        userId);
    }

    document.Status = InventoryDocumentStatus.Posted;
    document.PostedAtUtc = DateTime.UtcNow;
    document.UpdatedAtUtc = document.PostedAtUtc.Value;

    await _db.SaveChangesAsync(ct);

    return await GetAdjustmentAsync(id, ct);
  }

  // ===========================================================================
  // Warehouse Transfers
  // ===========================================================================

  public async Task<PagedResult<WarehouseTransferListResponse>> GetTransfersAsync(
    WarehouseTransferListQuery query,
    CancellationToken ct)
  {
    var documentsQuery = FilterDocuments(
      _db.WarehouseTransferDocuments.AsNoTracking(),
      query);

    if (query.SourceWarehouseId is not null)
    {
      documentsQuery = documentsQuery.Where(
        x => x.SourceWarehouseId == query.SourceWarehouseId);
    }

    if (query.DestinationWarehouseId is not null)
    {
      documentsQuery = documentsQuery.Where(
        x => x.DestinationWarehouseId ==
             query.DestinationWarehouseId);
    }

    return await documentsQuery
      .OrderByDescending(x => x.DocumentDate)
      .ThenByDescending(x => x.DocumentNumber)
      .Select(x => new WarehouseTransferListResponse(
        x.Id,
        x.DocumentNumber,
        x.DocumentDate,
        x.BranchId,
        x.Branch.Name,
        x.SourceWarehouseId,
        x.SourceWarehouse.Name,
        x.DestinationWarehouseId,
        x.DestinationWarehouse.Name,
        x.Lines.Count,
        x.Status,
        x.CreatedByUserId,
        x.CreatedByUser.Username,
        x.CreatedAtUtc,
        x.UpdatedAtUtc,
        x.PostedAtUtc))
      .ToPagedResultAsync(query, ct);
  }

  public async Task<WarehouseTransferResponse> GetTransferAsync(
    Guid id,
    CancellationToken ct)
  {
    var document = await TransferQuery()
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    IReadOnlyDictionary<Guid, decimal>? available = null;

    if (document.Status == InventoryDocumentStatus.Draft)
    {
      available = await GetQuantitiesAsync(
        document.SourceWarehouseId,
        document.Lines.Select(x => x.ProductId),
        ct);
    }

    return ToTransfer(
      document,
      available);
  }

  public async Task<WarehouseTransferResponse> CreateTransferAsync(
    WarehouseTransferDraftRequest request,
    Guid userId,
    CancellationToken ct)
  {
    ValidateLines(
      request.Lines.Select(x => x.ProductId));

    ValidateTransferQuantities(
      request.Lines.Select(x => x.Quantity));

    await ValidateTransferHeaderAsync(
      request.BranchId,
      request.SourceWarehouseId,
      request.DestinationWarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    var quantities = await GetQuantitiesAsync(
      request.SourceWarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    var document = new WarehouseTransferDocumentEntity
    {
      DocumentNumber = await NextDocumentNumberAsync(
        _db.WarehouseTransferDocuments.Select(
          x => x.DocumentNumber),
        "TRF",
        ct),
      DocumentDate = request.DocumentDate,
      BranchId = request.BranchId,
      SourceWarehouseId = request.SourceWarehouseId,
      DestinationWarehouseId = request.DestinationWarehouseId,
      Notes = Trim(request.Notes),
      CreatedByUserId = userId
    };

    foreach (var line in request.Lines)
    {
      document.Lines.Add(new WarehouseTransferLineEntity
      {
        ProductId = line.ProductId,
        AvailableSourceQuantity = quantities.GetValueOrDefault(
          line.ProductId),
        Quantity = line.Quantity
      });
    }

    _db.WarehouseTransferDocuments.Add(document);

    await SaveDocumentAsync(ct);

    return await GetTransferAsync(document.Id, ct);
  }

  public async Task<WarehouseTransferResponse> UpdateTransferAsync(
    Guid id,
    WarehouseTransferDraftRequest request,
    CancellationToken ct)
  {
    var document = await _db.WarehouseTransferDocuments
      .Include(x => x.Lines)
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    ValidateLines(
      request.Lines.Select(x => x.ProductId));

    ValidateTransferQuantities(
      request.Lines.Select(x => x.Quantity));

    await ValidateTransferHeaderAsync(
      request.BranchId,
      request.SourceWarehouseId,
      request.DestinationWarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    var quantities = await GetQuantitiesAsync(
      request.SourceWarehouseId,
      request.Lines.Select(x => x.ProductId),
      ct);

    document.DocumentDate = request.DocumentDate;
    document.BranchId = request.BranchId;
    document.SourceWarehouseId = request.SourceWarehouseId;
    document.DestinationWarehouseId =
      request.DestinationWarehouseId;
    document.Notes = Trim(request.Notes);
    document.UpdatedAtUtc = DateTime.UtcNow;

    foreach (var line in document.Lines.ToList())
    {
      var update = request.Lines.SingleOrDefault(
        x => x.ProductId == line.ProductId);

      if (update is null)
      {
        _db.WarehouseTransferLines.Remove(line);
        continue;
      }

      line.AvailableSourceQuantity =
        quantities.GetValueOrDefault(line.ProductId);

      line.Quantity = update.Quantity;
    }

    foreach (var line in request.Lines.Where(
      x => document.Lines.All(
        y => y.ProductId != x.ProductId)))
    {
      document.Lines.Add(new WarehouseTransferLineEntity
      {
        ProductId = line.ProductId,
        AvailableSourceQuantity =
          quantities.GetValueOrDefault(line.ProductId),
        Quantity = line.Quantity
      });
    }

    await _db.SaveChangesAsync(ct);

    return await GetTransferAsync(id, ct);
  }

  public async Task DeleteTransferAsync(
    Guid id,
    CancellationToken ct)
  {
    var document = await _db.WarehouseTransferDocuments
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    _db.WarehouseTransferDocuments.Remove(document);

    await _db.SaveChangesAsync(ct);
  }

  public async Task<WarehouseTransferResponse> PostTransferAsync(
    Guid id,
    Guid userId,
    CancellationToken ct)
  {
    var document = await _db.WarehouseTransferDocuments
      .Include(x => x.Lines)
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw DocumentNotFound();

    EnsureDraft(document.Status);

    ValidateLines(
      document.Lines.Select(x => x.ProductId));

    ValidateTransferQuantities(
      document.Lines.Select(x => x.Quantity));

    await ValidateTransferHeaderAsync(
      document.BranchId,
      document.SourceWarehouseId,
      document.DestinationWarehouseId,
      document.Lines.Select(x => x.ProductId),
      ct);

    var quantities = await GetQuantitiesAsync(
      document.SourceWarehouseId,
      document.Lines.Select(x => x.ProductId),
      ct);

    var costs = new Dictionary<Guid, decimal>();

    foreach (var line in document.Lines)
    {
      line.AvailableSourceQuantity =
        quantities.GetValueOrDefault(line.ProductId);

      if (line.Quantity > line.AvailableSourceQuantity)
      {
        throw new BadRequestException(
          ErrorCodes.Inventory.InsufficientStock,
          "A transfer line exceeds current source stock.");
      }

      costs[line.ProductId] = await ValuationCostAsync(
        document.SourceWarehouseId,
        line.ProductId,
        ct);
    }

    foreach (var line in document.Lines)
    {
      AddTransferMovements(
        document,
        line,
        costs[line.ProductId],
        userId);
    }

    document.Status = InventoryDocumentStatus.Posted;
    document.PostedAtUtc = DateTime.UtcNow;
    document.UpdatedAtUtc = document.PostedAtUtc.Value;

    await _db.SaveChangesAsync(ct);

    return await GetTransferAsync(id, ct);
  }

  // ===========================================================================
  // Stock Balances
  // ===========================================================================

  public async Task<PagedResult<StockBalanceResponse>> GetBalancesAsync(
    StockBalanceListQuery query,
    CancellationToken ct)
  {
    var movementsQuery = _db.StockMovements
      .AsNoTracking()
      .Include(x => x.Product)
      .ThenInclude(x => x.Category)
      .Include(x => x.Product.UnitOfMeasure)
      .Include(x => x.Warehouse)
      .ThenInclude(x => x.Branch)
      .AsQueryable();

    if (query.ProductId is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.ProductId == query.ProductId);
    }

    if (query.WarehouseId is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.WarehouseId == query.WarehouseId);
    }

    if (query.BranchId is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.Warehouse.BranchId == query.BranchId);
    }

    if (query.CategoryId is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.Product.CategoryId == query.CategoryId);
    }

    if (!string.IsNullOrWhiteSpace(query.Search))
    {
      var search = query.Search.Trim().ToLower();

      movementsQuery = movementsQuery.Where(x =>
        x.Product.Name.ToLower().Contains(search) ||
        x.Product.SKU.ToLower().Contains(search));
    }

    var grouped = movementsQuery
      .GroupBy(x => new
      {
        x.ProductId,
        x.WarehouseId
      })
      .Select(group => new
      {
        group.Key.ProductId,
        group.Key.WarehouseId,
        Quantity = group.Sum(
          x => x.QuantityIn - x.QuantityOut),
        Value = group.Sum(
          x =>
            x.QuantityIn * x.UnitCostBase -
            x.QuantityOut * x.UnitCostBase)
      })
      .Where(x => x.Quantity != 0);

    var normalized = query.Normalize();

    var count = await grouped.CountAsync(ct);

    var rows = await grouped
      .OrderBy(x => x.ProductId)
      .Skip((normalized.Page - 1) * normalized.PageSize)
      .Take(normalized.PageSize)
      .ToListAsync(ct);

    var productIds = rows
      .Select(x => x.ProductId)
      .Distinct()
      .ToList();

    var warehouseIds = rows
      .Select(x => x.WarehouseId)
      .Distinct()
      .ToList();

    var products = await _db.Products
      .AsNoTracking()
      .Include(x => x.Category)
      .Include(x => x.UnitOfMeasure)
      .Where(x => productIds.Contains(x.Id))
      .ToDictionaryAsync(x => x.Id, ct);

    var warehouses = await _db.Warehouses
      .AsNoTracking()
      .Include(x => x.Branch)
      .Where(x => warehouseIds.Contains(x.Id))
      .ToDictionaryAsync(x => x.Id, ct);

    var items = rows
      .Select(row =>
      {
        var product = products[row.ProductId];
        var warehouse = warehouses[row.WarehouseId];

        return new StockBalanceResponse(
          row.ProductId,
          product.Name,
          product.SKU,
          product.Category.Name,
          product.UnitOfMeasure.Code,
          row.WarehouseId,
          warehouse.Code,
          warehouse.Name,
          warehouse.BranchId,
          warehouse.Branch.Name,
          row.Quantity,
          row.Quantity == 0
            ? 0
            : row.Value / row.Quantity,
          row.Value);
      })
      .ToList();

    return new PagedResult<StockBalanceResponse>(
      items,
      count,
      normalized.Page,
      normalized.PageSize);
  }

  // ===========================================================================
  // Stock Movements
  // ===========================================================================

  public async Task<PagedResult<StockMovementResponse>> GetMovementsAsync(
    StockMovementListQuery query,
    CancellationToken ct)
  {
    var movementsQuery = _db.StockMovements
      .AsNoTracking()
      .Include(x => x.Product)
      .ThenInclude(x => x.UnitOfMeasure)
      .Include(x => x.Warehouse)
      .ThenInclude(x => x.Branch)
      .Include(x => x.PerformedByUser)
      .Include(x => x.OpeningStockDocument)
      .Include(x => x.StockAdjustmentDocument)
      .Include(x => x.WarehouseTransferDocument)
      .AsQueryable();

    if (query.ProductId is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.ProductId == query.ProductId);
    }

    if (query.WarehouseId is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.WarehouseId == query.WarehouseId);
    }

    if (query.BranchId is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.Warehouse.BranchId == query.BranchId);
    }

    if (query.Type is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.Type == query.Type);
    }

    if (query.FromDate is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.MovementDate >= query.FromDate);
    }

    if (query.ToDate is not null)
    {
      movementsQuery = movementsQuery.Where(
        x => x.MovementDate <= query.ToDate);
    }

    if (query.DocumentType is InventoryDocumentType.OpeningStock)
    {
      movementsQuery = movementsQuery.Where(
        x => x.OpeningStockDocumentId != null);
    }

    if (query.DocumentType is InventoryDocumentType.Adjustment)
    {
      movementsQuery = movementsQuery.Where(
        x => x.StockAdjustmentDocumentId != null);
    }

    if (query.DocumentType is InventoryDocumentType.Transfer)
    {
      movementsQuery = movementsQuery.Where(
        x => x.WarehouseTransferDocumentId != null);
    }

    if (!string.IsNullOrWhiteSpace(query.DocumentNumber))
    {
      var documentNumber =
        query.DocumentNumber.Trim().ToLower();

      movementsQuery = movementsQuery.Where(x =>
        (x.OpeningStockDocument != null &&
         x.OpeningStockDocument.DocumentNumber
           .ToLower()
           .Contains(documentNumber)) ||
        (x.StockAdjustmentDocument != null &&
         x.StockAdjustmentDocument.DocumentNumber
           .ToLower()
           .Contains(documentNumber)) ||
        (x.WarehouseTransferDocument != null &&
         x.WarehouseTransferDocument.DocumentNumber
           .ToLower()
           .Contains(documentNumber)));
    }

    var normalized = query.Normalize();

    var count = await movementsQuery.CountAsync(ct);

    var rows = await movementsQuery
      .OrderByDescending(x => x.MovementDate)
      .ThenByDescending(x => x.CreatedAtUtc)
      .Skip((normalized.Page - 1) * normalized.PageSize)
      .Take(normalized.PageSize)
      .ToListAsync(ct);

    return new PagedResult<StockMovementResponse>(
      rows.Select(ToMovement).ToList(),
      count,
      normalized.Page,
      normalized.PageSize);
  }

  // ===========================================================================
  // Stock Movement Creation
  // ===========================================================================

  private void AddOpeningMovement(
    OpeningStockDocumentEntity document,
    OpeningStockLineEntity line,
    Guid userId)
  {
    var movement = new StockMovementEntity
    {
      ProductId = line.ProductId,
      WarehouseId = document.WarehouseId,
      MovementDate = document.DocumentDate,
      Type = StockMovementType.OpeningStock,
      QuantityIn = line.Quantity,
      UnitCostBase = line.UnitCostBase,
      Reference = document.DocumentNumber,
      Note = document.Notes,
      PerformedByUserId = userId,
      OpeningStockDocumentId = document.Id,
      OpeningStockLineId = line.Id
    };

    _db.StockMovements.Add(movement);
  }

  private void AddAdjustmentMovement(
    StockAdjustmentDocumentEntity document,
    StockAdjustmentLineEntity line,
    decimal difference,
    decimal cost,
    Guid userId)
  {
    var movement = new StockMovementEntity
    {
      ProductId = line.ProductId,
      WarehouseId = document.WarehouseId,
      MovementDate = document.DocumentDate,
      Type = difference > 0
        ? StockMovementType.PositiveAdjustment
        : StockMovementType.NegativeAdjustment,
      QuantityIn = Math.Max(difference, 0),
      QuantityOut = Math.Max(-difference, 0),
      UnitCostBase = cost,
      Reference = document.DocumentNumber,
      Note = document.Notes is null
        ? document.Reason
        : $"{document.Reason} — {document.Notes}",
      PerformedByUserId = userId,
      StockAdjustmentDocumentId = document.Id,
      StockAdjustmentLineId = line.Id
    };

    _db.StockMovements.Add(movement);
  }

  private void AddTransferMovements(
    WarehouseTransferDocumentEntity document,
    WarehouseTransferLineEntity line,
    decimal cost,
    Guid userId)
  {
    var transferOut = new StockMovementEntity
    {
      ProductId = line.ProductId,
      WarehouseId = document.SourceWarehouseId,
      MovementDate = document.DocumentDate,
      Type = StockMovementType.TransferOut,
      QuantityOut = line.Quantity,
      UnitCostBase = cost,
      Reference = document.DocumentNumber,
      Note = document.Notes,
      TransferId = document.Id,
      PerformedByUserId = userId,
      WarehouseTransferDocumentId = document.Id,
      WarehouseTransferLineId = line.Id
    };

    var transferIn = new StockMovementEntity
    {
      ProductId = line.ProductId,
      WarehouseId = document.DestinationWarehouseId,
      MovementDate = document.DocumentDate,
      Type = StockMovementType.TransferIn,
      QuantityIn = line.Quantity,
      UnitCostBase = cost,
      Reference = document.DocumentNumber,
      Note = document.Notes,
      TransferId = document.Id,
      PerformedByUserId = userId,
      WarehouseTransferDocumentId = document.Id,
      WarehouseTransferLineId = line.Id
    };

    _db.StockMovements.Add(transferOut);
    _db.StockMovements.Add(transferIn);
  }

  // ===========================================================================
  // Document Validation
  // ===========================================================================

  private async Task ValidateSingleWarehouseDocumentAsync(
    Guid branchId,
    Guid warehouseId,
    IEnumerable<Guid> productIds,
    CancellationToken ct)
  {
    await ValidateBranch(branchId, ct);

    var warehouse = await _db.Warehouses
      .AsNoTracking()
      .SingleOrDefaultAsync(
        x => x.Id == warehouseId && x.IsActive,
        ct)
      ?? throw new BadRequestException(
        ErrorCodes.Inventory.WarehouseInactive,
        "Select an active warehouse.");

    if (warehouse.BranchId != branchId)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.WarehouseBranchMismatch,
        "The selected warehouse does not belong to the document branch.");
    }

    await ValidateProductsAsync(productIds, ct);
  }

  private async Task ValidateTransferHeaderAsync(
    Guid branchId,
    Guid sourceId,
    Guid destinationId,
    IEnumerable<Guid> productIds,
    CancellationToken ct)
  {
    if (sourceId == destinationId)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.TransferSameWarehouse,
        "Source and destination warehouses must be different.");
    }

    await ValidateBranch(branchId, ct);

    var warehouses = await _db.Warehouses
      .AsNoTracking()
      .Where(x =>
        (x.Id == sourceId || x.Id == destinationId) &&
        x.IsActive)
      .ToListAsync(ct);

    if (warehouses.Count != 2)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.WarehouseInactive,
        "Select active source and destination warehouses.");
    }

    var sourceWarehouse = warehouses.Single(
      x => x.Id == sourceId);

    if (sourceWarehouse.BranchId != branchId)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.WarehouseBranchMismatch,
        "The source warehouse does not belong to the document branch.");
    }

    await ValidateProductsAsync(productIds, ct);
  }

  private async Task ValidateProductsAsync(
    IEnumerable<Guid> productIds,
    CancellationToken ct)
  {
    var ids = productIds
      .Distinct()
      .ToList();

    var count = await _db.Products
      .AsNoTracking()
      .CountAsync(
        x =>
          ids.Contains(x.Id) &&
          x.IsActive &&
          x.TrackInventory,
        ct);

    if (count != ids.Count)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.ProductNotStockable,
        "Every line must use an active inventory-tracked product.");
    }
  }

  private static void ValidateLines(
    IEnumerable<Guid> productIds)
  {
    var ids = productIds.ToList();

    if (ids.Count == 0)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.DocumentLinesRequired,
        "Add at least one product line.");
    }

    if (ids.Any(x => x == Guid.Empty))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.ProductNotStockable,
        "Select a product for every line.");
    }

    if (ids.Distinct().Count() != ids.Count)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.DuplicateDocumentProduct,
        "A product can appear only once in a document.");
    }
  }

  private static void ValidateOpeningLines(
    IEnumerable<(decimal Quantity, decimal UnitCost)> lines)
  {
    if (lines.Any(x => x.Quantity <= 0))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.DocumentLinesRequired,
        "Opening-stock quantities must be greater than zero.");
    }

    if (lines.Any(x => x.UnitCost < 0))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.UnitCostRequired,
        "Opening-stock unit costs cannot be negative.");
    }
  }

  private static void ValidateActualQuantities(
    IEnumerable<decimal> quantities)
  {
    if (quantities.Any(x => x < 0))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.InsufficientStock,
        "Actual quantity cannot be negative.");
    }
  }

  private static void ValidateTransferQuantities(
    IEnumerable<decimal> quantities)
  {
    if (quantities.Any(x => x <= 0))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.InsufficientStock,
        "Transfer quantities must be greater than zero.");
    }
  }

  private static void ValidateReason(string reason)
  {
    if (string.IsNullOrWhiteSpace(reason))
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.AdjustmentReasonRequired,
        "Enter a meaningful adjustment reason.");
    }
  }

  private static void EnsureDraft(
    InventoryDocumentStatus status)
  {
    if (status != InventoryDocumentStatus.Draft)
    {
      throw new ConflictException(
        ErrorCodes.Inventory.DocumentNotDraft,
        "Posted inventory documents are immutable.");
    }
  }

  private static NotFoundException DocumentNotFound()
  {
    return new NotFoundException(
      ErrorCodes.Inventory.DocumentNotFound,
      "Inventory document not found.");
  }

  // ===========================================================================
  // Document Numbers
  // ===========================================================================

  private async Task SaveDocumentAsync(
    CancellationToken ct)
  {
    try
    {
      await _db.SaveChangesAsync(ct);
    }
    catch (DbUpdateException)
    {
      throw new ConflictException(
        ErrorCodes.Inventory.DocumentNumberConflict,
        "Could not allocate a unique document number. Try again.");
    }
  }

  private static async Task<string> NextDocumentNumberAsync(
    IQueryable<string> numbers,
    string prefix,
    CancellationToken ct)
  {
    var last = await numbers
      .OrderByDescending(x => x)
      .FirstOrDefaultAsync(ct);

    var next = 1;

    if (last is not null)
    {
      var separatorIndex = last.LastIndexOf('-');

      if (separatorIndex >= 0 &&
          int.TryParse(
            last[(separatorIndex + 1)..],
            out var current))
      {
        next = current + 1;
      }
    }

    return $"{prefix}-{next:000000}";
  }

  // ===========================================================================
  // Stock Calculations
  // ===========================================================================

  private async Task<Dictionary<Guid, decimal>> GetQuantitiesAsync(
    Guid warehouseId,
    IEnumerable<Guid> productIds,
    CancellationToken ct)
  {
    var ids = productIds
      .Distinct()
      .ToList();

    return await _db.StockMovements
      .AsNoTracking()
      .Where(x =>
        x.WarehouseId == warehouseId &&
        ids.Contains(x.ProductId))
      .GroupBy(x => x.ProductId)
      .Select(group => new
      {
        ProductId = group.Key,
        Quantity = group.Sum(
          x => x.QuantityIn - x.QuantityOut)
      })
      .ToDictionaryAsync(
        x => x.ProductId,
        x => x.Quantity,
        ct);
  }

  private async Task<decimal> QuantityAsync(
    Guid warehouseId,
    Guid? productId,
    CancellationToken ct)
  {
    var query = _db.StockMovements
      .AsNoTracking()
      .Where(x => x.WarehouseId == warehouseId);

    if (productId is not null)
    {
      query = query.Where(
        x => x.ProductId == productId);
    }

    return await query.SumAsync(
      x => x.QuantityIn - x.QuantityOut,
      ct);
  }

  private async Task<decimal> ValuationCostAsync(
    Guid warehouseId,
    Guid productId,
    CancellationToken ct)
  {
    var local = await BalanceValueAsync(
      _db.StockMovements
        .AsNoTracking()
        .Where(x =>
          x.WarehouseId == warehouseId &&
          x.ProductId == productId),
      ct);

    if (local.Quantity != 0)
    {
      return local.Value / local.Quantity;
    }

    var company = await BalanceValueAsync(
      _db.StockMovements
        .AsNoTracking()
        .Where(x => x.ProductId == productId),
      ct);

    return company.Quantity == 0
      ? 0
      : company.Value / company.Quantity;
  }

  private static async Task<(decimal Quantity, decimal Value)>
    BalanceValueAsync(
      IQueryable<StockMovementEntity> query,
      CancellationToken ct)
  {
    var result = await query
      .GroupBy(_ => 1)
      .Select(group => new
      {
        Quantity = group.Sum(
          x => x.QuantityIn - x.QuantityOut),
        Value = group.Sum(
          x =>
            x.QuantityIn * x.UnitCostBase -
            x.QuantityOut * x.UnitCostBase)
      })
      .SingleOrDefaultAsync(ct);

    if (result is null)
    {
      return default;
    }

    return (
      result.Quantity,
      result.Value);
  }

  private async Task<Dictionary<Guid, (decimal Quantity, decimal Value)>>
    GetProductBalancesAsync(
      IEnumerable<Guid> productIds,
      Guid? warehouseId,
      CancellationToken ct)
  {
    var ids = productIds.ToList();

    var query = _db.StockMovements
      .AsNoTracking()
      .Where(x => ids.Contains(x.ProductId));

    if (warehouseId is not null)
    {
      query = query.Where(
        x => x.WarehouseId == warehouseId);
    }

    return await query
      .GroupBy(x => x.ProductId)
      .Select(group => new
      {
        Id = group.Key,
        Quantity = group.Sum(
          x => x.QuantityIn - x.QuantityOut),
        Value = group.Sum(
          x =>
            x.QuantityIn * x.UnitCostBase -
            x.QuantityOut * x.UnitCostBase)
      })
      .ToDictionaryAsync(
        x => x.Id,
        x => (x.Quantity, x.Value),
        ct);
  }

  // ===========================================================================
  // Document Queries
  // ===========================================================================

  private IQueryable<OpeningStockDocumentEntity> OpeningStockQuery()
  {
    return _db.OpeningStockDocuments
      .AsNoTracking()
      .Include(x => x.Branch)
      .Include(x => x.Warehouse)
      .Include(x => x.CreatedByUser)
      .Include(x => x.Lines)
      .ThenInclude(x => x.Product)
      .ThenInclude(x => x.UnitOfMeasure);
  }

  private IQueryable<StockAdjustmentDocumentEntity> AdjustmentQuery()
  {
    return _db.StockAdjustmentDocuments
      .AsNoTracking()
      .Include(x => x.Branch)
      .Include(x => x.Warehouse)
      .Include(x => x.CreatedByUser)
      .Include(x => x.Lines)
      .ThenInclude(x => x.Product)
      .ThenInclude(x => x.UnitOfMeasure);
  }

  private IQueryable<WarehouseTransferDocumentEntity> TransferQuery()
  {
    return _db.WarehouseTransferDocuments
      .AsNoTracking()
      .Include(x => x.Branch)
      .Include(x => x.SourceWarehouse)
      .Include(x => x.DestinationWarehouse)
      .Include(x => x.CreatedByUser)
      .Include(x => x.Lines)
      .ThenInclude(x => x.Product)
      .ThenInclude(x => x.UnitOfMeasure);
  }

  // ===========================================================================
  // Response Mapping
  // ===========================================================================

  private static OpeningStockResponse ToOpeningStock(
    OpeningStockDocumentEntity document)
  {
    var lines = document.Lines
      .OrderBy(x => x.Product.SKU)
      .Select(x => new OpeningStockLineResponse(
        x.Id,
        x.ProductId,
        x.Product.Name,
        x.Product.SKU,
        x.Product.UnitOfMeasure.Code,
        x.Quantity,
        x.UnitCostBase,
        x.Quantity * x.UnitCostBase))
      .ToList();

    return new OpeningStockResponse(
      document.Id,
      document.DocumentNumber,
      document.DocumentDate,
      document.BranchId,
      document.Branch.Code,
      document.Branch.Name,
      document.WarehouseId,
      document.Warehouse.Code,
      document.Warehouse.Name,
      document.Status,
      document.Notes,
      document.CreatedByUserId,
      document.CreatedByUser.Username,
      document.CreatedAtUtc,
      document.UpdatedAtUtc,
      document.PostedAtUtc,
      lines.Count,
      lines.Sum(x => x.LineValueBase),
      lines);
  }

  private static StockAdjustmentResponse ToAdjustment(
    StockAdjustmentDocumentEntity document,
    IReadOnlyDictionary<Guid, decimal>? current)
  {
    var lines = document.Lines
      .OrderBy(x => x.Product.SKU)
      .Select(x =>
      {
        var systemQuantity =
          current?.GetValueOrDefault(x.ProductId)
          ?? x.SystemQuantity;

        return new StockAdjustmentLineResponse(
          x.Id,
          x.ProductId,
          x.Product.Name,
          x.Product.SKU,
          x.Product.UnitOfMeasure.Code,
          systemQuantity,
          x.ActualQuantity,
          x.ActualQuantity - systemQuantity);
      })
      .ToList();

    return new StockAdjustmentResponse(
      document.Id,
      document.DocumentNumber,
      document.DocumentDate,
      document.BranchId,
      document.Branch.Code,
      document.Branch.Name,
      document.WarehouseId,
      document.Warehouse.Code,
      document.Warehouse.Name,
      document.Reason,
      document.Notes,
      document.Status,
      document.CreatedByUserId,
      document.CreatedByUser.Username,
      document.CreatedAtUtc,
      document.UpdatedAtUtc,
      document.PostedAtUtc,
      lines.Count,
      lines);
  }

  private static WarehouseTransferResponse ToTransfer(
    WarehouseTransferDocumentEntity document,
    IReadOnlyDictionary<Guid, decimal>? available)
  {
    var lines = document.Lines
      .OrderBy(x => x.Product.SKU)
      .Select(x => new WarehouseTransferLineResponse(
        x.Id,
        x.ProductId,
        x.Product.Name,
        x.Product.SKU,
        x.Product.UnitOfMeasure.Code,
        available?.GetValueOrDefault(x.ProductId)
          ?? x.AvailableSourceQuantity,
        x.Quantity))
      .ToList();

    return new WarehouseTransferResponse(
      document.Id,
      document.DocumentNumber,
      document.DocumentDate,
      document.BranchId,
      document.Branch.Code,
      document.Branch.Name,
      document.SourceWarehouseId,
      document.SourceWarehouse.Code,
      document.SourceWarehouse.Name,
      document.DestinationWarehouseId,
      document.DestinationWarehouse.Code,
      document.DestinationWarehouse.Name,
      document.Notes,
      document.Status,
      document.CreatedByUserId,
      document.CreatedByUser.Username,
      document.CreatedAtUtc,
      document.UpdatedAtUtc,
      document.PostedAtUtc,
      lines.Count,
      lines);
  }

  private static StockMovementResponse ToMovement(
    StockMovementEntity movement)
  {
    InventoryDocumentType? documentType =
      movement.OpeningStockDocumentId is not null
        ? InventoryDocumentType.OpeningStock
        : movement.StockAdjustmentDocumentId is not null
          ? InventoryDocumentType.Adjustment
          : movement.WarehouseTransferDocumentId is not null
            ? InventoryDocumentType.Transfer
            : null;

    var documentId =
      movement.OpeningStockDocumentId ??
      movement.StockAdjustmentDocumentId ??
      movement.WarehouseTransferDocumentId;

    var lineId =
      movement.OpeningStockLineId ??
      movement.StockAdjustmentLineId ??
      movement.WarehouseTransferLineId;

    var documentNumber =
      movement.OpeningStockDocument?.DocumentNumber ??
      movement.StockAdjustmentDocument?.DocumentNumber ??
      movement.WarehouseTransferDocument?.DocumentNumber;

    return new StockMovementResponse(
      movement.Id,
      movement.MovementDate,
      movement.Type,
      movement.ProductId,
      movement.Product.Name,
      movement.Product.SKU,
      movement.Product.UnitOfMeasure.Code,
      movement.WarehouseId,
      movement.Warehouse.Code,
      movement.Warehouse.Name,
      movement.Warehouse.BranchId,
      movement.Warehouse.Branch.Name,
      movement.QuantityIn,
      movement.QuantityOut,
      movement.UnitCostBase,
      movement.Reference,
      movement.Note,
      documentType,
      documentId,
      lineId,
      documentNumber,
      movement.PerformedByUserId,
      movement.PerformedByUser.Username,
      movement.CreatedAtUtc);
  }

  // ===========================================================================
  // Document Filters
  // ===========================================================================

  private static IQueryable<OpeningStockDocumentEntity> FilterDocuments(
    IQueryable<OpeningStockDocumentEntity> query,
    OpeningStockListQuery filter)
  {
    if (!string.IsNullOrWhiteSpace(filter.DocumentNumber))
    {
      var search = filter.DocumentNumber
        .Trim()
        .ToLower();

      query = query.Where(
        x => x.DocumentNumber.ToLower().Contains(search));
    }

    if (filter.FromDate is not null)
    {
      query = query.Where(
        x => x.DocumentDate >= filter.FromDate);
    }

    if (filter.ToDate is not null)
    {
      query = query.Where(
        x => x.DocumentDate <= filter.ToDate);
    }

    if (filter.BranchId is not null)
    {
      query = query.Where(
        x => x.BranchId == filter.BranchId);
    }

    if (filter.Status is not null)
    {
      query = query.Where(
        x => x.Status == filter.Status);
    }

    return query;
  }

  private static IQueryable<StockAdjustmentDocumentEntity> FilterDocuments(
    IQueryable<StockAdjustmentDocumentEntity> query,
    StockAdjustmentListQuery filter)
  {
    if (!string.IsNullOrWhiteSpace(filter.DocumentNumber))
    {
      var search = filter.DocumentNumber
        .Trim()
        .ToLower();

      query = query.Where(
        x => x.DocumentNumber.ToLower().Contains(search));
    }

    if (filter.FromDate is not null)
    {
      query = query.Where(
        x => x.DocumentDate >= filter.FromDate);
    }

    if (filter.ToDate is not null)
    {
      query = query.Where(
        x => x.DocumentDate <= filter.ToDate);
    }

    if (filter.BranchId is not null)
    {
      query = query.Where(
        x => x.BranchId == filter.BranchId);
    }

    if (filter.Status is not null)
    {
      query = query.Where(
        x => x.Status == filter.Status);
    }

    return query;
  }

  private static IQueryable<WarehouseTransferDocumentEntity> FilterDocuments(
    IQueryable<WarehouseTransferDocumentEntity> query,
    WarehouseTransferListQuery filter)
  {
    if (!string.IsNullOrWhiteSpace(filter.DocumentNumber))
    {
      var search = filter.DocumentNumber
        .Trim()
        .ToLower();

      query = query.Where(
        x => x.DocumentNumber.ToLower().Contains(search));
    }

    if (filter.FromDate is not null)
    {
      query = query.Where(
        x => x.DocumentDate >= filter.FromDate);
    }

    if (filter.ToDate is not null)
    {
      query = query.Where(
        x => x.DocumentDate <= filter.ToDate);
    }

    if (filter.BranchId is not null)
    {
      query = query.Where(
        x => x.BranchId == filter.BranchId);
    }

    if (filter.Status is not null)
    {
      query = query.Where(
        x => x.Status == filter.Status);
    }

    return query;
  }

  // ===========================================================================
  // Master Data Validation
  // ===========================================================================

  private async Task ValidateProductReferences(
    Guid categoryId,
    Guid unitId,
    CancellationToken ct)
  {
    var categoryExists = await _db.ProductCategories.AnyAsync(
      x => x.Id == categoryId && x.IsActive,
      ct);

    if (!categoryExists)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.CategoryInvalid,
        "Select an active category.");
    }

    var unitExists = await _db.UnitsOfMeasure.AnyAsync(
      x => x.Id == unitId && x.IsActive,
      ct);

    if (!unitExists)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.UnitInvalid,
        "Select an active unit.");
    }
  }

  private async Task EnsureProductCodes(
    Guid? id,
    string sku,
    string? barcode,
    CancellationToken ct)
  {
    var normalizedSku = Code(sku);

    if (await _db.Products.AnyAsync(
      x => x.SKU == normalizedSku && x.Id != id,
      ct))
    {
      throw new ConflictException(
        ErrorCodes.Inventory.SkuTaken,
        "That SKU is already in use.");
    }

    var normalizedBarcode = Trim(barcode);

    if (normalizedBarcode is not null &&
        await _db.Products.AnyAsync(
          x =>
            x.Barcode == normalizedBarcode &&
            x.Id != id,
          ct))
    {
      throw new ConflictException(
        ErrorCodes.Inventory.BarcodeTaken,
        "That barcode is already in use.");
    }
  }

  private async Task ValidateBranch(
    Guid id,
    CancellationToken ct)
  {
    var exists = await _db.Branches.AnyAsync(
      x => x.Id == id && x.IsActive,
      ct);

    if (!exists)
    {
      throw new BadRequestException(
        ErrorCodes.Inventory.BranchInvalid,
        "Select an active branch.");
    }
  }

  private async Task<ProductCategoryEntity> GetCategoryEntity(
    Guid id,
    CancellationToken ct)
  {
    return await _db.ProductCategories
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Inventory.CategoryNotFound,
        "Category not found.");
  }

  private async Task<UnitOfMeasureEntity> GetUnitEntity(
    Guid id,
    CancellationToken ct)
  {
    return await _db.UnitsOfMeasure
      .SingleOrDefaultAsync(x => x.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Inventory.UnitNotFound,
        "Unit not found.");
  }

  // ===========================================================================
  // Master Data Filters
  // ===========================================================================

  private static IQueryable<ProductCategoryEntity> Filter(
    IQueryable<ProductCategoryEntity> query,
    MasterListQuery filter)
  {
    if (!string.IsNullOrWhiteSpace(filter.Search))
    {
      var search = filter.Search
        .Trim()
        .ToLower();

      query = query.Where(
        x => x.Name.ToLower().Contains(search));
    }

    if (filter.IsActive is not null)
    {
      query = query.Where(
        x => x.IsActive == filter.IsActive);
    }

    return query;
  }

  private static IQueryable<UnitOfMeasureEntity> Filter(
    IQueryable<UnitOfMeasureEntity> query,
    MasterListQuery filter)
  {
    if (!string.IsNullOrWhiteSpace(filter.Search))
    {
      var search = filter.Search
        .Trim()
        .ToLower();

      query = query.Where(x =>
        x.Name.ToLower().Contains(search) ||
        x.Code.ToLower().Contains(search));
    }

    if (filter.IsActive is not null)
    {
      query = query.Where(
        x => x.IsActive == filter.IsActive);
    }

    return query;
  }

  // ===========================================================================
  // Mapping / Normalization
  // ===========================================================================

  private static void Apply(
    ProductEntity product,
    CreateProductRequest request)
  {
    product.Name = request.Name.Trim();
    product.SKU = Code(request.SKU);
    product.Barcode = Trim(request.Barcode);
    product.CategoryId = request.CategoryId;
    product.UnitOfMeasureId = request.UnitOfMeasureId;
    product.Purpose = request.Purpose;
    product.TrackInventory = request.TrackInventory;
    product.IsActive = request.IsActive;
    product.Description = Trim(request.Description);
    product.ImageReference = Trim(request.ImageReference);
  }

  private static void Apply(
    ProductEntity product,
    UpdateProductRequest request)
  {
    Apply(
      product,
      new CreateProductRequest(
        request.Name,
        request.SKU,
        request.Barcode,
        request.CategoryId,
        request.UnitOfMeasureId,
        request.Purpose,
        request.TrackInventory,
        request.IsActive,
        request.Description,
        request.ImageReference));
  }

  private static ProductResponse ToProduct(
    ProductEntity product,
    (decimal Quantity, decimal Value) balance)
  {
    return new ProductResponse(
      product.Id,
      product.Name,
      product.SKU,
      product.Barcode,
      product.CategoryId,
      product.Category.Name,
      product.UnitOfMeasureId,
      product.UnitOfMeasure.Code,
      product.Purpose,
      product.TrackInventory,
      product.IsActive,
      product.Description,
      product.ImageReference,
      balance.Quantity,
      balance.Quantity == 0
        ? 0
        : balance.Value / balance.Quantity,
      balance.Value);
  }

  private static WarehouseResponse ToWarehouse(
    WarehouseEntity warehouse)
  {
    return new WarehouseResponse(
      warehouse.Id,
      warehouse.Code,
      warehouse.Name,
      warehouse.BranchId,
      warehouse.Branch.Code,
      warehouse.Branch.Name,
      warehouse.IsActive);
  }

  private static string Code(string value)
  {
    return value
      .Trim()
      .ToUpperInvariant();
  }

  private static string? Trim(string? value)
  {
    return string.IsNullOrWhiteSpace(value)
      ? null
      : value.Trim();
  }
}