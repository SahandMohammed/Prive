namespace Api.Modules.Settings;

public sealed class ItemCategoryEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public Guid? ParentCategoryId { get; set; }
    public ItemCategoryEntity? ParentCategory { get; set; }
    public ICollection<ItemCategoryEntity> SubCategories { get; set; } = new List<ItemCategoryEntity>();
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
