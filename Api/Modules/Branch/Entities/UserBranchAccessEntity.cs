using Api.Modules.User;

namespace Api.Modules.Branch;

public sealed class UserBranchAccessEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid UserId { get; set; }
  public UserEntity User { get; set; } = null!;
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
}
