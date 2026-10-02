using Api.Infrastructure.Http;
using Api.Shared.Persistence;
using Api.Shared.Pagination;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.User;

public sealed class UserService
{
  private readonly AppDbContext _db;
  private readonly PasswordHasher<UserEntity> _hasher = new();

  public UserService(AppDbContext db)
  {
    _db = db;
  }

  public async Task<PagedResult<UserResponse>> GetAllAsync(UserListQuery request, CancellationToken ct = default)
  {
    var query = _db.Users
      .AsNoTracking()
      .AsQueryable();

    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(user => user.Username.ToLower().Contains(search));
    }

    return await query
      .OrderBy(u => u.Username)
      .ThenBy(u => u.Id)
      .Select(u => ToResponse(u))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<UserResponse> GetByIdAsync(Guid id)
  {
    var user = await _db.Users.FindAsync(id)
      ?? throw new NotFoundException(ErrorCodes.User.NotFound, $"User with id '{id}' was not found.");

    return ToResponse(user);
  }

  public async Task<UserResponse> CreateAsync(CreateUserRequest request)
  {
    if (await _db.Users.AnyAsync(u => u.Username == request.Username))
      throw new ConflictException(ErrorCodes.User.UsernameTaken, $"Username '{request.Username}' is already taken.");
    await ValidateLinkedProfessionalAsync(request.Role, request.LinkedProfessionalId, null);

    var user = new UserEntity
    {
      Username = request.Username,
      Role = request.Role,
      LinkedProfessionalId = request.Role == UserRole.Professional ? request.LinkedProfessionalId : null,
      MustChangePassword = request.MustChangePassword
    };

    user.PasswordHash = _hasher.HashPassword(user, request.Password);

    _db.Users.Add(user);
    var mainBranchId = await GetActiveMainBranchIdAsync();
    if (mainBranchId is not null && IsScopedRole(user.Role))
      _db.UserBranchAccess.Add(new Api.Modules.Branch.UserBranchAccessEntity { UserId = user.Id, BranchId = mainBranchId.Value });
    await _db.SaveChangesAsync();

    return ToResponse(user);
  }

  public async Task<UserResponse> UpdateAsync(Guid id, UpdateUserRequest request)
  {
    var user = await _db.Users.FindAsync(id)
      ?? throw new NotFoundException(ErrorCodes.User.NotFound, "User not found.");

    if (request.Username is not null && request.Username != user.Username)
    {
      if (await _db.Users.AnyAsync(u => u.Username == request.Username && u.Id != id))
        throw new ConflictException(ErrorCodes.User.UsernameTaken, $"Username '{request.Username}' is already taken.");

      user.Username = request.Username;
    }

    var wasPrivileged = IsPrivilegedRole(user.Role);
    var becomesScoped = IsScopedRole(request.Role);

    await ValidateLinkedProfessionalAsync(request.Role, request.LinkedProfessionalId, id);
    user.Role = request.Role;
    user.LinkedProfessionalId = request.Role == UserRole.Professional ? request.LinkedProfessionalId : null;
    user.IsActive = request.IsActive;

    var hasActiveBranchAccess = await _db.UserBranchAccess
      .AnyAsync(access => access.UserId == id && access.Branch.IsActive);
    if (wasPrivileged && becomesScoped && !hasActiveBranchAccess)
    {
      var mainBranchId = await GetActiveMainBranchIdAsync();
      if (mainBranchId is not null)
        _db.UserBranchAccess.Add(new Api.Modules.Branch.UserBranchAccessEntity { UserId = id, BranchId = mainBranchId.Value });
    }

    await _db.SaveChangesAsync();
    return ToResponse(user);
  }

  public async Task ResetPasswordAsync(Guid id, ResetPasswordRequest request)
  {
    var user = await _db.Users.FindAsync(id)
      ?? throw new NotFoundException(ErrorCodes.User.NotFound, "User not found.");

    user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
    user.MustChangePassword = request.MustChangePassword;

    await _db.SaveChangesAsync();
  }

  public async Task DeleteAsync(Guid id)
  {
    var user = await _db.Users.FindAsync(id)
      ?? throw new NotFoundException(ErrorCodes.User.NotFound, "User not found.");

    _db.Users.Remove(user);
    await _db.SaveChangesAsync();
  }

  private async Task<Guid?> GetActiveMainBranchIdAsync() => await _db.Branches
    .Where(branch => branch.IsMainBranch && branch.IsActive)
    .Select(branch => (Guid?)branch.Id)
    .SingleOrDefaultAsync();

  private static bool IsPrivilegedRole(UserRole role) => role is UserRole.SuperAdmin or UserRole.Owner;
  private static bool IsScopedRole(UserRole role) => role is UserRole.Manager or UserRole.Cashier or UserRole.Professional;

  private async Task ValidateLinkedProfessionalAsync(UserRole role, Guid? linkedProfessionalId, Guid? userId)
  {
    if (linkedProfessionalId is null) return;
    if (role != UserRole.Professional)
      throw new BadRequestException(ErrorCodes.Professional.LinkedUserInvalid,
        "Only a Professional-role user may be linked to a Professional profile.");
    if (!await _db.Professionals.AnyAsync(professional => professional.Id == linkedProfessionalId))
      throw new BadRequestException(ErrorCodes.Professional.LinkedUserInvalid,
        "Choose an existing Professional profile.");
    if (await _db.Users.AnyAsync(user => user.Id != userId && user.LinkedProfessionalId == linkedProfessionalId))
      throw new ConflictException(ErrorCodes.Professional.LinkedUserAlreadyAssigned,
        "This Professional profile is already linked to another user account.");
  }

  private static UserResponse ToResponse(UserEntity u) => new(
    u.Id,
    u.Username,
    u.Role,
    u.LinkedProfessionalId,
    u.IsActive,
    u.MustChangePassword,
    u.LastLoginAtUtc);
}
