using System.Security.Claims;
using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Inventory;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/inventory")]
[Authorize(Roles = "SuperAdmin,Manager")]
public sealed class InventoryController : ControllerBase
{
  private readonly InventoryService _service;

  public InventoryController(InventoryService service)
  {
    _service = service;
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  [HttpGet("categories")]
  [ProducesResponseType(typeof(ApiResponse<List<CategoryResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCategories(
    [FromQuery] MasterListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetCategoriesAsync(query, ct);

    return Ok(
      ApiResponse<List<CategoryResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  [HttpPost("categories")]
  [ProducesResponseType(typeof(ApiResponse<CategoryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateCategory(
    [FromBody] CreateCategoryRequest request,
    CancellationToken ct)
  {
    var result = await _service.CreateCategoryAsync(request, ct);

    return Ok(ApiResponse<CategoryResponse>.Ok(result));
  }

  [HttpPut("categories/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<CategoryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateCategory(
    Guid id,
    [FromBody] UpdateCategoryRequest request,
    CancellationToken ct)
  {
    var result = await _service.UpdateCategoryAsync(id, request, ct);

    return Ok(ApiResponse<CategoryResponse>.Ok(result));
  }

  [HttpDelete("categories/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteCategory(
    Guid id,
    CancellationToken ct)
  {
    await _service.DeleteCategoryAsync(id, ct);

    return NoContent();
  }

  // ---------------------------------------------------------------------------
  // Subcategories
  // ---------------------------------------------------------------------------

  [HttpGet("subcategories")]
  [ProducesResponseType(typeof(ApiResponse<List<SubcategoryResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSubcategories(
    [FromQuery] SubcategoryListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetSubcategoriesAsync(query, ct);

    return Ok(
      ApiResponse<List<SubcategoryResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  [HttpPost("subcategories")]
  [ProducesResponseType(typeof(ApiResponse<SubcategoryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateSubcategory(
    [FromBody] CreateSubcategoryRequest request,
    CancellationToken ct)
  {
    var result = await _service.CreateSubcategoryAsync(request, ct);

    return Ok(ApiResponse<SubcategoryResponse>.Ok(result));
  }

  [HttpPut("subcategories/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<SubcategoryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateSubcategory(
    Guid id,
    [FromBody] UpdateSubcategoryRequest request,
    CancellationToken ct)
  {
    var result = await _service.UpdateSubcategoryAsync(id, request, ct);

    return Ok(ApiResponse<SubcategoryResponse>.Ok(result));
  }

  [HttpDelete("subcategories/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteSubcategory(
    Guid id,
    CancellationToken ct)
  {
    await _service.DeleteSubcategoryAsync(id, ct);

    return NoContent();
  }

  // ---------------------------------------------------------------------------
  // Units
  // ---------------------------------------------------------------------------

  [HttpGet("units")]
  [ProducesResponseType(typeof(ApiResponse<List<UnitResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetUnits(
    [FromQuery] MasterListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetUnitsAsync(query, ct);

    return Ok(
      ApiResponse<List<UnitResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  [HttpPost("units")]
  [ProducesResponseType(typeof(ApiResponse<UnitResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateUnit(
    [FromBody] CreateUnitRequest request,
    CancellationToken ct)
  {
    var result = await _service.CreateUnitAsync(request, ct);

    return Ok(ApiResponse<UnitResponse>.Ok(result));
  }

  [HttpPut("units/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<UnitResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateUnit(
    Guid id,
    [FromBody] UpdateUnitRequest request,
    CancellationToken ct)
  {
    var result = await _service.UpdateUnitAsync(id, request, ct);

    return Ok(ApiResponse<UnitResponse>.Ok(result));
  }

  [HttpDelete("units/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteUnit(
    Guid id,
    CancellationToken ct)
  {
    await _service.DeleteUnitAsync(id, ct);

    return NoContent();
  }

  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------

  [HttpGet("products")]
  [ProducesResponseType(typeof(ApiResponse<List<ProductResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetProducts(
    [FromQuery] ProductListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetProductsAsync(query, ct);

    return Ok(
      ApiResponse<List<ProductResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  [HttpPost("products")]
  [ProducesResponseType(typeof(ApiResponse<ProductResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateProduct(
    [FromBody] CreateProductRequest request,
    CancellationToken ct)
  {
    var result = await _service.CreateProductAsync(request, ct);

    return Ok(ApiResponse<ProductResponse>.Ok(result));
  }

  [HttpGet("products/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ProductResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetProduct(
    Guid id,
    CancellationToken ct)
  {
    var result = await _service.GetProductAsync(id, ct);

    return Ok(ApiResponse<ProductResponse>.Ok(result));
  }

  [HttpPut("products/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ProductResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateProduct(
    Guid id,
    [FromBody] UpdateProductRequest request,
    CancellationToken ct)
  {
    var result = await _service.UpdateProductAsync(id, request, ct);

    return Ok(ApiResponse<ProductResponse>.Ok(result));
  }

  [HttpDelete("products/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteProduct(
    Guid id,
    CancellationToken ct)
  {
    await _service.DeleteProductAsync(id, ct);

    return NoContent();
  }

  // ---------------------------------------------------------------------------
  // Warehouses
  // ---------------------------------------------------------------------------

  [HttpGet("warehouses")]
  [ProducesResponseType(typeof(ApiResponse<List<WarehouseResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetWarehouses(
    [FromQuery] WarehouseListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetWarehousesAsync(query, ct);

    return Ok(
      ApiResponse<List<WarehouseResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  [HttpPost("warehouses")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateWarehouse(
    [FromBody] CreateWarehouseRequest request,
    CancellationToken ct)
  {
    var result = await _service.CreateWarehouseAsync(request, ct);

    return Ok(ApiResponse<WarehouseResponse>.Ok(result));
  }

  [HttpPut("warehouses/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateWarehouse(
    Guid id,
    [FromBody] UpdateWarehouseRequest request,
    CancellationToken ct)
  {
    var result = await _service.UpdateWarehouseAsync(id, request, ct);

    return Ok(ApiResponse<WarehouseResponse>.Ok(result));
  }

  [HttpDelete("warehouses/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteWarehouse(
    Guid id,
    CancellationToken ct)
  {
    await _service.DeleteWarehouseAsync(id, ct);

    return NoContent();
  }

  // ---------------------------------------------------------------------------
  // Stock Balances
  // ---------------------------------------------------------------------------

  [HttpGet("balances")]
  [ProducesResponseType(typeof(ApiResponse<List<StockBalanceResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetBalances(
    [FromQuery] StockBalanceListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetBalancesAsync(query, ct);

    return Ok(
      ApiResponse<List<StockBalanceResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  // ---------------------------------------------------------------------------
  // Stock Movements
  // ---------------------------------------------------------------------------

  [HttpGet("movements")]
  [ProducesResponseType(typeof(ApiResponse<List<StockMovementResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetMovements(
    [FromQuery] StockMovementListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetMovementsAsync(query, ct);

    return Ok(
      ApiResponse<List<StockMovementResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  // ---------------------------------------------------------------------------
  // Opening Stock
  // ---------------------------------------------------------------------------

  [HttpGet("opening-stock")]
  [ProducesResponseType(
    typeof(ApiResponse<List<OpeningStockListResponse>>),
    StatusCodes.Status200OK)]
  public async Task<IActionResult> GetOpeningStocks(
    [FromQuery] OpeningStockListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetOpeningStocksAsync(query, ct);

    return Ok(
      ApiResponse<List<OpeningStockListResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  [HttpGet("opening-stock/{id:guid}", Name = nameof(GetOpeningStock))]
  [ProducesResponseType(typeof(ApiResponse<OpeningStockResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetOpeningStock(
    Guid id,
    CancellationToken ct)
  {
    var result = await _service.GetOpeningStockAsync(id, ct);

    return Ok(ApiResponse<OpeningStockResponse>.Ok(result));
  }

  [HttpPost("opening-stock")]
  [ProducesResponseType(typeof(ApiResponse<OpeningStockResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateOpeningStock(
    [FromBody] OpeningStockDraftRequest request,
    CancellationToken ct)
  {
    var result = await _service.CreateOpeningStockAsync(
      request,
      GetUserId(),
      ct);

    return CreatedAtAction(
      nameof(GetOpeningStock),
      new
      {
        version = GetApiVersion(),
        id = result.Id
      },
      ApiResponse<OpeningStockResponse>.Ok(result));
  }

  [HttpPut("opening-stock/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<OpeningStockResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateOpeningStock(
    Guid id,
    [FromBody] OpeningStockDraftRequest request,
    CancellationToken ct)
  {
    var result = await _service.UpdateOpeningStockAsync(id, request, ct);

    return Ok(ApiResponse<OpeningStockResponse>.Ok(result));
  }

  [HttpDelete("opening-stock/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteOpeningStock(
    Guid id,
    CancellationToken ct)
  {
    await _service.DeleteOpeningStockAsync(id, ct);

    return NoContent();
  }

  [HttpPost("opening-stock/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<OpeningStockResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostOpeningStock(
    Guid id,
    CancellationToken ct)
  {
    var result = await _service.PostOpeningStockAsync(
      id,
      GetUserId(),
      ct);

    return Ok(ApiResponse<OpeningStockResponse>.Ok(result));
  }

  // ---------------------------------------------------------------------------
  // Stock Adjustments
  // ---------------------------------------------------------------------------

  [HttpGet("adjustments")]
  [ProducesResponseType(
    typeof(ApiResponse<List<StockAdjustmentListResponse>>),
    StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAdjustments(
    [FromQuery] StockAdjustmentListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetAdjustmentsAsync(query, ct);

    return Ok(
      ApiResponse<List<StockAdjustmentListResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  [HttpGet("adjustments/{id:guid}", Name = nameof(GetAdjustment))]
  [ProducesResponseType(typeof(ApiResponse<StockAdjustmentResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetAdjustment(
    Guid id,
    CancellationToken ct)
  {
    var result = await _service.GetAdjustmentAsync(id, ct);

    return Ok(ApiResponse<StockAdjustmentResponse>.Ok(result));
  }

  [HttpPost("adjustments")]
  [ProducesResponseType(typeof(ApiResponse<StockAdjustmentResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateAdjustment(
    [FromBody] StockAdjustmentDraftRequest request,
    CancellationToken ct)
  {
    var result = await _service.CreateAdjustmentAsync(
      request,
      GetUserId(),
      ct);

    return CreatedAtAction(
      nameof(GetAdjustment),
      new
      {
        version = GetApiVersion(),
        id = result.Id
      },
      ApiResponse<StockAdjustmentResponse>.Ok(result));
  }

  [HttpPut("adjustments/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<StockAdjustmentResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateAdjustment(
    Guid id,
    [FromBody] StockAdjustmentDraftRequest request,
    CancellationToken ct)
  {
    var result = await _service.UpdateAdjustmentAsync(id, request, ct);

    return Ok(ApiResponse<StockAdjustmentResponse>.Ok(result));
  }

  [HttpDelete("adjustments/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteAdjustment(
    Guid id,
    CancellationToken ct)
  {
    await _service.DeleteAdjustmentAsync(id, ct);

    return NoContent();
  }

  [HttpPost("adjustments/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<StockAdjustmentResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostAdjustment(
    Guid id,
    CancellationToken ct)
  {
    var result = await _service.PostAdjustmentAsync(
      id,
      GetUserId(),
      ct);

    return Ok(ApiResponse<StockAdjustmentResponse>.Ok(result));
  }

  // ---------------------------------------------------------------------------
  // Warehouse Transfers
  // ---------------------------------------------------------------------------

  [HttpGet("transfers")]
  [ProducesResponseType(
    typeof(ApiResponse<List<WarehouseTransferListResponse>>),
    StatusCodes.Status200OK)]
  public async Task<IActionResult> GetTransfers(
    [FromQuery] WarehouseTransferListQuery query,
    CancellationToken ct)
  {
    var result = await _service.GetTransfersAsync(query, ct);

    return Ok(
      ApiResponse<List<WarehouseTransferListResponse>>.Ok(
        result.Items,
        result.ToMetadata()));
  }

  [HttpGet("transfers/{id:guid}", Name = nameof(GetTransfer))]
  [ProducesResponseType(typeof(ApiResponse<WarehouseTransferResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetTransfer(
    Guid id,
    CancellationToken ct)
  {
    var result = await _service.GetTransferAsync(id, ct);

    return Ok(ApiResponse<WarehouseTransferResponse>.Ok(result));
  }

  [HttpPost("transfers")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseTransferResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateTransfer(
    [FromBody] WarehouseTransferDraftRequest request,
    CancellationToken ct)
  {
    var result = await _service.CreateTransferAsync(
      request,
      GetUserId(),
      ct);

    return CreatedAtAction(
      nameof(GetTransfer),
      new
      {
        version = GetApiVersion(),
        id = result.Id
      },
      ApiResponse<WarehouseTransferResponse>.Ok(result));
  }

  [HttpPut("transfers/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseTransferResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateTransfer(
    Guid id,
    [FromBody] WarehouseTransferDraftRequest request,
    CancellationToken ct)
  {
    var result = await _service.UpdateTransferAsync(id, request, ct);

    return Ok(ApiResponse<WarehouseTransferResponse>.Ok(result));
  }

  [HttpDelete("transfers/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteTransfer(
    Guid id,
    CancellationToken ct)
  {
    await _service.DeleteTransferAsync(id, ct);

    return NoContent();
  }

  [HttpPost("transfers/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseTransferResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostTransfer(
    Guid id,
    CancellationToken ct)
  {
    var result = await _service.PostTransferAsync(
      id,
      GetUserId(),
      ct);

    return Ok(ApiResponse<WarehouseTransferResponse>.Ok(result));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private Guid GetUserId()
  {
    var value =
      User.FindFirstValue(ClaimTypes.NameIdentifier) ??
      User.FindFirstValue("sub");

    if (!Guid.TryParse(value, out var userId))
    {
      throw new UnauthorizedException(
        ErrorCodes.Common.Unauthorized,
        "Invalid token subject.");
    }

    return userId;
  }

  private string GetApiVersion()
  {
    return RouteData.Values["version"]?.ToString() ?? "1.0";
  }
}
