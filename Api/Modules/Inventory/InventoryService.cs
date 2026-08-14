using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Inventory;

public sealed class InventoryService
{
  private readonly AppDbContext _db;
  public InventoryService(AppDbContext db) => _db = db;

  public async Task<PagedResult<CategoryResponse>> GetCategoriesAsync(MasterListQuery q, CancellationToken ct) => await Filter(_db.ProductCategories.AsNoTracking(), q).OrderBy(x => x.Name).Select(x => new CategoryResponse(x.Id, x.Name, x.IsActive)).ToPagedResultAsync(q, ct);
  public async Task<PagedResult<UnitResponse>> GetUnitsAsync(MasterListQuery q, CancellationToken ct) => await Filter(_db.UnitsOfMeasure.AsNoTracking(), q).OrderBy(x => x.Code).Select(x => new UnitResponse(x.Id, x.Name, x.Code, x.IsActive)).ToPagedResultAsync(q, ct);

  public async Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest r, CancellationToken ct) { var name = r.Name.Trim(); if (await _db.ProductCategories.AnyAsync(x => x.Name == name, ct)) throw new ConflictException(ErrorCodes.Inventory.CategoryNameTaken, "That category name is already in use."); var x = new ProductCategoryEntity { Name = name, IsActive = r.IsActive }; _db.ProductCategories.Add(x); await _db.SaveChangesAsync(ct); return new(x.Id, x.Name, x.IsActive); }
  public async Task<CategoryResponse> UpdateCategoryAsync(Guid id, UpdateCategoryRequest r, CancellationToken ct) { var x = await GetCategoryEntity(id, ct); var name = r.Name.Trim(); if (name != x.Name && await _db.ProductCategories.AnyAsync(y => y.Name == name && y.Id != id, ct)) throw new ConflictException(ErrorCodes.Inventory.CategoryNameTaken, "That category name is already in use."); x.Name = name; x.IsActive = r.IsActive; await _db.SaveChangesAsync(ct); return new(x.Id, x.Name, x.IsActive); }
  public async Task DeleteCategoryAsync(Guid id, CancellationToken ct) { var x = await GetCategoryEntity(id, ct); if (await _db.Products.AnyAsync(p => p.CategoryId == id, ct)) throw new BadRequestException(ErrorCodes.Inventory.CategoryInUse, "A category assigned to products cannot be deleted."); _db.ProductCategories.Remove(x); await _db.SaveChangesAsync(ct); }
  public async Task<UnitResponse> CreateUnitAsync(CreateUnitRequest r, CancellationToken ct) { var code = Code(r.Code); if (await _db.UnitsOfMeasure.AnyAsync(x => x.Code == code, ct)) throw new ConflictException(ErrorCodes.Inventory.UnitCodeTaken, "That unit code is already in use."); var x = new UnitOfMeasureEntity { Name = r.Name.Trim(), Code = code, IsActive = r.IsActive }; _db.UnitsOfMeasure.Add(x); await _db.SaveChangesAsync(ct); return new(x.Id, x.Name, x.Code, x.IsActive); }
  public async Task<UnitResponse> UpdateUnitAsync(Guid id, UpdateUnitRequest r, CancellationToken ct) { var x = await GetUnitEntity(id, ct); var code = Code(r.Code); if (code != x.Code && await _db.UnitsOfMeasure.AnyAsync(y => y.Code == code && y.Id != id, ct)) throw new ConflictException(ErrorCodes.Inventory.UnitCodeTaken, "That unit code is already in use."); x.Name = r.Name.Trim(); x.Code = code; x.IsActive = r.IsActive; await _db.SaveChangesAsync(ct); return new(x.Id, x.Name, x.Code, x.IsActive); }
  public async Task DeleteUnitAsync(Guid id, CancellationToken ct) { var x = await GetUnitEntity(id, ct); if (await _db.Products.AnyAsync(p => p.UnitOfMeasureId == id, ct)) throw new BadRequestException(ErrorCodes.Inventory.UnitInUse, "A unit assigned to products cannot be deleted."); _db.UnitsOfMeasure.Remove(x); await _db.SaveChangesAsync(ct); }

  public async Task<PagedResult<ProductResponse>> GetProductsAsync(ProductListQuery q, CancellationToken ct)
  {
    var query = _db.Products.AsNoTracking().Include(x => x.Category).Include(x => x.UnitOfMeasure).AsQueryable();
    if (!string.IsNullOrWhiteSpace(q.Search)) { var s = q.Search.Trim().ToLower(); query = query.Where(x => x.Name.ToLower().Contains(s) || x.SKU.ToLower().Contains(s) || (x.Barcode != null && x.Barcode.ToLower().Contains(s))); }
    if (q.IsActive is not null) query = query.Where(x => x.IsActive == q.IsActive);
    if (q.CategoryId is not null) query = query.Where(x => x.CategoryId == q.CategoryId);
    if (q.Purpose is not null) query = query.Where(x => x.Purpose == q.Purpose);
    var n = q.Normalize(); var count = await query.CountAsync(ct); var products = await query.OrderBy(x => x.Name).Skip((n.Page - 1) * n.PageSize).Take(n.PageSize).ToListAsync(ct); var balances = await GetProductBalancesAsync(products.Select(x => x.Id), null, ct); return new(products.Select(x => ToProduct(x, balances.GetValueOrDefault(x.Id))).ToList(), count, n.Page, n.PageSize);
  }

  public async Task<ProductResponse> CreateProductAsync(CreateProductRequest r, CancellationToken ct) { await ValidateProductReferences(r.CategoryId, r.UnitOfMeasureId, ct); await EnsureProductCodes(null, r.SKU, r.Barcode, ct); var x = new ProductEntity(); Apply(x, r); _db.Products.Add(x); await _db.SaveChangesAsync(ct); await _db.Entry(x).Reference(p => p.Category).LoadAsync(ct); await _db.Entry(x).Reference(p => p.UnitOfMeasure).LoadAsync(ct); return ToProduct(x, default); }
  public async Task<ProductResponse> UpdateProductAsync(Guid id, UpdateProductRequest r, CancellationToken ct) { var x = await _db.Products.Include(p => p.Category).Include(p => p.UnitOfMeasure).SingleOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException(ErrorCodes.Inventory.ProductNotFound, "Product not found."); await ValidateProductReferences(r.CategoryId, r.UnitOfMeasureId, ct); await EnsureProductCodes(id, r.SKU, r.Barcode, ct); Apply(x, r); await _db.SaveChangesAsync(ct); await _db.Entry(x).Reference(p => p.Category).LoadAsync(ct); await _db.Entry(x).Reference(p => p.UnitOfMeasure).LoadAsync(ct); var b = await GetProductBalancesAsync([id], null, ct); return ToProduct(x, b.GetValueOrDefault(id)); }
  public async Task DeleteProductAsync(Guid id, CancellationToken ct) { var x = await _db.Products.SingleOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException(ErrorCodes.Inventory.ProductNotFound, "Product not found."); if (await _db.StockMovements.AnyAsync(m => m.ProductId == id, ct)) throw new BadRequestException(ErrorCodes.Inventory.ProductHasHistory, "A product with stock history cannot be deleted. Deactivate it instead."); _db.Products.Remove(x); await _db.SaveChangesAsync(ct); }

  public async Task<PagedResult<WarehouseResponse>> GetWarehousesAsync(WarehouseListQuery q, CancellationToken ct) { var x = _db.Warehouses.AsNoTracking().Include(w => w.Branch).AsQueryable(); if (!string.IsNullOrWhiteSpace(q.Search)) { var s = q.Search.Trim().ToLower(); x = x.Where(w => w.Code.ToLower().Contains(s) || w.Name.ToLower().Contains(s)); } if (q.IsActive is not null) x = x.Where(w => w.IsActive == q.IsActive); if (q.BranchId is not null) x = x.Where(w => w.BranchId == q.BranchId); return await x.OrderBy(w => w.Code).Select(w => ToWarehouse(w)).ToPagedResultAsync(q, ct); }
  public async Task<WarehouseResponse> CreateWarehouseAsync(CreateWarehouseRequest r, CancellationToken ct) { await ValidateBranch(r.BranchId, ct); var code = Code(r.Code); if (await _db.Warehouses.AnyAsync(w => w.Code == code, ct)) throw new ConflictException(ErrorCodes.Inventory.WarehouseCodeTaken, "That warehouse code is already in use."); var w = new WarehouseEntity { Code = code, Name = r.Name.Trim(), BranchId = r.BranchId, IsActive = r.IsActive }; _db.Warehouses.Add(w); await _db.SaveChangesAsync(ct); await _db.Entry(w).Reference(x => x.Branch).LoadAsync(ct); return ToWarehouse(w); }
  public async Task<WarehouseResponse> UpdateWarehouseAsync(Guid id, UpdateWarehouseRequest r, CancellationToken ct) { var w = await _db.Warehouses.Include(x => x.Branch).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException(ErrorCodes.Inventory.WarehouseNotFound, "Warehouse not found."); await ValidateBranch(r.BranchId, ct); var code = Code(r.Code); if (code != w.Code && await _db.Warehouses.AnyAsync(x => x.Code == code && x.Id != id, ct)) throw new ConflictException(ErrorCodes.Inventory.WarehouseCodeTaken, "That warehouse code is already in use."); if (!r.IsActive && await QuantityAsync(id, null, ct) != 0) throw new BadRequestException(ErrorCodes.Inventory.WarehouseHasStock, "Move or adjust stock out before deactivating a warehouse."); w.Code = code; w.Name = r.Name.Trim(); w.BranchId = r.BranchId; w.IsActive = r.IsActive; await _db.SaveChangesAsync(ct); await _db.Entry(w).Reference(x => x.Branch).LoadAsync(ct); return ToWarehouse(w); }
  public async Task DeleteWarehouseAsync(Guid id, CancellationToken ct) { var w = await _db.Warehouses.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException(ErrorCodes.Inventory.WarehouseNotFound, "Warehouse not found."); if (await _db.StockMovements.AnyAsync(m => m.WarehouseId == id, ct)) throw new BadRequestException(ErrorCodes.Inventory.WarehouseHasHistory, "A warehouse with stock history cannot be deleted. Deactivate it instead."); _db.Warehouses.Remove(w); await _db.SaveChangesAsync(ct); }

  public async Task<PagedResult<OpeningStockListResponse>> GetOpeningStocksAsync(OpeningStockListQuery q, CancellationToken ct)
  {
    var query = FilterDocuments(_db.OpeningStockDocuments.AsNoTracking(), q);
    if (q.WarehouseId is not null) query = query.Where(x => x.WarehouseId == q.WarehouseId);
    return await query.OrderByDescending(x => x.DocumentDate).ThenByDescending(x => x.DocumentNumber).Select(x => new OpeningStockListResponse(x.Id, x.DocumentNumber, x.DocumentDate, x.BranchId, x.Branch.Name, x.WarehouseId, x.Warehouse.Name, x.Lines.Count, x.Lines.Sum(l => l.Quantity * l.UnitCostBase), x.Status, x.CreatedByUserId, x.CreatedByUser.Username, x.CreatedAtUtc, x.UpdatedAtUtc, x.PostedAtUtc)).ToPagedResultAsync(q, ct);
  }

  public async Task<OpeningStockResponse> GetOpeningStockAsync(Guid id, CancellationToken ct)
  {
    var d = await OpeningStockQuery().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound();
    return ToOpeningStock(d);
  }

  public async Task<OpeningStockResponse> CreateOpeningStockAsync(OpeningStockDraftRequest r, Guid userId, CancellationToken ct)
  {
    await ValidateSingleWarehouseDocumentAsync(r.BranchId, r.WarehouseId, r.Lines.Select(x => x.ProductId), ct);
    ValidateLines(r.Lines.Select(x => x.ProductId)); ValidateOpeningLines(r.Lines.Select(x => (x.Quantity, x.UnitCostBase)));
    var d = new OpeningStockDocumentEntity { DocumentNumber = await NextDocumentNumberAsync(_db.OpeningStockDocuments.Select(x => x.DocumentNumber), "OS", ct), DocumentDate = r.DocumentDate, BranchId = r.BranchId, WarehouseId = r.WarehouseId, Notes = Trim(r.Notes), CreatedByUserId = userId };
    foreach (var l in r.Lines) d.Lines.Add(new OpeningStockLineEntity { ProductId = l.ProductId, Quantity = l.Quantity, UnitCostBase = l.UnitCostBase });
    _db.OpeningStockDocuments.Add(d);
    await SaveDocumentAsync(ct);
    return await GetOpeningStockAsync(d.Id, ct);
  }

  public async Task<OpeningStockResponse> UpdateOpeningStockAsync(Guid id, OpeningStockDraftRequest r, CancellationToken ct)
  {
    var d = await _db.OpeningStockDocuments.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound();
    EnsureDraft(d.Status);
    await ValidateSingleWarehouseDocumentAsync(r.BranchId, r.WarehouseId, r.Lines.Select(x => x.ProductId), ct);
    ValidateLines(r.Lines.Select(x => x.ProductId)); ValidateOpeningLines(r.Lines.Select(x => (x.Quantity, x.UnitCostBase)));
    d.DocumentDate = r.DocumentDate; d.BranchId = r.BranchId; d.WarehouseId = r.WarehouseId; d.Notes = Trim(r.Notes); d.UpdatedAtUtc = DateTime.UtcNow;
    foreach (var line in d.Lines.ToList()) { var update = r.Lines.SingleOrDefault(x => x.ProductId == line.ProductId); if (update is null) _db.OpeningStockLines.Remove(line); else { line.Quantity = update.Quantity; line.UnitCostBase = update.UnitCostBase; } } foreach (var line in r.Lines.Where(x => d.Lines.All(y => y.ProductId != x.ProductId))) d.Lines.Add(new OpeningStockLineEntity { ProductId = line.ProductId, Quantity = line.Quantity, UnitCostBase = line.UnitCostBase });
    await _db.SaveChangesAsync(ct);
    return await GetOpeningStockAsync(id, ct);
  }

  public async Task DeleteOpeningStockAsync(Guid id, CancellationToken ct)
  {
    var d = await _db.OpeningStockDocuments.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound(); EnsureDraft(d.Status); _db.OpeningStockDocuments.Remove(d); await _db.SaveChangesAsync(ct);
  }

  public async Task<OpeningStockResponse> PostOpeningStockAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var d = await _db.OpeningStockDocuments.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound();
    EnsureDraft(d.Status); ValidateLines(d.Lines.Select(x => x.ProductId)); ValidateOpeningLines(d.Lines.Select(x => (x.Quantity, x.UnitCostBase))); await ValidateSingleWarehouseDocumentAsync(d.BranchId, d.WarehouseId, d.Lines.Select(x => x.ProductId), ct);
    foreach (var line in d.Lines) AddOpeningMovement(d, line, userId);
    d.Status = InventoryDocumentStatus.Posted; d.PostedAtUtc = DateTime.UtcNow; d.UpdatedAtUtc = d.PostedAtUtc.Value;
    await _db.SaveChangesAsync(ct);
    return await GetOpeningStockAsync(id, ct);
  }

  public async Task<PagedResult<StockAdjustmentListResponse>> GetAdjustmentsAsync(StockAdjustmentListQuery q, CancellationToken ct)
  {
    var query = FilterDocuments(_db.StockAdjustmentDocuments.AsNoTracking(), q);
    if (q.WarehouseId is not null) query = query.Where(x => x.WarehouseId == q.WarehouseId);
    return await query.OrderByDescending(x => x.DocumentDate).ThenByDescending(x => x.DocumentNumber).Select(x => new StockAdjustmentListResponse(x.Id, x.DocumentNumber, x.DocumentDate, x.BranchId, x.Branch.Name, x.WarehouseId, x.Warehouse.Name, x.Reason, x.Lines.Count, x.Status, x.CreatedByUserId, x.CreatedByUser.Username, x.CreatedAtUtc, x.UpdatedAtUtc, x.PostedAtUtc)).ToPagedResultAsync(q, ct);
  }

  public async Task<StockAdjustmentResponse> GetAdjustmentAsync(Guid id, CancellationToken ct)
  {
    var d = await AdjustmentQuery().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound();
    var current = d.Status == InventoryDocumentStatus.Draft ? await GetQuantitiesAsync(d.WarehouseId, d.Lines.Select(x => x.ProductId), ct) : null;
    return ToAdjustment(d, current);
  }

  public async Task<StockAdjustmentResponse> CreateAdjustmentAsync(StockAdjustmentDraftRequest r, Guid userId, CancellationToken ct)
  {
    ValidateReason(r.Reason); ValidateLines(r.Lines.Select(x => x.ProductId)); ValidateActualQuantities(r.Lines.Select(x => x.ActualQuantity)); await ValidateSingleWarehouseDocumentAsync(r.BranchId, r.WarehouseId, r.Lines.Select(x => x.ProductId), ct); var quantities = await GetQuantitiesAsync(r.WarehouseId, r.Lines.Select(x => x.ProductId), ct);
    var d = new StockAdjustmentDocumentEntity { DocumentNumber = await NextDocumentNumberAsync(_db.StockAdjustmentDocuments.Select(x => x.DocumentNumber), "ADJ", ct), DocumentDate = r.DocumentDate, BranchId = r.BranchId, WarehouseId = r.WarehouseId, Reason = r.Reason.Trim(), Notes = Trim(r.Notes), CreatedByUserId = userId };
    foreach (var l in r.Lines) d.Lines.Add(new StockAdjustmentLineEntity { ProductId = l.ProductId, SystemQuantity = quantities.GetValueOrDefault(l.ProductId), ActualQuantity = l.ActualQuantity });
    _db.StockAdjustmentDocuments.Add(d); await SaveDocumentAsync(ct); return await GetAdjustmentAsync(d.Id, ct);
  }

  public async Task<StockAdjustmentResponse> UpdateAdjustmentAsync(Guid id, StockAdjustmentDraftRequest r, CancellationToken ct)
  {
    var d = await _db.StockAdjustmentDocuments.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound(); EnsureDraft(d.Status); ValidateReason(r.Reason); ValidateLines(r.Lines.Select(x => x.ProductId)); ValidateActualQuantities(r.Lines.Select(x => x.ActualQuantity)); await ValidateSingleWarehouseDocumentAsync(r.BranchId, r.WarehouseId, r.Lines.Select(x => x.ProductId), ct); var quantities = await GetQuantitiesAsync(r.WarehouseId, r.Lines.Select(x => x.ProductId), ct);
    d.DocumentDate = r.DocumentDate; d.BranchId = r.BranchId; d.WarehouseId = r.WarehouseId; d.Reason = r.Reason.Trim(); d.Notes = Trim(r.Notes); d.UpdatedAtUtc = DateTime.UtcNow; foreach (var line in d.Lines.ToList()) { var update = r.Lines.SingleOrDefault(x => x.ProductId == line.ProductId); if (update is null) _db.StockAdjustmentLines.Remove(line); else { line.SystemQuantity = quantities.GetValueOrDefault(line.ProductId); line.ActualQuantity = update.ActualQuantity; } } foreach (var line in r.Lines.Where(x => d.Lines.All(y => y.ProductId != x.ProductId))) d.Lines.Add(new StockAdjustmentLineEntity { ProductId = line.ProductId, SystemQuantity = quantities.GetValueOrDefault(line.ProductId), ActualQuantity = line.ActualQuantity });
    await _db.SaveChangesAsync(ct); return await GetAdjustmentAsync(id, ct);
  }

  public async Task DeleteAdjustmentAsync(Guid id, CancellationToken ct) { var d = await _db.StockAdjustmentDocuments.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound(); EnsureDraft(d.Status); _db.StockAdjustmentDocuments.Remove(d); await _db.SaveChangesAsync(ct); }

  public async Task<StockAdjustmentResponse> PostAdjustmentAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var d = await _db.StockAdjustmentDocuments.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound(); EnsureDraft(d.Status); ValidateReason(d.Reason); ValidateLines(d.Lines.Select(x => x.ProductId)); ValidateActualQuantities(d.Lines.Select(x => x.ActualQuantity)); await ValidateSingleWarehouseDocumentAsync(d.BranchId, d.WarehouseId, d.Lines.Select(x => x.ProductId), ct); var quantities = await GetQuantitiesAsync(d.WarehouseId, d.Lines.Select(x => x.ProductId), ct);
    var costs = new Dictionary<Guid, decimal>();
    foreach (var line in d.Lines) { line.SystemQuantity = quantities.GetValueOrDefault(line.ProductId); if (line.ActualQuantity < 0) throw new BadRequestException(ErrorCodes.Inventory.InsufficientStock, "Actual quantity cannot be negative."); var difference = line.ActualQuantity - line.SystemQuantity; if (difference != 0) costs[line.ProductId] = await ValuationCostAsync(d.WarehouseId, line.ProductId, ct); }
    foreach (var line in d.Lines) { var difference = line.ActualQuantity - line.SystemQuantity; if (difference != 0) AddAdjustmentMovement(d, line, difference, costs[line.ProductId], userId); }
    d.Status = InventoryDocumentStatus.Posted; d.PostedAtUtc = DateTime.UtcNow; d.UpdatedAtUtc = d.PostedAtUtc.Value; await _db.SaveChangesAsync(ct); return await GetAdjustmentAsync(id, ct);
  }

  public async Task<PagedResult<WarehouseTransferListResponse>> GetTransfersAsync(WarehouseTransferListQuery q, CancellationToken ct)
  {
    var query = FilterDocuments(_db.WarehouseTransferDocuments.AsNoTracking(), q); if (q.SourceWarehouseId is not null) query = query.Where(x => x.SourceWarehouseId == q.SourceWarehouseId); if (q.DestinationWarehouseId is not null) query = query.Where(x => x.DestinationWarehouseId == q.DestinationWarehouseId);
    return await query.OrderByDescending(x => x.DocumentDate).ThenByDescending(x => x.DocumentNumber).Select(x => new WarehouseTransferListResponse(x.Id, x.DocumentNumber, x.DocumentDate, x.BranchId, x.Branch.Name, x.SourceWarehouseId, x.SourceWarehouse.Name, x.DestinationWarehouseId, x.DestinationWarehouse.Name, x.Lines.Count, x.Status, x.CreatedByUserId, x.CreatedByUser.Username, x.CreatedAtUtc, x.UpdatedAtUtc, x.PostedAtUtc)).ToPagedResultAsync(q, ct);
  }

  public async Task<WarehouseTransferResponse> GetTransferAsync(Guid id, CancellationToken ct)
  {
    var d = await TransferQuery().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound(); var available = d.Status == InventoryDocumentStatus.Draft ? await GetQuantitiesAsync(d.SourceWarehouseId, d.Lines.Select(x => x.ProductId), ct) : null; return ToTransfer(d, available);
  }

  public async Task<WarehouseTransferResponse> CreateTransferAsync(WarehouseTransferDraftRequest r, Guid userId, CancellationToken ct)
  {
    ValidateLines(r.Lines.Select(x => x.ProductId)); ValidateTransferQuantities(r.Lines.Select(x => x.Quantity)); await ValidateTransferHeaderAsync(r.BranchId, r.SourceWarehouseId, r.DestinationWarehouseId, r.Lines.Select(x => x.ProductId), ct); var quantities = await GetQuantitiesAsync(r.SourceWarehouseId, r.Lines.Select(x => x.ProductId), ct);
    var d = new WarehouseTransferDocumentEntity { DocumentNumber = await NextDocumentNumberAsync(_db.WarehouseTransferDocuments.Select(x => x.DocumentNumber), "TRF", ct), DocumentDate = r.DocumentDate, BranchId = r.BranchId, SourceWarehouseId = r.SourceWarehouseId, DestinationWarehouseId = r.DestinationWarehouseId, Notes = Trim(r.Notes), CreatedByUserId = userId };
    foreach (var l in r.Lines) d.Lines.Add(new WarehouseTransferLineEntity { ProductId = l.ProductId, AvailableSourceQuantity = quantities.GetValueOrDefault(l.ProductId), Quantity = l.Quantity }); _db.WarehouseTransferDocuments.Add(d); await SaveDocumentAsync(ct); return await GetTransferAsync(d.Id, ct);
  }

  public async Task<WarehouseTransferResponse> UpdateTransferAsync(Guid id, WarehouseTransferDraftRequest r, CancellationToken ct)
  {
    var d = await _db.WarehouseTransferDocuments.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound(); EnsureDraft(d.Status); ValidateLines(r.Lines.Select(x => x.ProductId)); ValidateTransferQuantities(r.Lines.Select(x => x.Quantity)); await ValidateTransferHeaderAsync(r.BranchId, r.SourceWarehouseId, r.DestinationWarehouseId, r.Lines.Select(x => x.ProductId), ct); var quantities = await GetQuantitiesAsync(r.SourceWarehouseId, r.Lines.Select(x => x.ProductId), ct);
    d.DocumentDate = r.DocumentDate; d.BranchId = r.BranchId; d.SourceWarehouseId = r.SourceWarehouseId; d.DestinationWarehouseId = r.DestinationWarehouseId; d.Notes = Trim(r.Notes); d.UpdatedAtUtc = DateTime.UtcNow; foreach (var line in d.Lines.ToList()) { var update = r.Lines.SingleOrDefault(x => x.ProductId == line.ProductId); if (update is null) _db.WarehouseTransferLines.Remove(line); else { line.AvailableSourceQuantity = quantities.GetValueOrDefault(line.ProductId); line.Quantity = update.Quantity; } } foreach (var line in r.Lines.Where(x => d.Lines.All(y => y.ProductId != x.ProductId))) d.Lines.Add(new WarehouseTransferLineEntity { ProductId = line.ProductId, AvailableSourceQuantity = quantities.GetValueOrDefault(line.ProductId), Quantity = line.Quantity }); await _db.SaveChangesAsync(ct); return await GetTransferAsync(id, ct);
  }

  public async Task DeleteTransferAsync(Guid id, CancellationToken ct) { var d = await _db.WarehouseTransferDocuments.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound(); EnsureDraft(d.Status); _db.WarehouseTransferDocuments.Remove(d); await _db.SaveChangesAsync(ct); }

  public async Task<WarehouseTransferResponse> PostTransferAsync(Guid id, Guid userId, CancellationToken ct)
  {
    var d = await _db.WarehouseTransferDocuments.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw DocumentNotFound(); EnsureDraft(d.Status); ValidateLines(d.Lines.Select(x => x.ProductId)); ValidateTransferQuantities(d.Lines.Select(x => x.Quantity)); await ValidateTransferHeaderAsync(d.BranchId, d.SourceWarehouseId, d.DestinationWarehouseId, d.Lines.Select(x => x.ProductId), ct); var quantities = await GetQuantitiesAsync(d.SourceWarehouseId, d.Lines.Select(x => x.ProductId), ct); var costs = new Dictionary<Guid, decimal>();
    foreach (var line in d.Lines) { line.AvailableSourceQuantity = quantities.GetValueOrDefault(line.ProductId); if (line.Quantity > line.AvailableSourceQuantity) throw new BadRequestException(ErrorCodes.Inventory.InsufficientStock, "A transfer line exceeds current source stock."); costs[line.ProductId] = await ValuationCostAsync(d.SourceWarehouseId, line.ProductId, ct); }
    foreach (var line in d.Lines) AddTransferMovements(d, line, costs[line.ProductId], userId); d.Status = InventoryDocumentStatus.Posted; d.PostedAtUtc = DateTime.UtcNow; d.UpdatedAtUtc = d.PostedAtUtc.Value; await _db.SaveChangesAsync(ct); return await GetTransferAsync(id, ct);
  }

  public async Task<PagedResult<StockBalanceResponse>> GetBalancesAsync(StockBalanceListQuery q, CancellationToken ct)
  {
    var query = _db.StockMovements.AsNoTracking().Include(m => m.Product).ThenInclude(p => p.Category).Include(m => m.Product.UnitOfMeasure).Include(m => m.Warehouse).ThenInclude(w => w.Branch).AsQueryable();
    if (q.ProductId is not null) query = query.Where(m => m.ProductId == q.ProductId); if (q.WarehouseId is not null) query = query.Where(m => m.WarehouseId == q.WarehouseId); if (q.BranchId is not null) query = query.Where(m => m.Warehouse.BranchId == q.BranchId); if (q.CategoryId is not null) query = query.Where(m => m.Product.CategoryId == q.CategoryId); if (!string.IsNullOrWhiteSpace(q.Search)) { var s = q.Search.Trim().ToLower(); query = query.Where(m => m.Product.Name.ToLower().Contains(s) || m.Product.SKU.ToLower().Contains(s)); }
    var grouped = query.GroupBy(m => new { m.ProductId, m.WarehouseId }).Select(g => new { g.Key.ProductId, g.Key.WarehouseId, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut), Value = g.Sum(x => x.QuantityIn * x.UnitCostBase - x.QuantityOut * x.UnitCostBase) }).Where(x => x.Quantity != 0); var n = q.Normalize(); var count = await grouped.CountAsync(ct); var rows = await grouped.OrderBy(x => x.ProductId).Skip((n.Page - 1) * n.PageSize).Take(n.PageSize).ToListAsync(ct); var products = await _db.Products.AsNoTracking().Include(p => p.Category).Include(p => p.UnitOfMeasure).Where(p => rows.Select(r => r.ProductId).Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct); var warehouses = await _db.Warehouses.AsNoTracking().Include(w => w.Branch).Where(w => rows.Select(r => r.WarehouseId).Contains(w.Id)).ToDictionaryAsync(w => w.Id, ct); return new(rows.Select(r => new StockBalanceResponse(r.ProductId, products[r.ProductId].Name, products[r.ProductId].SKU, products[r.ProductId].Category.Name, products[r.ProductId].UnitOfMeasure.Code, r.WarehouseId, warehouses[r.WarehouseId].Code, warehouses[r.WarehouseId].Name, warehouses[r.WarehouseId].BranchId, warehouses[r.WarehouseId].Branch.Name, r.Quantity, r.Quantity == 0 ? 0 : r.Value / r.Quantity, r.Value)).ToList(), count, n.Page, n.PageSize);
  }

  public async Task<PagedResult<StockMovementResponse>> GetMovementsAsync(StockMovementListQuery q, CancellationToken ct)
  {
    var query = _db.StockMovements.AsNoTracking().Include(m => m.Product).ThenInclude(p => p.UnitOfMeasure).Include(m => m.Warehouse).ThenInclude(w => w.Branch).Include(m => m.PerformedByUser).Include(m => m.OpeningStockDocument).Include(m => m.StockAdjustmentDocument).Include(m => m.WarehouseTransferDocument).AsQueryable();
    if (q.ProductId is not null) query = query.Where(m => m.ProductId == q.ProductId); if (q.WarehouseId is not null) query = query.Where(m => m.WarehouseId == q.WarehouseId); if (q.BranchId is not null) query = query.Where(m => m.Warehouse.BranchId == q.BranchId); if (q.Type is not null) query = query.Where(m => m.Type == q.Type); if (q.FromDate is not null) query = query.Where(m => m.MovementDate >= q.FromDate); if (q.ToDate is not null) query = query.Where(m => m.MovementDate <= q.ToDate);
    if (q.DocumentType is InventoryDocumentType.OpeningStock) query = query.Where(m => m.OpeningStockDocumentId != null); if (q.DocumentType is InventoryDocumentType.Adjustment) query = query.Where(m => m.StockAdjustmentDocumentId != null); if (q.DocumentType is InventoryDocumentType.Transfer) query = query.Where(m => m.WarehouseTransferDocumentId != null);
    if (!string.IsNullOrWhiteSpace(q.DocumentNumber)) { var number = q.DocumentNumber.Trim().ToLower(); query = query.Where(m => (m.OpeningStockDocument != null && m.OpeningStockDocument.DocumentNumber.ToLower().Contains(number)) || (m.StockAdjustmentDocument != null && m.StockAdjustmentDocument.DocumentNumber.ToLower().Contains(number)) || (m.WarehouseTransferDocument != null && m.WarehouseTransferDocument.DocumentNumber.ToLower().Contains(number))); }
    var n = q.Normalize(); var count = await query.CountAsync(ct); var rows = await query.OrderByDescending(m => m.MovementDate).ThenByDescending(m => m.CreatedAtUtc).Skip((n.Page - 1) * n.PageSize).Take(n.PageSize).ToListAsync(ct);
    return new(rows.Select(ToMovement).ToList(), count, n.Page, n.PageSize);
  }

  private void AddOpeningMovement(OpeningStockDocumentEntity d, OpeningStockLineEntity l, Guid userId) => _db.StockMovements.Add(new StockMovementEntity { ProductId = l.ProductId, WarehouseId = d.WarehouseId, MovementDate = d.DocumentDate, Type = StockMovementType.OpeningStock, QuantityIn = l.Quantity, UnitCostBase = l.UnitCostBase, Reference = d.DocumentNumber, Note = d.Notes, PerformedByUserId = userId, OpeningStockDocumentId = d.Id, OpeningStockLineId = l.Id });

  private void AddAdjustmentMovement(StockAdjustmentDocumentEntity d, StockAdjustmentLineEntity l, decimal difference, decimal cost, Guid userId) => _db.StockMovements.Add(new StockMovementEntity { ProductId = l.ProductId, WarehouseId = d.WarehouseId, MovementDate = d.DocumentDate, Type = difference > 0 ? StockMovementType.PositiveAdjustment : StockMovementType.NegativeAdjustment, QuantityIn = Math.Max(difference, 0), QuantityOut = Math.Max(-difference, 0), UnitCostBase = cost, Reference = d.DocumentNumber, Note = $"{d.Reason}{(d.Notes is null ? string.Empty : $" — {d.Notes}")}", PerformedByUserId = userId, StockAdjustmentDocumentId = d.Id, StockAdjustmentLineId = l.Id });

  private void AddTransferMovements(WarehouseTransferDocumentEntity d, WarehouseTransferLineEntity l, decimal cost, Guid userId)
  {
    _db.StockMovements.Add(new StockMovementEntity { ProductId = l.ProductId, WarehouseId = d.SourceWarehouseId, MovementDate = d.DocumentDate, Type = StockMovementType.TransferOut, QuantityOut = l.Quantity, UnitCostBase = cost, Reference = d.DocumentNumber, Note = d.Notes, TransferId = d.Id, PerformedByUserId = userId, WarehouseTransferDocumentId = d.Id, WarehouseTransferLineId = l.Id });
    _db.StockMovements.Add(new StockMovementEntity { ProductId = l.ProductId, WarehouseId = d.DestinationWarehouseId, MovementDate = d.DocumentDate, Type = StockMovementType.TransferIn, QuantityIn = l.Quantity, UnitCostBase = cost, Reference = d.DocumentNumber, Note = d.Notes, TransferId = d.Id, PerformedByUserId = userId, WarehouseTransferDocumentId = d.Id, WarehouseTransferLineId = l.Id });
  }

  private async Task ValidateSingleWarehouseDocumentAsync(Guid branchId, Guid warehouseId, IEnumerable<Guid> productIds, CancellationToken ct)
  {
    await ValidateBranch(branchId, ct); var warehouse = await _db.Warehouses.AsNoTracking().SingleOrDefaultAsync(x => x.Id == warehouseId && x.IsActive, ct) ?? throw new BadRequestException(ErrorCodes.Inventory.WarehouseInactive, "Select an active warehouse."); if (warehouse.BranchId != branchId) throw new BadRequestException(ErrorCodes.Inventory.WarehouseBranchMismatch, "The selected warehouse does not belong to the document branch."); await ValidateProductsAsync(productIds, ct);
  }

  private async Task ValidateTransferHeaderAsync(Guid branchId, Guid sourceId, Guid destinationId, IEnumerable<Guid> productIds, CancellationToken ct)
  {
    if (sourceId == destinationId) throw new BadRequestException(ErrorCodes.Inventory.TransferSameWarehouse, "Source and destination warehouses must be different."); await ValidateBranch(branchId, ct); var warehouses = await _db.Warehouses.AsNoTracking().Where(x => (x.Id == sourceId || x.Id == destinationId) && x.IsActive).ToListAsync(ct); if (warehouses.Count != 2) throw new BadRequestException(ErrorCodes.Inventory.WarehouseInactive, "Select active source and destination warehouses."); if (warehouses.Single(x => x.Id == sourceId).BranchId != branchId) throw new BadRequestException(ErrorCodes.Inventory.WarehouseBranchMismatch, "The source warehouse does not belong to the document branch."); await ValidateProductsAsync(productIds, ct);
  }

  private async Task ValidateProductsAsync(IEnumerable<Guid> productIds, CancellationToken ct)
  {
    var ids = productIds.Distinct().ToList(); var count = await _db.Products.AsNoTracking().CountAsync(x => ids.Contains(x.Id) && x.IsActive && x.TrackInventory, ct); if (count != ids.Count) throw new BadRequestException(ErrorCodes.Inventory.ProductNotStockable, "Every line must use an active inventory-tracked product.");
  }

  private static void ValidateLines(IEnumerable<Guid> productIds)
  {
    var ids = productIds.ToList(); if (ids.Count == 0) throw new BadRequestException(ErrorCodes.Inventory.DocumentLinesRequired, "Add at least one product line."); if (ids.Any(x => x == Guid.Empty)) throw new BadRequestException(ErrorCodes.Inventory.ProductNotStockable, "Select a product for every line."); if (ids.Distinct().Count() != ids.Count) throw new BadRequestException(ErrorCodes.Inventory.DuplicateDocumentProduct, "A product can appear only once in a document.");
  }

  private static void ValidateOpeningLines(IEnumerable<(decimal Quantity, decimal UnitCost)> lines) { if (lines.Any(x => x.Quantity <= 0)) throw new BadRequestException(ErrorCodes.Inventory.DocumentLinesRequired, "Opening-stock quantities must be greater than zero."); if (lines.Any(x => x.UnitCost < 0)) throw new BadRequestException(ErrorCodes.Inventory.UnitCostRequired, "Opening-stock unit costs cannot be negative."); }
  private static void ValidateActualQuantities(IEnumerable<decimal> quantities) { if (quantities.Any(x => x < 0)) throw new BadRequestException(ErrorCodes.Inventory.InsufficientStock, "Actual quantity cannot be negative."); }
  private static void ValidateTransferQuantities(IEnumerable<decimal> quantities) { if (quantities.Any(x => x <= 0)) throw new BadRequestException(ErrorCodes.Inventory.InsufficientStock, "Transfer quantities must be greater than zero."); }

  private static void ValidateReason(string reason) { if (string.IsNullOrWhiteSpace(reason)) throw new BadRequestException(ErrorCodes.Inventory.AdjustmentReasonRequired, "Enter a meaningful adjustment reason."); }
  private static void EnsureDraft(InventoryDocumentStatus status) { if (status != InventoryDocumentStatus.Draft) throw new ConflictException(ErrorCodes.Inventory.DocumentNotDraft, "Posted inventory documents are immutable."); }
  private static NotFoundException DocumentNotFound() => new(ErrorCodes.Inventory.DocumentNotFound, "Inventory document not found.");
  private async Task SaveDocumentAsync(CancellationToken ct)
  {
    try { await _db.SaveChangesAsync(ct); }
    catch (DbUpdateException) { throw new ConflictException(ErrorCodes.Inventory.DocumentNumberConflict, "Could not allocate a unique document number. Try again."); }
  }

  private static async Task<string> NextDocumentNumberAsync(IQueryable<string> numbers, string prefix, CancellationToken ct)
  {
    var last = await numbers.OrderByDescending(x => x).FirstOrDefaultAsync(ct); var next = last is not null && int.TryParse(last[(last.LastIndexOf('-') + 1)..], out var value) ? value + 1 : 1; return $"{prefix}-{next:000000}";
  }

  private async Task<Dictionary<Guid, decimal>> GetQuantitiesAsync(Guid warehouseId, IEnumerable<Guid> productIds, CancellationToken ct)
  {
    var ids = productIds.Distinct().ToList(); return await _db.StockMovements.AsNoTracking().Where(x => x.WarehouseId == warehouseId && ids.Contains(x.ProductId)).GroupBy(x => x.ProductId).Select(g => new { ProductId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) }).ToDictionaryAsync(x => x.ProductId, x => x.Quantity, ct);
  }

  private async Task<decimal> QuantityAsync(Guid warehouseId, Guid? productId, CancellationToken ct) { var q = _db.StockMovements.AsNoTracking().Where(m => m.WarehouseId == warehouseId); if (productId is not null) q = q.Where(m => m.ProductId == productId); return await q.SumAsync(m => m.QuantityIn - m.QuantityOut, ct); }
  private async Task<decimal> ValuationCostAsync(Guid warehouseId, Guid productId, CancellationToken ct) { var local = await BalanceValueAsync(_db.StockMovements.AsNoTracking().Where(x => x.WarehouseId == warehouseId && x.ProductId == productId), ct); if (local.Quantity != 0) return local.Value / local.Quantity; var company = await BalanceValueAsync(_db.StockMovements.AsNoTracking().Where(x => x.ProductId == productId), ct); return company.Quantity == 0 ? 0 : company.Value / company.Quantity; }
  private static async Task<(decimal Quantity, decimal Value)> BalanceValueAsync(IQueryable<StockMovementEntity> q, CancellationToken ct) { var result = await q.GroupBy(_ => 1).Select(g => new { Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut), Value = g.Sum(x => x.QuantityIn * x.UnitCostBase - x.QuantityOut * x.UnitCostBase) }).SingleOrDefaultAsync(ct); return result is null ? default : (result.Quantity, result.Value); }
  private async Task<Dictionary<Guid, (decimal Quantity, decimal Value)>> GetProductBalancesAsync(IEnumerable<Guid> ids, Guid? warehouseId, CancellationToken ct) { var values = ids.ToList(); var q = _db.StockMovements.AsNoTracking().Where(m => values.Contains(m.ProductId)); if (warehouseId is not null) q = q.Where(m => m.WarehouseId == warehouseId); return await q.GroupBy(m => m.ProductId).Select(g => new { Id = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut), Value = g.Sum(x => x.QuantityIn * x.UnitCostBase - x.QuantityOut * x.UnitCostBase) }).ToDictionaryAsync(x => x.Id, x => (x.Quantity, x.Value), ct); }

  private IQueryable<OpeningStockDocumentEntity> OpeningStockQuery() => _db.OpeningStockDocuments.AsNoTracking().Include(x => x.Branch).Include(x => x.Warehouse).Include(x => x.CreatedByUser).Include(x => x.Lines).ThenInclude(x => x.Product).ThenInclude(x => x.UnitOfMeasure);
  private IQueryable<StockAdjustmentDocumentEntity> AdjustmentQuery() => _db.StockAdjustmentDocuments.AsNoTracking().Include(x => x.Branch).Include(x => x.Warehouse).Include(x => x.CreatedByUser).Include(x => x.Lines).ThenInclude(x => x.Product).ThenInclude(x => x.UnitOfMeasure);
  private IQueryable<WarehouseTransferDocumentEntity> TransferQuery() => _db.WarehouseTransferDocuments.AsNoTracking().Include(x => x.Branch).Include(x => x.SourceWarehouse).Include(x => x.DestinationWarehouse).Include(x => x.CreatedByUser).Include(x => x.Lines).ThenInclude(x => x.Product).ThenInclude(x => x.UnitOfMeasure);

  private static OpeningStockResponse ToOpeningStock(OpeningStockDocumentEntity d) { var lines = d.Lines.OrderBy(x => x.Product.SKU).Select(x => new OpeningStockLineResponse(x.Id, x.ProductId, x.Product.Name, x.Product.SKU, x.Product.UnitOfMeasure.Code, x.Quantity, x.UnitCostBase, x.Quantity * x.UnitCostBase)).ToList(); return new(d.Id, d.DocumentNumber, d.DocumentDate, d.BranchId, d.Branch.Code, d.Branch.Name, d.WarehouseId, d.Warehouse.Code, d.Warehouse.Name, d.Status, d.Notes, d.CreatedByUserId, d.CreatedByUser.Username, d.CreatedAtUtc, d.UpdatedAtUtc, d.PostedAtUtc, lines.Count, lines.Sum(x => x.LineValueBase), lines); }
  private static StockAdjustmentResponse ToAdjustment(StockAdjustmentDocumentEntity d, IReadOnlyDictionary<Guid, decimal>? current) { var lines = d.Lines.OrderBy(x => x.Product.SKU).Select(x => { var system = current?.GetValueOrDefault(x.ProductId) ?? x.SystemQuantity; return new StockAdjustmentLineResponse(x.Id, x.ProductId, x.Product.Name, x.Product.SKU, x.Product.UnitOfMeasure.Code, system, x.ActualQuantity, x.ActualQuantity - system); }).ToList(); return new(d.Id, d.DocumentNumber, d.DocumentDate, d.BranchId, d.Branch.Code, d.Branch.Name, d.WarehouseId, d.Warehouse.Code, d.Warehouse.Name, d.Reason, d.Notes, d.Status, d.CreatedByUserId, d.CreatedByUser.Username, d.CreatedAtUtc, d.UpdatedAtUtc, d.PostedAtUtc, lines.Count, lines); }
  private static WarehouseTransferResponse ToTransfer(WarehouseTransferDocumentEntity d, IReadOnlyDictionary<Guid, decimal>? available) { var lines = d.Lines.OrderBy(x => x.Product.SKU).Select(x => new WarehouseTransferLineResponse(x.Id, x.ProductId, x.Product.Name, x.Product.SKU, x.Product.UnitOfMeasure.Code, available?.GetValueOrDefault(x.ProductId) ?? x.AvailableSourceQuantity, x.Quantity)).ToList(); return new(d.Id, d.DocumentNumber, d.DocumentDate, d.BranchId, d.Branch.Code, d.Branch.Name, d.SourceWarehouseId, d.SourceWarehouse.Code, d.SourceWarehouse.Name, d.DestinationWarehouseId, d.DestinationWarehouse.Code, d.DestinationWarehouse.Name, d.Notes, d.Status, d.CreatedByUserId, d.CreatedByUser.Username, d.CreatedAtUtc, d.UpdatedAtUtc, d.PostedAtUtc, lines.Count, lines); }

  private static StockMovementResponse ToMovement(StockMovementEntity m)
  {
    InventoryDocumentType? documentType = m.OpeningStockDocumentId is not null ? InventoryDocumentType.OpeningStock : m.StockAdjustmentDocumentId is not null ? InventoryDocumentType.Adjustment : m.WarehouseTransferDocumentId is not null ? InventoryDocumentType.Transfer : null; var documentId = m.OpeningStockDocumentId ?? m.StockAdjustmentDocumentId ?? m.WarehouseTransferDocumentId; var lineId = m.OpeningStockLineId ?? m.StockAdjustmentLineId ?? m.WarehouseTransferLineId; var number = m.OpeningStockDocument?.DocumentNumber ?? m.StockAdjustmentDocument?.DocumentNumber ?? m.WarehouseTransferDocument?.DocumentNumber;
    return new(m.Id, m.MovementDate, m.Type, m.ProductId, m.Product.Name, m.Product.SKU, m.Product.UnitOfMeasure.Code, m.WarehouseId, m.Warehouse.Code, m.Warehouse.Name, m.Warehouse.BranchId, m.Warehouse.Branch.Name, m.QuantityIn, m.QuantityOut, m.UnitCostBase, m.Reference, m.Note, documentType, documentId, lineId, number, m.PerformedByUserId, m.PerformedByUser.Username, m.CreatedAtUtc);
  }

  private static IQueryable<OpeningStockDocumentEntity> FilterDocuments(IQueryable<OpeningStockDocumentEntity> query, OpeningStockListQuery q) { if (!string.IsNullOrWhiteSpace(q.DocumentNumber)) { var s = q.DocumentNumber.Trim().ToLower(); query = query.Where(x => x.DocumentNumber.ToLower().Contains(s)); } if (q.FromDate is not null) query = query.Where(x => x.DocumentDate >= q.FromDate); if (q.ToDate is not null) query = query.Where(x => x.DocumentDate <= q.ToDate); if (q.BranchId is not null) query = query.Where(x => x.BranchId == q.BranchId); if (q.Status is not null) query = query.Where(x => x.Status == q.Status); return query; }
  private static IQueryable<StockAdjustmentDocumentEntity> FilterDocuments(IQueryable<StockAdjustmentDocumentEntity> query, StockAdjustmentListQuery q) { if (!string.IsNullOrWhiteSpace(q.DocumentNumber)) { var s = q.DocumentNumber.Trim().ToLower(); query = query.Where(x => x.DocumentNumber.ToLower().Contains(s)); } if (q.FromDate is not null) query = query.Where(x => x.DocumentDate >= q.FromDate); if (q.ToDate is not null) query = query.Where(x => x.DocumentDate <= q.ToDate); if (q.BranchId is not null) query = query.Where(x => x.BranchId == q.BranchId); if (q.Status is not null) query = query.Where(x => x.Status == q.Status); return query; }
  private static IQueryable<WarehouseTransferDocumentEntity> FilterDocuments(IQueryable<WarehouseTransferDocumentEntity> query, WarehouseTransferListQuery q) { if (!string.IsNullOrWhiteSpace(q.DocumentNumber)) { var s = q.DocumentNumber.Trim().ToLower(); query = query.Where(x => x.DocumentNumber.ToLower().Contains(s)); } if (q.FromDate is not null) query = query.Where(x => x.DocumentDate >= q.FromDate); if (q.ToDate is not null) query = query.Where(x => x.DocumentDate <= q.ToDate); if (q.BranchId is not null) query = query.Where(x => x.BranchId == q.BranchId); if (q.Status is not null) query = query.Where(x => x.Status == q.Status); return query; }

  private async Task ValidateProductReferences(Guid categoryId, Guid unitId, CancellationToken ct) { if (!await _db.ProductCategories.AnyAsync(x => x.Id == categoryId && x.IsActive, ct)) throw new BadRequestException(ErrorCodes.Inventory.CategoryInvalid, "Select an active category."); if (!await _db.UnitsOfMeasure.AnyAsync(x => x.Id == unitId && x.IsActive, ct)) throw new BadRequestException(ErrorCodes.Inventory.UnitInvalid, "Select an active unit."); }
  private async Task EnsureProductCodes(Guid? id, string sku, string? barcode, CancellationToken ct) { var s = Code(sku); if (await _db.Products.AnyAsync(p => p.SKU == s && p.Id != id, ct)) throw new ConflictException(ErrorCodes.Inventory.SkuTaken, "That SKU is already in use."); var b = Trim(barcode); if (b is not null && await _db.Products.AnyAsync(p => p.Barcode == b && p.Id != id, ct)) throw new ConflictException(ErrorCodes.Inventory.BarcodeTaken, "That barcode is already in use."); }
  private async Task ValidateBranch(Guid id, CancellationToken ct) { if (!await _db.Branches.AnyAsync(b => b.Id == id && b.IsActive, ct)) throw new BadRequestException(ErrorCodes.Inventory.BranchInvalid, "Select an active branch."); }
  private async Task<ProductCategoryEntity> GetCategoryEntity(Guid id, CancellationToken ct) => await _db.ProductCategories.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException(ErrorCodes.Inventory.CategoryNotFound, "Category not found.");
  private async Task<UnitOfMeasureEntity> GetUnitEntity(Guid id, CancellationToken ct) => await _db.UnitsOfMeasure.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException(ErrorCodes.Inventory.UnitNotFound, "Unit not found.");
  private static IQueryable<ProductCategoryEntity> Filter(IQueryable<ProductCategoryEntity> q, MasterListQuery r) { if (!string.IsNullOrWhiteSpace(r.Search)) { var s = r.Search.Trim().ToLower(); q = q.Where(x => x.Name.ToLower().Contains(s)); } if (r.IsActive is not null) q = q.Where(x => x.IsActive == r.IsActive); return q; }
  private static IQueryable<UnitOfMeasureEntity> Filter(IQueryable<UnitOfMeasureEntity> q, MasterListQuery r) { if (!string.IsNullOrWhiteSpace(r.Search)) { var s = r.Search.Trim().ToLower(); q = q.Where(x => x.Name.ToLower().Contains(s) || x.Code.ToLower().Contains(s)); } if (r.IsActive is not null) q = q.Where(x => x.IsActive == r.IsActive); return q; }
  private static void Apply(ProductEntity x, CreateProductRequest r) { x.Name = r.Name.Trim(); x.SKU = Code(r.SKU); x.Barcode = Trim(r.Barcode); x.CategoryId = r.CategoryId; x.UnitOfMeasureId = r.UnitOfMeasureId; x.Purpose = r.Purpose; x.TrackInventory = r.TrackInventory; x.IsActive = r.IsActive; x.Description = Trim(r.Description); x.ImageReference = Trim(r.ImageReference); }
  private static void Apply(ProductEntity x, UpdateProductRequest r) => Apply(x, new CreateProductRequest(r.Name, r.SKU, r.Barcode, r.CategoryId, r.UnitOfMeasureId, r.Purpose, r.TrackInventory, r.IsActive, r.Description, r.ImageReference));
  private static ProductResponse ToProduct(ProductEntity x, (decimal Quantity, decimal Value) b) => new(x.Id, x.Name, x.SKU, x.Barcode, x.CategoryId, x.Category.Name, x.UnitOfMeasureId, x.UnitOfMeasure.Code, x.Purpose, x.TrackInventory, x.IsActive, x.Description, x.ImageReference, b.Quantity, b.Quantity == 0 ? 0 : b.Value / b.Quantity, b.Value);
  private static WarehouseResponse ToWarehouse(WarehouseEntity x) => new(x.Id, x.Code, x.Name, x.BranchId, x.Branch.Code, x.Branch.Name, x.IsActive);
  private static string Code(string x) => x.Trim().ToUpperInvariant();
  private static string? Trim(string? x) => string.IsNullOrWhiteSpace(x) ? null : x.Trim();
}
