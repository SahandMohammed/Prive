using System.Security.Claims;
using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Expenses;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/expenses")]
[Authorize(Roles = "SuperAdmin,Manager,Owner,Cashier")]
public sealed class ExpensesController : ControllerBase
{
  private const string Administrators = "SuperAdmin,Manager,Owner";
  private readonly ExpensesService _service;

  public ExpensesController(ExpensesService service)
  {
    _service = service;
  }

  // ---------------------------------------------------------------------------
  // Expense Categories
  // ---------------------------------------------------------------------------

  [HttpGet("categories")]
  [ProducesResponseType(typeof(ApiResponse<List<ExpenseCategoryResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCategories([FromQuery] ExpenseCategoryListQuery query, CancellationToken ct)
  {
    var result = await _service.GetCategoriesAsync(query, ct);
    return Ok(ApiResponse<List<ExpenseCategoryResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("categories/options")]
  [ProducesResponseType(typeof(ApiResponse<List<ExpenseCategoryOptionResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetCategoryOptions(CancellationToken ct)
  {
    var result = await _service.GetCategoryOptionsAsync(ct);
    return Ok(ApiResponse<List<ExpenseCategoryOptionResponse>>.Ok(result));
  }

  [HttpGet("categories/{id:guid}", Name = nameof(GetCategoryById))]
  [ProducesResponseType(typeof(ApiResponse<ExpenseCategoryResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetCategoryById(Guid id, CancellationToken ct)
  {
    var result = await _service.GetCategoryByIdAsync(id, ct);
    return Ok(ApiResponse<ExpenseCategoryResponse>.Ok(result));
  }

  [HttpPost("categories")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<ExpenseCategoryResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateCategory([FromBody] ExpenseCategoryRequest request, CancellationToken ct)
  {
    var category = await _service.CreateCategoryAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id, version }, ApiResponse<ExpenseCategoryResponse>.Ok(category));
  }

  [HttpPut("categories/{id:guid}")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(typeof(ApiResponse<ExpenseCategoryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] ExpenseCategoryRequest request, CancellationToken ct)
  {
    var category = await _service.UpdateCategoryAsync(id, request, ct);
    return Ok(ApiResponse<ExpenseCategoryResponse>.Ok(category));
  }

  [HttpDelete("categories/{id:guid}")]
  [Authorize(Roles = Administrators)]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
  {
    await _service.DeleteCategoryAsync(id, ct);
    return NoContent();
  }

  // ---------------------------------------------------------------------------
  // Expense Documents
  // ---------------------------------------------------------------------------

  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<List<ExpenseListSummaryResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAll([FromQuery] ExpenseListQuery query, CancellationToken ct)
  {
    var result = await _service.GetAllAsync(query, ct);
    return Ok(ApiResponse<List<ExpenseListSummaryResponse>>.Ok(result.Items, result.ToMetadata()));
  }

  [HttpGet("summary")]
  [ProducesResponseType(typeof(ApiResponse<ExpenseSummaryResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetSummary([FromQuery] ExpenseListQuery query, CancellationToken ct)
  {
    var result = await _service.GetSummaryAsync(query, ct);
    return Ok(ApiResponse<ExpenseSummaryResponse>.Ok(result));
  }

  [HttpGet("{id:guid}", Name = nameof(GetById))]
  [ProducesResponseType(typeof(ApiResponse<ExpenseResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
  {
    var result = await _service.GetByIdAsync(id, ct);
    return Ok(ApiResponse<ExpenseResponse>.Ok(result));
  }

  [HttpPost]
  [ProducesResponseType(typeof(ApiResponse<ExpenseResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> CreateDraft([FromBody] ExpenseDraftRequest request, CancellationToken ct)
  {
    var expense = await _service.CreateDraftAsync(request, GetUserId(), ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1.0";
    return CreatedAtAction(nameof(GetById), new { id = expense.Id, version }, ApiResponse<ExpenseResponse>.Ok(expense));
  }

  [HttpPut("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ExpenseResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> UpdateDraft(Guid id, [FromBody] ExpenseDraftRequest request, CancellationToken ct)
  {
    var expense = await _service.UpdateDraftAsync(id, request, GetUserId(), ct);
    return Ok(ApiResponse<ExpenseResponse>.Ok(expense));
  }

  [HttpDelete("{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> DeleteDraft(Guid id, CancellationToken ct)
  {
    await _service.DeleteDraftAsync(id, GetUserId(), ct);
    return NoContent();
  }

  [HttpPost("{id:guid}/post")]
  [ProducesResponseType(typeof(ApiResponse<ExpenseResponse>), StatusCodes.Status200OK)]
  public async Task<IActionResult> Post(Guid id, CancellationToken ct)
  {
    var expense = await _service.PostAsync(id, GetUserId(), ct);
    return Ok(ApiResponse<ExpenseResponse>.Ok(expense));
  }

  private Guid GetUserId()
  {
    var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    if (!Guid.TryParse(value, out var userId))
    {
      throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
    }
    return userId;
  }
}
