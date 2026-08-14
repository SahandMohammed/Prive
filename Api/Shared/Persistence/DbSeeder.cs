using Api.Modules.User;
using Api.Modules.Currency;
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

    await SeedCurrenciesAsync(db);

    if (await db.Users.AnyAsync(u => u.Role == UserRole.SuperAdmin))
    {
      logger.LogInformation("SuperAdmin user already exists. Skipping user seed.");
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

  private static async Task SeedCurrenciesAsync(AppDbContext db)
  {
    var currencies = new[]
    {
      new CurrencyEntity { Code = "IQD", Name = "Iraqi Dinar", Symbol = "د.ع", DecimalPlaces = 0 },
      new CurrencyEntity { Code = "USD", Name = "US Dollar", Symbol = "$", DecimalPlaces = 2 }
    };

    foreach (var currency in currencies)
    {
      if (!await db.Currencies.AnyAsync(existing => existing.Code == currency.Code))
      {
        db.Currencies.Add(currency);
      }
    }

    await db.SaveChangesAsync();
  }
}
