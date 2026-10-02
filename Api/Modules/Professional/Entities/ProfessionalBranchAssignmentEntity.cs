using Api.Modules.Branch;

namespace Api.Modules.Professional;

public sealed class ProfessionalBranchAssignmentEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public Guid ProfessionalId { get; set; }
  public ProfessionalEntity Professional { get; set; } = null!;
  public Guid BranchId { get; set; }
  public BranchEntity Branch { get; set; } = null!;
}
