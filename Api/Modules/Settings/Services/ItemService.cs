using Api.Infrastructure.Http;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Settings;

public interface IItemService
{
    Task<List<ItemDto>> GetItemsAsync(CancellationToken ct = default);
    Task<ItemDto> CreateItemAsync(CreateItemRequest req, CancellationToken ct = default);
    
    Task<List<UnitOfMeasureDto>> GetUnitsOfMeasureAsync(CancellationToken ct = default);
    Task<UnitOfMeasureDto> CreateUnitOfMeasureAsync(CreateUnitOfMeasureRequest req, CancellationToken ct = default);
    
    Task<List<ItemCategoryDto>> GetCategoriesAsync(CancellationToken ct = default);
    Task<ItemCategoryDto> CreateCategoryAsync(CreateItemCategoryRequest req, CancellationToken ct = default);
}

public sealed class ItemService(AppDbContext db) : IItemService
{
    public async Task<List<ItemDto>> GetItemsAsync(CancellationToken ct = default)
    {
        var items = await db.Items
            .AsNoTracking()
            .Include(i => i.Category)
            .Include(i => i.BaseUnitOfMeasure)
            .Include(i => i.AdditionalUnits)
                .ThenInclude(au => au.UnitOfMeasure)
            .ToListAsync(ct);
            
        return items.Select(MapToDto).ToList();
    }
    
    public async Task<ItemDto> CreateItemAsync(CreateItemRequest req, CancellationToken ct = default)
    {
        if (await db.Items.AnyAsync(i => i.Code == req.Code, ct))
        {
            throw new ConflictException(ErrorCodes.Settings.ItemCodeTaken, $"An item with code '{req.Code}' already exists.");
        }
        
        if (req.Type == ItemType.Service && !req.DurationMinutes.HasValue)
        {
            throw new BadRequestException(ErrorCodes.Settings.ServiceRequiresDuration, "A duration is required for Service items.");
        }
        
        if (req.AdditionalUnits != null)
        {
            if (req.AdditionalUnits.Count(x => x.IsDefaultForPurchasing) > 1)
                throw new BadRequestException(ErrorCodes.Settings.MultiplePurchasingDefaults, "Only one unit can be marked as default for purchasing.");
                
            if (req.AdditionalUnits.Count(x => x.IsDefaultForSelling) > 1)
                throw new BadRequestException(ErrorCodes.Settings.MultipleSellingDefaults, "Only one unit can be marked as default for selling.");
        }

        var category = await db.ItemCategories.FindAsync([req.CategoryId], ct) 
            ?? throw new NotFoundException(ErrorCodes.Settings.CategoryNotFound, "Category not found.");
            
        var baseUom = await db.UnitsOfMeasure.FindAsync([req.BaseUnitOfMeasureId], ct)
            ?? throw new NotFoundException(ErrorCodes.Settings.UnitOfMeasureNotFound, "Base Unit of Measure not found.");
            
        var entity = new ItemEntity
        {
            Code = req.Code,
            Name = req.Name,
            Type = req.Type,
            BasePrice = req.BasePrice,
            BaseCost = req.BaseCost,
            CategoryId = req.CategoryId,
            BaseUnitOfMeasureId = req.BaseUnitOfMeasureId,
            DurationMinutes = req.Type == ItemType.Service ? req.DurationMinutes : null,
            Description = req.Description,
            AdditionalUnits = new List<ItemUnitOfMeasureEntity>()
        };

        if (req.Type == ItemType.Product && req.AdditionalUnits != null)
        {
            foreach (var au in req.AdditionalUnits)
            {
                var uom = await db.UnitsOfMeasure.FindAsync([au.UnitOfMeasureId], ct)
                    ?? throw new NotFoundException(ErrorCodes.Settings.UnitOfMeasureNotFound, $"Unit of Measure '{au.UnitOfMeasureId}' not found.");
                    
                entity.AdditionalUnits.Add(new ItemUnitOfMeasureEntity
                {
                    UnitOfMeasureId = au.UnitOfMeasureId,
                    ConversionFactor = au.ConversionFactor,
                    IsDefaultForPurchasing = au.IsDefaultForPurchasing,
                    IsDefaultForSelling = au.IsDefaultForSelling
                });
            }
        }
        
        db.Items.Add(entity);
        await db.SaveChangesAsync(ct);
        
        var created = await db.Items
            .Include(i => i.Category)
            .Include(i => i.BaseUnitOfMeasure)
            .Include(i => i.AdditionalUnits)
                .ThenInclude(au => au.UnitOfMeasure)
            .FirstAsync(i => i.Id == entity.Id, ct);
            
        return MapToDto(created);
    }
    
    public async Task<List<UnitOfMeasureDto>> GetUnitsOfMeasureAsync(CancellationToken ct = default)
    {
        var items = await db.UnitsOfMeasure.AsNoTracking().ToListAsync(ct);
        return items.Select(u => new UnitOfMeasureDto(u.Id, u.Name, u.Abbreviation, u.IsActive)).ToList();
    }
    
    public async Task<UnitOfMeasureDto> CreateUnitOfMeasureAsync(CreateUnitOfMeasureRequest req, CancellationToken ct = default)
    {
        var entity = new UnitOfMeasureEntity { Name = req.Name, Abbreviation = req.Abbreviation };
        db.UnitsOfMeasure.Add(entity);
        await db.SaveChangesAsync(ct);
        return new UnitOfMeasureDto(entity.Id, entity.Name, entity.Abbreviation, entity.IsActive);
    }
    
    public async Task<List<ItemCategoryDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        var items = await db.ItemCategories.AsNoTracking().ToListAsync(ct);
        return items.Select(c => new ItemCategoryDto(c.Id, c.Name, c.ParentCategoryId, c.IsActive)).ToList();
    }
    
    public async Task<ItemCategoryDto> CreateCategoryAsync(CreateItemCategoryRequest req, CancellationToken ct = default)
    {
        if (req.ParentCategoryId.HasValue)
        {
            var parent = await db.ItemCategories.FindAsync([req.ParentCategoryId.Value], ct)
                ?? throw new NotFoundException(ErrorCodes.Settings.CategoryNotFound, "Parent category not found.");
        }
        
        var entity = new ItemCategoryEntity { Name = req.Name, ParentCategoryId = req.ParentCategoryId };
        db.ItemCategories.Add(entity);
        await db.SaveChangesAsync(ct);
        return new ItemCategoryDto(entity.Id, entity.Name, entity.ParentCategoryId, entity.IsActive);
    }
    
    private static ItemDto MapToDto(ItemEntity i)
    {
        return new ItemDto(
            i.Id,
            i.Code,
            i.Name,
            i.Type.ToString(),
            i.BasePrice,
            i.BaseCost,
            i.CategoryId,
            i.Category.Name,
            i.BaseUnitOfMeasureId,
            i.BaseUnitOfMeasure.Name,
            i.DurationMinutes,
            i.Description,
            i.IsActive,
            i.AdditionalUnits.Select(au => new ItemUnitOfMeasureDto(
                au.Id,
                au.UnitOfMeasureId,
                au.UnitOfMeasure.Name,
                au.ConversionFactor,
                au.IsDefaultForPurchasing,
                au.IsDefaultForSelling
            )).ToList()
        );
    }
}
