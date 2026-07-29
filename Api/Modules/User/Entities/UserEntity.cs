namespace Api.Modules.User;

public sealed class UserEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Username { get; set; } = string.Empty;
  public string PasswordHash { get; set; } = string.Empty;
  public UserRole Role { get; set; } = UserRole.Unassigned;
  public Guid? LinkedProfessionalId { get; set; }
  public bool IsActive { get; set; } = true;
  public bool MustChangePassword { get; set; }
  public int FailedLoginAttemptCount { get; set; }
  public DateTime? LockoutUntilUtc { get; set; }
  public DateTime? LastLoginAtUtc { get; set; }
}

public enum UserRole
{
  Unassigned = 0,
  SuperAdmin = 1,
  Owner = 2,
  Manager = 3,
  Professional = 4
}
