using Api.Infrastructure.Http;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Settings;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/items")]
[Authorize(Roles = "SuperAdmin,Owner,Manager")]
public sealed class ItemsController(IItemService itemService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItems(CancellationToken ct)
    {
        var items = await itemService.GetItemsAsync(ct);
        return Ok(ApiResponse<List<ItemDto>>.Ok(items));
    }
    
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ItemDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateItem(CreateItemRequest req, CancellationToken ct)
    {
        var item = await itemService.CreateItemAsync(req, ct);
        return CreatedAtAction(nameof(GetItems), new { id = item.Id }, ApiResponse<ItemDto>.Ok(item));
    }
}
