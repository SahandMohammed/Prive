using Api.Infrastructure.Http;
using Api.Shared.Persistence;
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

  public async Task<List<UserResponse>> GetAllAsync()
  {
    return await _db.Users
      .OrderBy(u => u.Username)
      .Select(u => ToResponse(u))
      .ToListAsync();
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

    var user = new UserEntity
    {
      Username = request.Username,
      Role = request.Role,
      LinkedProfessionalId = request.LinkedProfessionalId,
      MustChangePassword = request.MustChangePassword
    };

    user.PasswordHash = _hasher.HashPassword(user, request.Password);

    _db.Users.Add(user);
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

    user.Role = request.Role;
    user.LinkedProfessionalId = request.LinkedProfessionalId;
    user.IsActive = request.IsActive;

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

  private static UserResponse ToResponse(UserEntity u) => new(
    u.Id,
    u.Username,
    u.Role,
    u.LinkedProfessionalId,
    u.IsActive,
    u.MustChangePassword,
    u.LastLoginAtUtc);
}