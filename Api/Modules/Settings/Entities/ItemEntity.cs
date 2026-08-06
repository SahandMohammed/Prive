namespace Api.Modules.Settings;

public enum ItemType
{
    Product = 0,
    Service = 1
}

public sealed class ItemEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public ItemType Type { get; set; }
    
    public decimal BasePrice { get; set; }
    public decimal BaseCost { get; set; }
    
    public Guid CategoryId { get; set; }
    public ItemCategoryEntity Category { get; set; } = null!;
    
    public Guid BaseUnitOfMeasureId { get; set; }
    public UnitOfMeasureEntity BaseUnitOfMeasure { get; set; } = null!;
    
    public int? DurationMinutes { get; set; }
    
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<ItemUnitOfMeasureEntity> AdditionalUnits { get; set; } = new List<ItemUnitOfMeasureEntity>();
}
