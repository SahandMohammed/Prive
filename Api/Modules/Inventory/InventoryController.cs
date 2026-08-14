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
  public InventoryController(InventoryService service) => _service = service;

  [HttpGet("categories")]
  [ProducesResponseType(typeof(ApiResponse<List<CategoryResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Categories([FromQuery] MasterListQuery q, CancellationToken ct) { var x = await _service.GetCategoriesAsync(q, ct); return Ok(ApiResponse<List<CategoryResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpPost("categories")]
  [ProducesResponseType(typeof(ApiResponse<CategoryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateCategory(CreateCategoryRequest r, CancellationToken ct) => Ok(ApiResponse<CategoryResponse>.Ok(await _service.CreateCategoryAsync(r, ct)));

  [HttpPut("categories/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<CategoryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateCategory(Guid id, UpdateCategoryRequest r, CancellationToken ct) => Ok(ApiResponse<CategoryResponse>.Ok(await _service.UpdateCategoryAsync(id, r, ct)));

  [HttpDelete("categories/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct) { await _service.DeleteCategoryAsync(id, ct); return NoContent(); }

  [HttpGet("units")]
  [ProducesResponseType(typeof(ApiResponse<List<UnitResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Units([FromQuery] MasterListQuery q, CancellationToken ct) { var x = await _service.GetUnitsAsync(q, ct); return Ok(ApiResponse<List<UnitResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpPost("units")]
  [ProducesResponseType(typeof(ApiResponse<UnitResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateUnit(CreateUnitRequest r, CancellationToken ct) => Ok(ApiResponse<UnitResponse>.Ok(await _service.CreateUnitAsync(r, ct)));

  [HttpPut("units/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<UnitResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateUnit(Guid id, UpdateUnitRequest r, CancellationToken ct) => Ok(ApiResponse<UnitResponse>.Ok(await _service.UpdateUnitAsync(id, r, ct)));

  [HttpDelete("units/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteUnit(Guid id, CancellationToken ct) { await _service.DeleteUnitAsync(id, ct); return NoContent(); }

  [HttpGet("products")]
  [ProducesResponseType(typeof(ApiResponse<List<ProductResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Products([FromQuery] ProductListQuery q, CancellationToken ct) { var x = await _service.GetProductsAsync(q, ct); return Ok(ApiResponse<List<ProductResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpPost("products")]
  [ProducesResponseType(typeof(ApiResponse<ProductResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateProduct(CreateProductRequest r, CancellationToken ct) => Ok(ApiResponse<ProductResponse>.Ok(await _service.CreateProductAsync(r, ct)));

  [HttpPut("products/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ProductResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateProduct(Guid id, UpdateProductRequest r, CancellationToken ct) => Ok(ApiResponse<ProductResponse>.Ok(await _service.UpdateProductAsync(id, r, ct)));

  [HttpDelete("products/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteProduct(Guid id, CancellationToken ct) { await _service.DeleteProductAsync(id, ct); return NoContent(); }

  [HttpGet("warehouses")]
  [ProducesResponseType(typeof(ApiResponse<List<WarehouseResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Warehouses([FromQuery] WarehouseListQuery q, CancellationToken ct) { var x = await _service.GetWarehousesAsync(q, ct); return Ok(ApiResponse<List<WarehouseResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpPost("warehouses")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> CreateWarehouse(CreateWarehouseRequest r, CancellationToken ct) => Ok(ApiResponse<WarehouseResponse>.Ok(await _service.CreateWarehouseAsync(r, ct)));

  [HttpPut("warehouses/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateWarehouse(Guid id, UpdateWarehouseRequest r, CancellationToken ct) => Ok(ApiResponse<WarehouseResponse>.Ok(await _service.UpdateWarehouseAsync(id, r, ct)));

  [HttpDelete("warehouses/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteWarehouse(Guid id, CancellationToken ct) { await _service.DeleteWarehouseAsync(id, ct); return NoContent(); }

  [HttpGet("balances")]
  [ProducesResponseType(typeof(ApiResponse<List<StockBalanceResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Balances([FromQuery] StockBalanceListQuery q, CancellationToken ct) { var x = await _service.GetBalancesAsync(q, ct); return Ok(ApiResponse<List<StockBalanceResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpGet("movements")]
  [ProducesResponseType(typeof(ApiResponse<List<StockMovementResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Movements([FromQuery] StockMovementListQuery q, CancellationToken ct) { var x = await _service.GetMovementsAsync(q, ct); return Ok(ApiResponse<List<StockMovementResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpGet("opening-stock")]
  [ProducesResponseType(typeof(ApiResponse<List<OpeningStockListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> OpeningStocks([FromQuery] OpeningStockListQuery q, CancellationToken ct) { var x = await _service.GetOpeningStocksAsync(q, ct); return Ok(ApiResponse<List<OpeningStockListResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpGet("opening-stock/{id:guid}", Name = nameof(GetOpeningStock))]
  [ProducesResponseType(typeof(ApiResponse<OpeningStockResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetOpeningStock(Guid id, CancellationToken ct) => Ok(ApiResponse<OpeningStockResponse>.Ok(await _service.GetOpeningStockAsync(id, ct)));

  [HttpPost("opening-stock")]
  [ProducesResponseType(typeof(ApiResponse<OpeningStockResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateOpeningStock(OpeningStockDraftRequest r, CancellationToken ct) { var d = await _service.CreateOpeningStockAsync(r, UserId(), ct); return CreatedAtAction(nameof(GetOpeningStock), new { id = d.Id, version = Version() }, ApiResponse<OpeningStockResponse>.Ok(d)); }

  [HttpPut("opening-stock/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<OpeningStockResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateOpeningStock(Guid id, OpeningStockDraftRequest r, CancellationToken ct) => Ok(ApiResponse<OpeningStockResponse>.Ok(await _service.UpdateOpeningStockAsync(id, r, ct)));

  [HttpDelete("opening-stock/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteOpeningStock(Guid id, CancellationToken ct) { await _service.DeleteOpeningStockAsync(id, ct); return NoContent(); }

  [HttpPost("opening-stock/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<OpeningStockResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostOpeningStock(Guid id, CancellationToken ct) => Ok(ApiResponse<OpeningStockResponse>.Ok(await _service.PostOpeningStockAsync(id, UserId(), ct)));

  [HttpGet("adjustments")]
  [ProducesResponseType(typeof(ApiResponse<List<StockAdjustmentListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Adjustments([FromQuery] StockAdjustmentListQuery q, CancellationToken ct) { var x = await _service.GetAdjustmentsAsync(q, ct); return Ok(ApiResponse<List<StockAdjustmentListResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpGet("adjustments/{id:guid}", Name = nameof(GetAdjustment))]
  [ProducesResponseType(typeof(ApiResponse<StockAdjustmentResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAdjustment(Guid id, CancellationToken ct) => Ok(ApiResponse<StockAdjustmentResponse>.Ok(await _service.GetAdjustmentAsync(id, ct)));

  [HttpPost("adjustments")]
  [ProducesResponseType(typeof(ApiResponse<StockAdjustmentResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateAdjustment(StockAdjustmentDraftRequest r, CancellationToken ct) { var d = await _service.CreateAdjustmentAsync(r, UserId(), ct); return CreatedAtAction(nameof(GetAdjustment), new { id = d.Id, version = Version() }, ApiResponse<StockAdjustmentResponse>.Ok(d)); }

  [HttpPut("adjustments/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<StockAdjustmentResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateAdjustment(Guid id, StockAdjustmentDraftRequest r, CancellationToken ct) => Ok(ApiResponse<StockAdjustmentResponse>.Ok(await _service.UpdateAdjustmentAsync(id, r, ct)));

  [HttpDelete("adjustments/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteAdjustment(Guid id, CancellationToken ct) { await _service.DeleteAdjustmentAsync(id, ct); return NoContent(); }

  [HttpPost("adjustments/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<StockAdjustmentResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostAdjustment(Guid id, CancellationToken ct) => Ok(ApiResponse<StockAdjustmentResponse>.Ok(await _service.PostAdjustmentAsync(id, UserId(), ct)));

  [HttpGet("transfers")]
  [ProducesResponseType(typeof(ApiResponse<List<WarehouseTransferListResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Transfers([FromQuery] WarehouseTransferListQuery q, CancellationToken ct) { var x = await _service.GetTransfersAsync(q, ct); return Ok(ApiResponse<List<WarehouseTransferListResponse>>.Ok(x.Items, x.ToMetadata())); }

  [HttpGet("transfers/{id:guid}", Name = nameof(GetTransfer))]
  [ProducesResponseType(typeof(ApiResponse<WarehouseTransferResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetTransfer(Guid id, CancellationToken ct) => Ok(ApiResponse<WarehouseTransferResponse>.Ok(await _service.GetTransferAsync(id, ct)));

  [HttpPost("transfers")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseTransferResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateTransfer(WarehouseTransferDraftRequest r, CancellationToken ct) { var d = await _service.CreateTransferAsync(r, UserId(), ct); return CreatedAtAction(nameof(GetTransfer), new { id = d.Id, version = Version() }, ApiResponse<WarehouseTransferResponse>.Ok(d)); }

  [HttpPut("transfers/{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseTransferResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateTransfer(Guid id, WarehouseTransferDraftRequest r, CancellationToken ct) => Ok(ApiResponse<WarehouseTransferResponse>.Ok(await _service.UpdateTransferAsync(id, r, ct)));

  [HttpDelete("transfers/{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteTransfer(Guid id, CancellationToken ct) { await _service.DeleteTransferAsync(id, ct); return NoContent(); }

  [HttpPost("transfers/{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<WarehouseTransferResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> PostTransfer(Guid id, CancellationToken ct) => Ok(ApiResponse<WarehouseTransferResponse>.Ok(await _service.PostTransferAsync(id, UserId(), ct)));

  private Guid UserId() => Guid.TryParse(User.FindFirstValue("sub"), out var id) ? id : throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
  private string Version() => RouteData.Values["version"]?.ToString() ?? "1";
}
