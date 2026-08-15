using Api.Infrastructure.Http;
using Api.Modules.Contact;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public sealed class ContactServiceTests
{
  [Fact]
  public async Task Contact_requires_at_least_one_commercial_role()
  {
    await using var db = CreateDb();
    var service = new ContactService(db);
    var request = Request("No role", isCustomer: false, isSupplier: false);

    var exception = await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(request));

    Assert.Equal(ErrorCodes.Contact.RoleRequired, exception.Code);
    Assert.Empty(db.Contacts);
  }

  [Fact]
  public async Task Role_filters_use_one_contact_record_for_customer_supplier_and_both()
  {
    await using var db = CreateDb();
    var service = new ContactService(db);
    await service.CreateAsync(Request("Customer", isCustomer: true, isSupplier: false));
    await service.CreateAsync(Request("Supplier", isCustomer: false, isSupplier: true));
    var both = await service.CreateAsync(Request("Both", isCustomer: true, isSupplier: true));

    var customers = await service.GetAllAsync(new ContactListQuery { Role = ContactRole.Customer });
    var suppliers = await service.GetAllAsync(new ContactListQuery { Role = ContactRole.Supplier });
    var dualRole = await service.GetAllAsync(new ContactListQuery { Role = ContactRole.Both });

    Assert.Equal(2, customers.TotalCount);
    Assert.Equal(2, suppliers.TotalCount);
    Assert.Equal(both.Id, Assert.Single(dualRole.Items).Id);
    Assert.Equal(3, await db.Contacts.CountAsync());
  }

  [Fact]
  public async Task Phone_search_ignores_common_display_formatting_and_inactive_contacts_remain_readable()
  {
    await using var db = CreateDb();
    var service = new ContactService(db);
    var created = await service.CreateAsync(Request(
      "Formatted phone",
      isCustomer: true,
      isSupplier: false,
      primaryPhone: "+964 (750) 123-4567"));
    await service.DeactivateAsync(created.Id);

    var search = await service.GetAllAsync(new ContactListQuery { Search = "7501234567" });
    var detail = await service.GetByIdAsync(created.Id);

    Assert.Equal(created.Id, Assert.Single(search.Items).Id);
    Assert.False(detail.IsActive);
  }

  private static AppDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<AppDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new AppDbContext(options);
  }

  private static CreateContactRequest Request(
    string name,
    bool isCustomer,
    bool isSupplier,
    string? primaryPhone = null) => new(
      name,
      ContactKind.Individual,
      isCustomer,
      isSupplier,
      primaryPhone,
      null,
      null,
      null,
      null,
      null,
      null,
      null);
}
