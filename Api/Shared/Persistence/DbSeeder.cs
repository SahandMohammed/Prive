using Api.Modules.Settings;
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

    if (!await db.UnitsOfMeasure.AnyAsync())
    {
      db.UnitsOfMeasure.AddRange(
        new UnitOfMeasureEntity { Name = "Piece", Abbreviation = "pcs" },
        new UnitOfMeasureEntity { Name = "Carton", Abbreviation = "ctn" },
        new UnitOfMeasureEntity { Name = "Kilogram", Abbreviation = "kg" },
        new UnitOfMeasureEntity { Name = "Hour", Abbreviation = "hr" },
        new UnitOfMeasureEntity { Name = "Session", Abbreviation = "sess" }
      );
      await db.SaveChangesAsync();
      logger.LogInformation("Seeded default Units of Measure.");
    }

    if (!await db.ItemCategories.AnyAsync())
    {
      var hairCat = new ItemCategoryEntity { Name = "Hair" };
      var skinCat = new ItemCategoryEntity { Name = "Skin Care" };
      db.ItemCategories.AddRange(hairCat, skinCat);
      await db.SaveChangesAsync();
      
      db.ItemCategories.AddRange(
        new ItemCategoryEntity { Name = "Coloring", ParentCategoryId = hairCat.Id },
        new ItemCategoryEntity { Name = "Styling", ParentCategoryId = hairCat.Id },
        new ItemCategoryEntity { Name = "Facials", ParentCategoryId = skinCat.Id }
      );
      await db.SaveChangesAsync();
      logger.LogInformation("Seeded default Item Categories.");
    }
  }
}
