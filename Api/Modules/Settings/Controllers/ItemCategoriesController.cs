using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Settings;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/item-categories")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class ItemCategoriesController(IItemService itemService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ItemCategoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var items = await itemService.GetCategoriesAsync(ct);
        return Ok(ApiResponse<List<ItemCategoryDto>>.Ok(items));
    }
    
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ItemCategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateCategory(CreateItemCategoryRequest req, CancellationToken ct)
    {
        var cat = await itemService.CreateCategoryAsync(req, ct);
        return Ok(ApiResponse<ItemCategoryDto>.Ok(cat));
    }
}
