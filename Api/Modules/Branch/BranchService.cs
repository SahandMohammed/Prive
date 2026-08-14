using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Branch;

public sealed class BranchService
{
  private readonly AppDbContext _db;

  public BranchService(AppDbContext db) => _db = db;

  public async Task<PagedResult<BranchResponse>> GetAllAsync(BranchListQuery request, CancellationToken ct = default)
  {
    var query = _db.Branches.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(branch => branch.Code.ToLower().Contains(search) || branch.Name.ToLower().Contains(search));
    }
    if (request.IsActive is not null)
      query = query.Where(branch => branch.IsActive == request.IsActive);

    return await query
      .OrderByDescending(branch => branch.IsMainBranch)
      .ThenBy(branch => branch.Name)
      .ThenBy(branch => branch.Id)
      .Select(branch => ToResponse(branch))
      .ToPagedResultAsync(request, ct);
  }

  public async Task<BranchResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
  {
    var branch = await _db.Branches.AsNoTracking().SingleOrDefaultAsync(branch => branch.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Branch.NotFound, $"Branch with id '{id}' was not found.");

    return ToResponse(branch);
  }

  public async Task<BranchResponse> CreateAsync(CreateBranchRequest request, CancellationToken ct = default)
  {
    var code = NormalizeCode(request.Code);
    if (await _db.Branches.AnyAsync(branch => branch.Code == code, ct))
      throw new ConflictException(ErrorCodes.Branch.CodeTaken, $"Branch code '{code}' is already in use.");

    var hasMainBranch = await _db.Branches.AnyAsync(branch => branch.IsMainBranch, ct);
    if (!hasMainBranch && !request.IsMainBranch)
      throw new BadRequestException(ErrorCodes.Branch.MainBranchRequired, "The first branch must be the main branch.");
    if (request.IsMainBranch && !request.IsActive)
      throw new BadRequestException(ErrorCodes.Branch.MainBranchDeactivationNotAllowed, "The main branch must remain active.");

    var branch = new BranchEntity { IsMainBranch = false };
    Apply(branch, request, code);
    branch.IsMainBranch = false;
    _db.Branches.Add(branch);
    await _db.SaveChangesAsync(ct);

    if (request.IsMainBranch)
    {
      await SetAsMainBranchAsync(branch, ct);
      await _db.SaveChangesAsync(ct);
    }

    return ToResponse(branch);
  }

  public async Task<BranchResponse> UpdateAsync(Guid id, UpdateBranchRequest request, CancellationToken ct = default)
  {
    var branch = await _db.Branches.SingleOrDefaultAsync(branch => branch.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Branch.NotFound, $"Branch with id '{id}' was not found.");
    var code = NormalizeCode(request.Code);

    if (code != branch.Code && await _db.Branches.AnyAsync(other => other.Code == code && other.Id != id, ct))
      throw new ConflictException(ErrorCodes.Branch.CodeTaken, $"Branch code '{code}' is already in use.");
    if (branch.IsMainBranch && !request.IsMainBranch)
      throw new BadRequestException(ErrorCodes.Branch.MainBranchRequired, "Choose another main branch before removing the main designation.");
    if (branch.IsMainBranch && !request.IsActive)
      throw new BadRequestException(ErrorCodes.Branch.MainBranchDeactivationNotAllowed, "Choose another main branch before deactivating this branch.");
    if (request.IsMainBranch && !request.IsActive)
      throw new BadRequestException(ErrorCodes.Branch.MainBranchDeactivationNotAllowed, "The main branch must remain active.");

    Apply(branch, request, code);
    if (request.IsMainBranch && !branch.IsMainBranch)
    {
      branch.IsMainBranch = false;
      await SetAsMainBranchAsync(branch, ct);
    }
    else
    {
      branch.IsMainBranch = request.IsMainBranch;
    }

    await _db.SaveChangesAsync(ct);
    return ToResponse(branch);
  }

  public async Task DeactivateAsync(Guid id, CancellationToken ct = default)
  {
    var branch = await _db.Branches.SingleOrDefaultAsync(branch => branch.Id == id, ct)
      ?? throw new NotFoundException(ErrorCodes.Branch.NotFound, $"Branch with id '{id}' was not found.");
    if (branch.IsMainBranch)
      throw new BadRequestException(ErrorCodes.Branch.MainBranchDeactivationNotAllowed, "Choose another main branch before deactivating this branch.");

    branch.IsActive = false;
    await _db.SaveChangesAsync(ct);
  }

  private async Task SetAsMainBranchAsync(BranchEntity branch, CancellationToken ct)
  {
    await _db.Branches
      .Where(other => other.IsMainBranch && other.Id != branch.Id)
      .ExecuteUpdateAsync(setters => setters.SetProperty(other => other.IsMainBranch, false), ct);
    branch.IsMainBranch = true;
  }

  private static void Apply(BranchEntity branch, CreateBranchRequest request, string code)
  {
    branch.Code = code;
    branch.Name = request.Name.Trim();
    branch.PhoneNumber = TrimOrNull(request.PhoneNumber);
    branch.Email = TrimOrNull(request.Email);
    branch.Address = request.Address.Trim();
    branch.City = request.City.Trim();
    branch.Region = request.Region.Trim();
    branch.Country = request.Country.Trim();
    branch.IsActive = request.IsActive;
  }

  private static void Apply(BranchEntity branch, UpdateBranchRequest request, string code) => Apply(branch, new CreateBranchRequest(
    request.Code,
    request.Name,
    request.PhoneNumber,
    request.Email,
    request.Address,
    request.City,
    request.Region,
    request.Country,
    request.IsMainBranch,
    request.IsActive), code);

  private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();
  private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private static BranchResponse ToResponse(BranchEntity branch) => new(
    branch.Id,
    branch.Code,
    branch.Name,
    branch.PhoneNumber,
    branch.Email,
    branch.Address,
    branch.City,
    branch.Region,
    branch.Country,
    branch.IsMainBranch,
    branch.IsActive);
}
