using Api.Modules.Branch;
using Api.Modules.User;

namespace Api.Modules.Dashboard;

public sealed class ActivityLogEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
  public Guid UserId { get; set; }
  public UserEntity User { get; set; } = null!;
  public string Action { get; set; } = string.Empty;
  public string EntityType { get; set; } = string.Empty;
  public Guid EntityId { get; set; }
  public string DocumentNumber { get; set; } = string.Empty;
  public string? Description { get; set; }
  public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}
