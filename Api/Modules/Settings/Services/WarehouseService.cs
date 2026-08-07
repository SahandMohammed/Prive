using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Settings;

public interface IWarehouseService
{
    Task<PagedResult<WarehouseDto>> GetWarehousesAsync(WarehouseListQuery query, CancellationToken ct = default);
    Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseRequest request, CancellationToken ct = default);
}

public sealed class WarehouseService(AppDbContext db) : IWarehouseService
{
    public async Task<PagedResult<WarehouseDto>> GetWarehousesAsync(WarehouseListQuery request, CancellationToken ct = default)
    {
        var query = db.Warehouses.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(warehouse =>
                warehouse.Code.ToLower().Contains(search) ||
                warehouse.Name.ToLower().Contains(search) ||
                (warehouse.Address != null && warehouse.Address.ToLower().Contains(search)));
        }

        return await query
            .OrderBy(warehouse => warehouse.Code)
            .ThenBy(warehouse => warehouse.Id)
            .Select(warehouse => new WarehouseDto(
            warehouse.Id,
            warehouse.Code,
            warehouse.Name,
            warehouse.Address,
            warehouse.IsActive,
            warehouse.CreatedAtUtc))
            .ToPagedResultAsync(request, ct);
    }

    public async Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseRequest request, CancellationToken ct = default)
    {
        var code = request.Code?.Trim().ToUpperInvariant();
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
        {
            throw new BadRequestException(ErrorCodes.Common.ValidationFailed, "Warehouse code and name are required.");
        }
        if (await db.Warehouses.AnyAsync(warehouse => warehouse.Code == code, ct))
        {
            throw new ConflictException(ErrorCodes.Settings.WarehouseCodeTaken, $"A warehouse with code '{code}' already exists.");
        }

        var warehouse = new WarehouseEntity { Code = code, Name = name, Address = Normalize(request.Address) };
        db.Warehouses.Add(warehouse);
        await db.SaveChangesAsync(ct);

        return new WarehouseDto(warehouse.Id, warehouse.Code, warehouse.Name, warehouse.Address, warehouse.IsActive, warehouse.CreatedAtUtc);
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
