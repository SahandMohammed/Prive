namespace Api.Modules.Settings;

public sealed class ItemUnitOfMeasureEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ItemId { get; set; }
    public ItemEntity Item { get; set; } = null!;
    
    public Guid UnitOfMeasureId { get; set; }
    public UnitOfMeasureEntity UnitOfMeasure { get; set; } = null!;
    
    public decimal ConversionFactor { get; set; }
    
    public bool IsDefaultForPurchasing { get; set; }
    public bool IsDefaultForSelling { get; set; }
}
