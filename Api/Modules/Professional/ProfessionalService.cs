using Api.Infrastructure.Http;
using Api.Modules.User;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Professional;

public sealed class ProfessionalService
{
  private readonly AppDbContext _db;

  public ProfessionalService(AppDbContext db) => _db = db;

  public async Task<PagedResult<ProfessionalResponse>> GetAllAsync(ProfessionalListQuery request, CancellationToken ct = default)
  {
    var query = _db.Professionals.AsNoTracking().AsQueryable();

    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      var normalizedPhone = NormalizePhone(request.Search);
      query = query.Where(professional =>
        professional.Name.ToLower().Contains(search)
        || (professional.Email != null && professional.Email.ToLower().Contains(search))
        || (professional.PhoneNumber != null && professional.PhoneNumber.ToLower().Contains(search))
        || (normalizedPhone != null && professional.PhoneNormalized != null && professional.PhoneNormalized.Contains(normalizedPhone)));
    }

    if (request.IsActive is not null)
      query = query.Where(professional => professional.IsActive == request.IsActive);
    if (request.BranchId is not null)
      query = query.Where(professional => professional.BranchAssignments.Any(assignment => assignment.BranchId == request.BranchId));

    return await query
      .OrderBy(professional => professional.Name)
      .ThenBy(professional => professional.Id)
      .Select(professional => new ProfessionalResponse(
        professional.Id,
        professional.Name,
        professional.PhoneNumber,
        professional.Email,
        professional.Notes,
        professional.IsActive,
        professional.BranchAssignments
          .OrderBy(assignment => assignment.Branch.Name)
          .ThenBy(assignment => assignment.Branch.Id)
          .Select(assignment => new ProfessionalBranchResponse(assignment.Branch.Id, assignment.Branch.Code, assignment.Branch.Name))
          .ToList(),
        professional.LinkedUser == null
          ? null
          : new ProfessionalLinkedUserResponse(professional.LinkedUser.Id, professional.LinkedUser.Username, professional.LinkedUser.IsActive)))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<ProfessionalResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
  {
    var professional = await ProfessionalQuery()
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw NotFound(id);
    return ToResponse(professional);
  }

  public async Task<ProfessionalResponse> CreateAsync(CreateProfessionalRequest request, CancellationToken ct = default)
  {
    var branchIds = await ValidateBranchIdsAsync(request.BranchIds, ct);
    var linkedUser = await ResolveLinkedUserAsync(request.LinkedUserId, null, ct);
    var professional = new ProfessionalEntity();
    Apply(professional, request);
    professional.BranchAssignments = branchIds
      .Select(branchId => new ProfessionalBranchAssignmentEntity { BranchId = branchId })
      .ToList();
    if (linkedUser is not null)
    {
      linkedUser.LinkedProfessionalId = professional.Id;
      professional.LinkedUser = linkedUser;
    }

    _db.Professionals.Add(professional);
    await _db.SaveChangesAsync(ct);
    return await GetByIdAsync(professional.Id, ct);
  }

  public async Task<ProfessionalResponse> UpdateAsync(Guid id, UpdateProfessionalRequest request, CancellationToken ct = default)
  {
    var professional = await ProfessionalQuery()
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw NotFound(id);
    var branchIds = await ValidateBranchIdsAsync(request.BranchIds, ct);
    var linkedUser = await ResolveLinkedUserAsync(request.LinkedUserId, id, ct);

    Apply(professional, request);
    SetLinkedUser(professional, linkedUser);
    UpdateAssignments(professional, branchIds);

    await _db.SaveChangesAsync(ct);
    return await GetByIdAsync(id, ct);
  }

  public Task ActivateAsync(Guid id, CancellationToken ct = default) => SetActiveAsync(id, true, ct);

  public Task DeactivateAsync(Guid id, CancellationToken ct = default) => SetActiveAsync(id, false, ct);

  public async Task DeleteAsync(Guid id, CancellationToken ct = default)
  {
    var professional = await ProfessionalQuery()
      .SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw NotFound(id);
    if (await _db.SalesInvoiceLines.IgnoreQueryFilters().AnyAsync(line => line.ProfessionalId == id, ct))
      throw new BadRequestException(ErrorCodes.Professional.HasHistory,
        "A Professional with sales history cannot be deleted. Deactivate the profile instead.");

    if (professional.LinkedUser is not null)
      professional.LinkedUser.LinkedProfessionalId = null;
    _db.Professionals.Remove(professional);
    await _db.SaveChangesAsync(ct);
  }

  public async Task<PagedResult<ProfessionalUserOptionResponse>> GetUserOptionsAsync(
    ProfessionalUserOptionsQuery request,
    CancellationToken ct = default)
  {
    var query = _db.Users.AsNoTracking().Where(user => user.Role == UserRole.Professional
      && (user.LinkedProfessionalId == null || user.LinkedProfessionalId == request.ProfessionalId));
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(user => user.Username.ToLower().Contains(search));
    }

    return await query.OrderBy(user => user.Username).ThenBy(user => user.Id)
      .Select(user => new ProfessionalUserOptionResponse(user.Id, user.Username, user.IsActive))
      .ToPagedResultAsync(request, ct);
  }

  private IQueryable<ProfessionalEntity> ProfessionalQuery() => _db.Professionals
    .Include(professional => professional.LinkedUser)
    .Include(professional => professional.BranchAssignments).ThenInclude(assignment => assignment.Branch);

  private async Task<Guid[]> ValidateBranchIdsAsync(Guid[] branchIds, CancellationToken ct)
  {
    var distinctIds = branchIds.Where(id => id != Guid.Empty).Distinct().ToArray();
    if (distinctIds.Length != branchIds.Length
      || await _db.Branches.CountAsync(branch => distinctIds.Contains(branch.Id) && branch.IsActive, ct) != distinctIds.Length)
      throw new BadRequestException(ErrorCodes.Professional.BranchInvalid, "Choose active branches only.");
    return distinctIds;
  }

  private async Task<UserEntity?> ResolveLinkedUserAsync(Guid? userId, Guid? professionalId, CancellationToken ct)
  {
    if (userId is null) return null;

    var user = await _db.Users.SingleOrDefaultAsync(item => item.Id == userId, ct)
      ?? throw new BadRequestException(ErrorCodes.Professional.LinkedUserInvalid,
        "Choose an existing Professional user account.");
    if (user.Role != UserRole.Professional)
      throw new BadRequestException(ErrorCodes.Professional.LinkedUserInvalid,
        "Only a Professional-role user account can be linked to a Professional profile.");
    if (user.LinkedProfessionalId is not null && user.LinkedProfessionalId != professionalId)
      throw new ConflictException(ErrorCodes.Professional.LinkedUserAlreadyAssigned,
        "This user account is already linked to another Professional profile.");
    return user;
  }

  private static void SetLinkedUser(ProfessionalEntity professional, UserEntity? linkedUser)
  {
    var currentUser = professional.LinkedUser;
    if (currentUser?.Id == linkedUser?.Id) return;

    if (currentUser is not null)
      currentUser.LinkedProfessionalId = null;
    if (linkedUser is not null)
      linkedUser.LinkedProfessionalId = professional.Id;
    professional.LinkedUser = linkedUser;
  }

  private static void UpdateAssignments(ProfessionalEntity professional, IReadOnlyCollection<Guid> branchIds)
  {
    var existing = professional.BranchAssignments.ToList();
    foreach (var assignment in existing.Where(assignment => !branchIds.Contains(assignment.BranchId)))
      professional.BranchAssignments.Remove(assignment);
    foreach (var branchId in branchIds.Where(branchId => existing.All(assignment => assignment.BranchId != branchId)))
      professional.BranchAssignments.Add(new ProfessionalBranchAssignmentEntity { BranchId = branchId });
  }

  private async Task SetActiveAsync(Guid id, bool isActive, CancellationToken ct)
  {
    var professional = await _db.Professionals.SingleOrDefaultAsync(item => item.Id == id, ct)
      ?? throw NotFound(id);
    professional.IsActive = isActive;
    await _db.SaveChangesAsync(ct);
  }

  private static void Apply(ProfessionalEntity professional, CreateProfessionalRequest request)
  {
    professional.Name = request.Name.Trim();
    professional.PhoneNumber = TrimOrNull(request.PhoneNumber);
    professional.PhoneNormalized = NormalizePhone(request.PhoneNumber);
    professional.Email = TrimOrNull(request.Email)?.ToLowerInvariant();
    professional.Notes = TrimOrNull(request.Notes);
    professional.IsActive = request.IsActive;
  }

  private static void Apply(ProfessionalEntity professional, UpdateProfessionalRequest request) => Apply(professional,
    new CreateProfessionalRequest(request.Name, request.PhoneNumber, request.Email, request.Notes,
      request.BranchIds, request.LinkedUserId, request.IsActive));

  private static ProfessionalResponse ToResponse(ProfessionalEntity professional) => new(
    professional.Id,
    professional.Name,
    professional.PhoneNumber,
    professional.Email,
    professional.Notes,
    professional.IsActive,
    professional.BranchAssignments.OrderBy(assignment => assignment.Branch.Name).ThenBy(assignment => assignment.Branch.Id)
      .Select(assignment => new ProfessionalBranchResponse(assignment.Branch.Id, assignment.Branch.Code, assignment.Branch.Name)).ToList(),
    professional.LinkedUser is null ? null : new ProfessionalLinkedUserResponse(
      professional.LinkedUser.Id, professional.LinkedUser.Username, professional.LinkedUser.IsActive));

  private static NotFoundException NotFound(Guid id) => new(ErrorCodes.Professional.NotFound,
    $"Professional with id '{id}' was not found.");

  private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private static string? NormalizePhone(string? value)
  {
    if (string.IsNullOrWhiteSpace(value)) return null;
    var digits = new string(value.Where(char.IsDigit).ToArray());
    return digits.Length == 0 ? null : digits;
  }
}
