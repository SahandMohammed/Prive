using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Contact;

public sealed class ContactService
{
  private readonly AppDbContext _db;

  public ContactService(AppDbContext db) => _db = db;

  public async Task<PagedResult<ContactResponse>> GetAllAsync(
    ContactListQuery request,
    CancellationToken ct = default)
  {
    var query = _db.Contacts.AsNoTracking().AsQueryable();

    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      var normalizedPhone = NormalizePhone(request.Search);

      query = query.Where(contact =>
        contact.Name.ToLower().Contains(search)
        || (contact.Email != null && contact.Email.ToLower().Contains(search))
        || (contact.PrimaryPhoneNumber != null && contact.PrimaryPhoneNumber.ToLower().Contains(search))
        || (contact.SecondaryPhoneNumber != null && contact.SecondaryPhoneNumber.ToLower().Contains(search))
        || (normalizedPhone != null && contact.PrimaryPhoneNormalized != null && contact.PrimaryPhoneNormalized.Contains(normalizedPhone))
        || (normalizedPhone != null && contact.SecondaryPhoneNormalized != null && contact.SecondaryPhoneNormalized.Contains(normalizedPhone)));
    }

    query = request.Role switch
    {
      ContactRole.Customer => query.Where(contact => contact.IsCustomer),
      ContactRole.Supplier => query.Where(contact => contact.IsSupplier),
      ContactRole.Both => query.Where(contact => contact.IsCustomer && contact.IsSupplier),
      _ => query
    };

    if (request.IsActive is not null)
      query = query.Where(contact => contact.IsActive == request.IsActive);
    if (request.Kind is not null)
      query = query.Where(contact => contact.Kind == request.Kind);

    return await query
      .OrderBy(contact => contact.Name)
      .ThenBy(contact => contact.Id)
      .Select(contact => ToResponse(contact))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<ContactResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
  {
    var contact = await _db.Contacts
      .AsNoTracking()
      .SingleOrDefaultAsync(contact => contact.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Contact.NotFound,
        $"Contact with id '{id}' was not found.");

    return ToResponse(contact);
  }

  public async Task<ContactResponse> CreateAsync(
    CreateContactRequest request,
    CancellationToken ct = default)
  {
    ValidateRoles(request.IsCustomer, request.IsSupplier);

    var contact = new ContactEntity();
    Apply(contact, request);

    _db.Contacts.Add(contact);
    await _db.SaveChangesAsync(ct);

    return ToResponse(contact);
  }

  public async Task<ContactResponse> UpdateAsync(
    Guid id,
    UpdateContactRequest request,
    CancellationToken ct = default)
  {
    var contact = await _db.Contacts.SingleOrDefaultAsync(contact => contact.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Contact.NotFound,
        $"Contact with id '{id}' was not found.");

    ValidateRoles(request.IsCustomer, request.IsSupplier);
    Apply(contact, request);
    await _db.SaveChangesAsync(ct);

    return ToResponse(contact);
  }

  public Task ActivateAsync(Guid id, CancellationToken ct = default) => SetActiveAsync(id, true, ct);

  public Task DeactivateAsync(Guid id, CancellationToken ct = default) => SetActiveAsync(id, false, ct);

  public async Task DeleteAsync(Guid id, CancellationToken ct = default)
  {
    var contact = await _db.Contacts.SingleOrDefaultAsync(contact => contact.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Contact.NotFound,
        $"Contact with id '{id}' was not found.");

    if (await _db.PurchaseInvoices.AnyAsync(invoice => invoice.SupplierId == id, ct)
      || await _db.SalesInvoices.AnyAsync(invoice => invoice.CustomerId == id, ct))
      throw new BadRequestException(ErrorCodes.Contact.HasHistory, "A contact with purchase or sales history cannot be deleted. Deactivate it instead.");

    _db.Contacts.Remove(contact);
    await _db.SaveChangesAsync(ct);
  }

  private async Task SetActiveAsync(Guid id, bool isActive, CancellationToken ct)
  {
    var contact = await _db.Contacts.SingleOrDefaultAsync(contact => contact.Id == id, ct)
      ?? throw new NotFoundException(
        ErrorCodes.Contact.NotFound,
        $"Contact with id '{id}' was not found.");

    contact.IsActive = isActive;
    await _db.SaveChangesAsync(ct);
  }

  private static void Apply(ContactEntity contact, CreateContactRequest request)
  {
    contact.Name = request.Name.Trim();
    contact.Kind = request.Kind;
    contact.IsCustomer = request.IsCustomer;
    contact.IsSupplier = request.IsSupplier;
    contact.PrimaryPhoneNumber = TrimOrNull(request.PrimaryPhoneNumber);
    contact.PrimaryPhoneNormalized = NormalizePhone(request.PrimaryPhoneNumber);
    contact.SecondaryPhoneNumber = TrimOrNull(request.SecondaryPhoneNumber);
    contact.SecondaryPhoneNormalized = NormalizePhone(request.SecondaryPhoneNumber);
    contact.Email = TrimOrNull(request.Email)?.ToLowerInvariant();
    contact.Address = TrimOrNull(request.Address);
    contact.City = TrimOrNull(request.City);
    contact.Region = TrimOrNull(request.Region);
    contact.Country = TrimOrNull(request.Country);
    contact.Notes = TrimOrNull(request.Notes);
    contact.IsActive = request.IsActive;
  }

  private static void Apply(ContactEntity contact, UpdateContactRequest request) => Apply(
    contact,
    new CreateContactRequest(
      request.Name,
      request.Kind,
      request.IsCustomer,
      request.IsSupplier,
      request.PrimaryPhoneNumber,
      request.SecondaryPhoneNumber,
      request.Email,
      request.Address,
      request.City,
      request.Region,
      request.Country,
      request.Notes,
      request.IsActive));

  private static void ValidateRoles(bool isCustomer, bool isSupplier)
  {
    if (!isCustomer && !isSupplier)
      throw new BadRequestException(
        ErrorCodes.Contact.RoleRequired,
        "A contact must be a customer, a supplier, or both.");
  }

  private static string? TrimOrNull(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private static string? NormalizePhone(string? value)
  {
    if (string.IsNullOrWhiteSpace(value)) return null;

    var digits = new string(value.Where(char.IsDigit).ToArray());
    return digits.Length == 0 ? null : digits;
  }

  private static ContactResponse ToResponse(ContactEntity contact) => new(
    contact.Id,
    contact.Name,
    contact.Kind,
    contact.IsCustomer,
    contact.IsSupplier,
    contact.PrimaryPhoneNumber,
    contact.SecondaryPhoneNumber,
    contact.Email,
    contact.Address,
    contact.City,
    contact.Region,
    contact.Country,
    contact.Notes,
    contact.IsActive);
}
