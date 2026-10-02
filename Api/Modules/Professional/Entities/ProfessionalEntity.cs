using Api.Modules.User;

namespace Api.Modules.Professional;

public sealed class ProfessionalEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Name { get; set; } = string.Empty;
  public string? PhoneNumber { get; set; }
  public string? PhoneNormalized { get; set; }
  public string? Email { get; set; }
  public string? Notes { get; set; }
  public bool IsActive { get; set; } = true;
  public UserEntity? LinkedUser { get; set; }
  public ICollection<ProfessionalBranchAssignmentEntity> BranchAssignments { get; set; } = new List<ProfessionalBranchAssignmentEntity>();
}
