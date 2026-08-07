using Api.Shared.Pagination;

namespace Api.Modules.Settings;

public sealed class WarehouseListQuery : PaginationRequest
{
    public string? Search { get; init; }
}

public sealed record WarehouseDto(
    Guid Id,
    string Code,
    string Name,
    string? Address,
    bool IsActive,
    DateTime CreatedAtUtc);

public sealed record CreateWarehouseRequest(string Code, string Name, string? Address);
