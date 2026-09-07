using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Api.Infrastructure.Http;
using Api.Modules.Accounting;
using Api.Modules.Branch;
using Api.Modules.Contact;
using Api.Modules.Finance;
using Api.Modules.Inventory;
using Api.Modules.Sales;
using Api.Modules.User;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class BranchScopeTests
{
  [Fact]
  public async Task Access_uses_active_assignments_and_privileged_roles_and_rechecks_revocation()
  {
    var options = Options();
    await using var db = new AppDbContext(options);
    var main = new BranchEntity { IsMainBranch = true, Name = "Main" };
    var other = new BranchEntity { Name = "Other" };
    var inactive = new BranchEntity { IsActive = false };
    var staff = new UserEntity { Role = UserRole.Cashier };
    var owner = new UserEntity { Role = UserRole.Owner };
    db.AddRange(main, other, inactive, staff, owner);
    var access = new UserBranchAccessEntity { UserId = staff.Id, BranchId = main.Id };
    db.Add(access);
    await db.SaveChangesAsync();
    var service = new BranchService(db);
    Assert.Equal(main.Id, Assert.Single((await service.GetAccessibleAsync(staff.Id, new())).Items).Id);
    Assert.Equal(2, (await service.GetAccessibleAsync(owner.Id, new())).TotalCount);
    Assert.Equal(main.Id, (await service.ValidateSelectionAsync(staff.Id, main.Id.ToString())).Id);
    Assert.Equal(ErrorCodes.Branch.AccessDenied, (await Assert.ThrowsAsync<ForbiddenException>(() => service.ValidateSelectionAsync(staff.Id, other.Id.ToString()))).Code);
    await Assert.ThrowsAsync<ForbiddenException>(() => service.ValidateSelectionAsync(owner.Id, inactive.Id.ToString()));
    db.Remove(access);
    await db.SaveChangesAsync();
    await Assert.ThrowsAsync<ForbiddenException>(() => service.ValidateSelectionAsync(staff.Id, main.Id.ToString()));
    owner.IsActive = false;
    await db.SaveChangesAsync();
    await Assert.ThrowsAsync<ForbiddenException>(() => service.ValidateSelectionAsync(owner.Id, main.Id.ToString()));
    await Assert.ThrowsAsync<BadRequestException>(() => service.ValidateSelectionAsync(staff.Id, null));
    await Assert.ThrowsAsync<BadRequestException>(() => service.ValidateSelectionAsync(staff.Id, "invalid"));
  }

  [Fact]
  public async Task Roots_children_reports_and_detail_queries_only_see_selected_branch()
  {
    var options = Options();
    var a = new BranchEntity();
    var b = new BranchEntity();
    await using (var seed = new AppDbContext(options))
    {
      foreach (var branch in new[] { a, b })
      {
        var journal = new JournalEntryEntity { Branch = branch };
        var warehouse = new WarehouseEntity { Branch = branch };
        var account = new MoneyAccountEntity { Branch = branch };
        seed.AddRange(new JournalLineEntity { JournalEntry = journal, DebitBaseAmount = branch == a ? 10 : 90 },
          new StockMovementEntity { Warehouse = warehouse, QuantityIn = branch == a ? 2 : 8 },
          new MoneyLedgerEntryEntity { MoneyAccount = account, JournalEntry = journal, Amount = branch == a ? 5 : 50 },
          new CustomerReceiptEntity { MoneyAccount = account });
      }
      await seed.SaveChangesAsync();
    }
    await using var db = new AppDbContext(options, new BranchContext { BranchId = a.Id });
    Assert.Equal(a.Id, (await db.Warehouses.SingleAsync()).BranchId);
    Assert.Single(await db.CustomerReceipts.ToListAsync());
    Assert.Equal(10, await db.JournalLines.SumAsync(line => line.DebitBaseAmount));
    Assert.Equal(2, await db.StockMovements.SumAsync(line => line.QuantityIn));
    Assert.Equal(5, await db.MoneyLedgerEntries.SumAsync(line => line.Amount));
    Assert.Null(await db.JournalEntries.SingleOrDefaultAsync(row => row.BranchId == b.Id));
    await using var other = new AppDbContext(options, new BranchContext { BranchId = b.Id });
    Assert.Equal(90, await other.JournalLines.SumAsync(line => line.DebitBaseAmount));
  }

  [Fact]
  public async Task Writes_reject_other_branch_roots_and_foreign_keys_even_when_attached_directly()
  {
    var options = Options();
    var a = new BranchEntity();
    var b = new BranchEntity();
    var foreign = new WarehouseEntity { Branch = b, Code = "WH-B" };
    await using (var seed = new AppDbContext(options)) { seed.AddRange(a, foreign); await seed.SaveChangesAsync(); }
    await using var db = new AppDbContext(options, new BranchContext { BranchId = a.Id });
    db.Warehouses.Add(new WarehouseEntity { BranchId = b.Id, Code = "WH-B2" });
    await Assert.ThrowsAsync<ForbiddenException>(() => db.SaveChangesAsync());
    db.ChangeTracker.Clear();
    db.StockMovements.Add(new StockMovementEntity { WarehouseId = foreign.Id });
    await Assert.ThrowsAsync<ForbiddenException>(() => db.SaveChangesAsync());
    db.ChangeTracker.Clear();
    var spoofed = new WarehouseEntity { Id = foreign.Id, BranchId = a.Id, Name = "Changed", Code = "WH-B" };
    db.Update(spoofed);
    await Assert.ThrowsAsync<ForbiddenException>(() => db.SaveChangesAsync());
    db.ChangeTracker.Clear();
    var valid = new WarehouseEntity { BranchId = a.Id, Code = "WH-A" };
    db.Add(valid);
    await db.SaveChangesAsync();
    Assert.Equal(a.Id, (await db.Warehouses.SingleAsync()).BranchId);
  }

  [Fact]
  public async Task Global_money_account_code_conflict_is_detected_across_branch_filter()
  {
    var options = Options();
    var a = new BranchEntity();
    var b = new BranchEntity();
    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(a, b, new MoneyAccountEntity { Branch = b, Code = "CASH-01" });
      await seed.SaveChangesAsync();
    }

    await using var db = new AppDbContext(options, new BranchContext { BranchId = a.Id });
    Assert.Empty(await db.MoneyAccounts.ToListAsync());
    db.MoneyAccounts.Add(new MoneyAccountEntity { BranchId = a.Id, Code = "CASH-01" });
    var error = await Assert.ThrowsAsync<ConflictException>(() => db.SaveChangesAsync());
    Assert.Equal(ErrorCodes.Finance.MoneyAccountCodeTaken, error.Code);
  }

  [Fact]
  public async Task Global_warehouse_code_conflict_is_detected_across_branch_filter()
  {
    var options = Options();
    var a = new BranchEntity();
    var b = new BranchEntity();
    await using (var seed = new AppDbContext(options))
    {
      seed.AddRange(a, b, new WarehouseEntity { Branch = b, Code = "WH-01" });
      await seed.SaveChangesAsync();
    }

    await using var db = new AppDbContext(options, new BranchContext { BranchId = a.Id });
    Assert.Empty(await db.Warehouses.ToListAsync());
    db.Warehouses.Add(new WarehouseEntity { BranchId = a.Id, Code = "WH-01" });
    var error = await Assert.ThrowsAsync<ConflictException>(() => db.SaveChangesAsync());
    Assert.Equal(ErrorCodes.Inventory.WarehouseCodeTaken, error.Code);
  }

  [Fact]
  public async Task Shared_catalogs_are_shared_and_separate_catalogs_are_isolated_on_read_and_save()
  {
    var options = Options();
    var a = Guid.NewGuid();
    var b = Guid.NewGuid();
    Guid sharedId;
    await using (var shared = new AppDbContext(options, new BranchContext { BranchId = a }))
    {
      var contact = new ContactEntity { Name = "Shared", IsCustomer = true };
      shared.Add(contact);
      await shared.SaveChangesAsync();
      sharedId = contact.Id;
      Assert.Null(contact.CatalogBranchId);
    }
    await using (var shared = new AppDbContext(options, new BranchContext { BranchId = b }))
      Assert.Equal(sharedId, (await shared.Contacts.SingleAsync()).Id);
    await using (var separate = new AppDbContext(options, new BranchContext { BranchId = b, CatalogBranchId = b }))
    {
      Assert.Empty(await separate.Contacts.ToListAsync());
      var contact = new ContactEntity { Name = "Private", IsSupplier = true };
      separate.Add(contact);
      await separate.SaveChangesAsync();
      Assert.Equal(b, contact.CatalogBranchId);
      separate.ChangeTracker.Clear();
      separate.Update(new ContactEntity { Id = sharedId, CatalogBranchId = b, Name = "Spoofed" });
      await Assert.ThrowsAsync<ForbiddenException>(() => separate.SaveChangesAsync());
    }
    await using var sharedAgain = new AppDbContext(options, new BranchContext { BranchId = a });
    Assert.Equal("Shared", (await sharedAgain.Contacts.SingleAsync()).Name);
    Assert.Empty(await sharedAgain.Accounts.ToListAsync());
    Assert.Empty(sharedAgain.Model.FindEntityType(typeof(AccountEntity))!.GetDeclaredQueryFilters());
  }

  [Fact]
  public async Task Private_catalog_foreign_keys_cannot_reference_shared_items()
  {
    var options = Options();
    var category = new ProductCategoryEntity { Name = "Shared category" };
    await using (var seed = new AppDbContext(options)) { seed.Add(category); await seed.SaveChangesAsync(); }
    var branchId = Guid.NewGuid();
    await using var db = new AppDbContext(options, new BranchContext { BranchId = branchId, CatalogBranchId = branchId });
    db.Products.Add(new ProductEntity { Name = "Private product", CategoryId = category.Id });
    await Assert.ThrowsAsync<ForbiddenException>(() => db.SaveChangesAsync());
  }

  [Fact]
  public async Task Updating_separate_branch_does_not_require_catalog_mode_in_update_contract()
  {
    var options = Options();
    await using var db = new AppDbContext(options);
    var branch = new BranchEntity
    {
      Code = "WEST",
      Name = "West",
      Address = "Address",
      City = "City",
      Region = "Region",
      Country = "Country",
      CatalogMode = BranchCatalogMode.Separate
    };
    db.Add(branch);
    await db.SaveChangesAsync();

    var result = await new BranchService(db).UpdateAsync(branch.Id,
      new("WEST", "West Updated", null, null, "Address", "City", "Region", "Country", false, true));

    Assert.Equal(BranchCatalogMode.Separate, result.CatalogMode);
    Assert.Equal("West Updated", result.Name);
  }

  [Fact]
  public async Task Demoting_privileged_user_to_scoped_role_assigns_active_main_branch_when_needed()
  {
    var options = Options();
    await using var db = new AppDbContext(options);
    var main = new BranchEntity { IsMainBranch = true, IsActive = true };
    var owner = new UserEntity { Username = "owner", Role = UserRole.Owner };
    db.AddRange(main, owner);
    await db.SaveChangesAsync();

    await new UserService(db).UpdateAsync(owner.Id, new(null, UserRole.Manager, null, true));

    var assignment = await db.UserBranchAccess.SingleAsync(access => access.UserId == owner.Id);
    Assert.Equal(main.Id, assignment.BranchId);
  }

  [Fact]
  public void Branch_mutations_require_owner_or_superadmin_in_addition_to_controller_read_policy()
  {
    foreach (var methodName in new[] { nameof(BranchController.Create), nameof(BranchController.Update), nameof(BranchController.Deactivate) })
    {
      var method = typeof(BranchController).GetMethod(methodName)!;
      var roles = method.GetCustomAttributes<AuthorizeAttribute>().Select(attribute => attribute.Roles).ToList();
      Assert.Contains("SuperAdmin,Owner", roles);
    }

    Assert.Equal("SuperAdmin,Owner,Manager", typeof(BranchController).GetCustomAttribute<AuthorizeAttribute>()!.Roles);
  }

  [Fact]
  public void PostgreSql_translates_scoped_roots_children_and_catalog_filters()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=localhost;Database=translation_only").Options;
    var branchId = Guid.NewGuid();
    using var db = new AppDbContext(options, new BranchContext { BranchId = branchId, CatalogBranchId = branchId });
    Assert.Contains("BranchId", db.SalesInvoices.ToQueryString());
    Assert.Contains("BranchId", db.JournalLines.ToQueryString());
    Assert.Contains("BranchId", db.CustomerReceiptAllocations.ToQueryString());
    Assert.Contains("BranchId", db.PosTenders.ToQueryString());
    Assert.Contains("CatalogBranchId", db.Products.ToQueryString());
  }

  [Fact]
  public async Task Request_filter_requires_accessible_header_and_rejects_conflicting_payload()
  {
    await using var db = new AppDbContext(Options());
    var branch = new BranchEntity { CatalogMode = BranchCatalogMode.Separate };
    var user = new UserEntity { Role = UserRole.Owner };
    db.AddRange(branch, user);
    await db.SaveChangesAsync();
    var http = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", user.Id.ToString())], "Test")) };
    var action = new ActionContext(http, new RouteData(), new ControllerActionDescriptor { ControllerTypeInfo = typeof(SalesController).GetTypeInfo() });
    var filters = new List<IFilterMetadata>();
    var resource = new ResourceExecutingContext(action, filters, new List<IValueProviderFactory>());
    var scope = new BranchContext();
    var filter = new BranchScopeFilter(new BranchService(db), scope);
    var called = false;
    Task<ResourceExecutedContext> Next() { called = true; return Task.FromResult(new ResourceExecutedContext(action, filters)); }
    await Assert.ThrowsAsync<BadRequestException>(() => filter.OnResourceExecutionAsync(resource, Next));
    Assert.False(called);
    http.Request.Headers["X-Branch-Id"] = branch.Id.ToString();
    await filter.OnResourceExecutionAsync(resource, Next);
    Assert.True(called);
    Assert.Equal(branch.Id, scope.BranchId);
    Assert.Equal(branch.Id, scope.CatalogBranchId);
    var arguments = new Dictionary<string, object?> { ["query"] = new JournalListQuery { BranchId = Guid.NewGuid() } };
    var executing = new ActionExecutingContext(action, filters, arguments, new object());
    await Assert.ThrowsAsync<ForbiddenException>(() => filter.OnActionExecutionAsync(executing,
      () => Task.FromResult(new ActionExecutedContext(action, filters, new object()))));
  }

  [Fact]
  public async Task Shared_product_history_in_another_branch_still_prevents_structural_changes()
  {
    var options = Options();
    Guid productId;
    await using (var seed = new AppDbContext(options))
    {
      var category = new ProductCategoryEntity { Name = "Products" };
      var unit = new UnitOfMeasureEntity { Name = "Piece", Code = "PCS" };
      var product = new ProductEntity { Name = "Shared item", SKU = "ITEM", Category = category, UnitOfMeasure = unit };
      seed.Add(new StockMovementEntity { Product = product, Warehouse = new WarehouseEntity { Branch = new BranchEntity() }, QuantityIn = 1 });
      await seed.SaveChangesAsync();
      productId = product.Id;
    }
    await using var db = new AppDbContext(options, new BranchContext { BranchId = Guid.NewGuid() });
    Assert.Empty(await db.StockMovements.ToListAsync());
    Assert.NotNull(await db.Products.SingleOrDefaultAsync(product => product.Id == productId));
    var service = new InventoryService(db);
    var error = await Assert.ThrowsAsync<BadRequestException>(() => service.DeleteProductAsync(productId, default));
    Assert.Equal(ErrorCodes.Inventory.ProductHasHistory, error.Code);
  }

  private static DbContextOptions<AppDbContext> Options() => new DbContextOptionsBuilder<AppDbContext>()
    .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
}
