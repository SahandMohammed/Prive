namespace Api.Modules.Settings;

public sealed record ItemDto(
    Guid Id,
    string Code,
    string Name,
    string Type,
    decimal BasePrice,
    decimal BaseCost,
    Guid CategoryId,
    string CategoryName,
    Guid BaseUnitOfMeasureId,
    string BaseUnitOfMeasureName,
    int? DurationMinutes,
    string? Description,
    bool IsActive,
    List<ItemUnitOfMeasureDto> AdditionalUnits
);

public sealed record ItemUnitOfMeasureDto(
    Guid Id,
    Guid UnitOfMeasureId,
    string UnitOfMeasureName,
    decimal ConversionFactor,
    bool IsDefaultForPurchasing,
    bool IsDefaultForSelling
);

public sealed record CreateItemRequest(
    string Code,
    string Name,
    ItemType Type,
    decimal BasePrice,
    decimal BaseCost,
    Guid CategoryId,
    Guid BaseUnitOfMeasureId,
    int? DurationMinutes,
    string? Description,
    List<CreateItemUnitRequest> AdditionalUnits
);

public sealed record CreateItemUnitRequest(
    Guid UnitOfMeasureId,
    decimal ConversionFactor,
    bool IsDefaultForPurchasing,
    bool IsDefaultForSelling
);

public sealed record ItemCategoryDto(
    Guid Id,
    string Name,
    Guid? ParentCategoryId,
    bool IsActive
);

public sealed record CreateItemCategoryRequest(
    string Name,
    Guid? ParentCategoryId
);

public sealed record UnitOfMeasureDto(
    Guid Id,
    string Name,
    string? Abbreviation,
    bool IsActive
);

public sealed record CreateUnitOfMeasureRequest(
    string Name,
    string? Abbreviation
);
