using Api.Infrastructure.Http;
using Api.Modules.Branch;
using Api.Modules.Professional;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class ProfessionalServiceTests
{
  [Fact]
  public async Task Create_links_an_eligible_user_and_keeps_workspace_access_independent()
  {
    await using var db = CreateDb();
    var branch = Branch("MAIN", true);
    var otherBranch = Branch("OTHER", true);
    var user = new UserEntity { Username = "sara.login", PasswordHash = "x", Role = UserRole.Professional };
    db.AddRange(branch, otherBranch, user);
    db.UserBranchAccess.Add(new UserBranchAccessEntity { UserId = user.Id, BranchId = otherBranch.Id });
    await db.SaveChangesAsync();

    var response = await new ProfessionalService(db).CreateAsync(new CreateProfessionalRequest(
      "  Sara  ", "+964 (750) 123-4567", " SARA@EXAMPLE.COM ", "  Senior stylist ", [branch.Id], user.Id));

    Assert.Equal("Sara", response.Name);
    Assert.Equal("+964 (750) 123-4567", response.PhoneNumber);
    Assert.Equal("sara@example.com", response.Email);
    Assert.Equal("Senior stylist", response.Notes);
    Assert.Equal(branch.Id, Assert.Single(response.Branches).Id);
    Assert.Equal(user.Id, response.LinkedUser?.Id);
    Assert.Equal(response.Id, (await db.Users.SingleAsync(item => item.Id == user.Id)).LinkedProfessionalId);
    Assert.Equal(otherBranch.Id, Assert.Single(await db.UserBranchAccess.Select(access => access.BranchId).ToListAsync()));
    Assert.Equal(branch.Id, Assert.Single(await db.ProfessionalBranchAssignments.Select(assignment => assignment.BranchId).ToListAsync()));
  }

  [Fact]
  public async Task Create_rejects_inactive_branch_and_a_user_linked_elsewhere()
  {
    await using var db = CreateDb();
    var inactive = Branch("OFF", false);
    var active = Branch("ON", true);
    var user = new UserEntity { Username = "sara", PasswordHash = "x", Role = UserRole.Professional };
    var existing = new ProfessionalEntity { Name = "Existing", LinkedUser = user };
    user.LinkedProfessionalId = existing.Id;
    db.AddRange(inactive, active, user, existing);
    await db.SaveChangesAsync();
    var service = new ProfessionalService(db);

    var invalidBranch = await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(Request("New", [inactive.Id])));
    var linkedElsewhere = await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(Request("New", [active.Id], user.Id)));

    Assert.Equal(ErrorCodes.Professional.BranchInvalid, invalidBranch.Code);
    Assert.Equal(ErrorCodes.Professional.LinkedUserAlreadyAssigned, linkedElsewhere.Code);
  }

  [Fact]
  public async Task Delete_requires_deactivation_when_sales_history_exists()
  {
    await using var db = CreateDb();
    var professional = new ProfessionalEntity { Name = "Sara" };
    db.Add(professional);
    await db.SaveChangesAsync();
    db.SalesInvoiceLines.Add(new SalesInvoiceLineEntity { ProfessionalId = professional.Id });
    await db.SaveChangesAsync();

    var exception = await Assert.ThrowsAsync<BadRequestException>(() => new ProfessionalService(db).DeleteAsync(professional.Id));

    Assert.Equal(ErrorCodes.Professional.HasHistory, exception.Code);
    Assert.True((await db.Professionals.SingleAsync()).IsActive);
  }

  private static AppDbContext CreateDb() => new(new DbContextOptionsBuilder<AppDbContext>()
    .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

  private static BranchEntity Branch(string code, bool active) => new()
  {
    Code = code,
    Name = code,
    Address = "Address",
    City = "City",
    Region = "Region",
    Country = "Country",
    IsActive = active,
  };

  private static CreateProfessionalRequest Request(string name, Guid[] branchIds, Guid? linkedUserId = null) => new(
    name, null, null, null, branchIds, linkedUserId);
}
