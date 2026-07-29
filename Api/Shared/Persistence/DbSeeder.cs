using Api.Modules.User;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Api.Shared.Persistence;

public static class DbSeeder
{
  private const string SuperAdminUsername = "superadmin";
  private const string SuperAdminDefaultPassword = "Admin@1234!";

  public static async Task SeedAsync(IServiceProvider serviceProvider)
  {
    await using var scope = serviceProvider.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

    await db.Database.MigrateAsync();

    if (await db.Users.AnyAsync(u => u.Role == UserRole.SuperAdmin))
    {
      logger.LogInformation("SuperAdmin user already exists. Skipping seed.");
      return;
    }

    var hasher = new PasswordHasher<UserEntity>();
    var superAdmin = new UserEntity
    {
      Username = SuperAdminUsername,
      Role = UserRole.SuperAdmin,
      IsActive = true,
      MustChangePassword = true
    };

    superAdmin.PasswordHash = hasher.HashPassword(superAdmin, SuperAdminDefaultPassword);

    db.Users.Add(superAdmin);
    await db.SaveChangesAsync();

    logger.LogInformation(
      "SuperAdmin user seeded successfully. Username: {Username} — Please change the default password after first login.",
      SuperAdminUsername);
  }
}
