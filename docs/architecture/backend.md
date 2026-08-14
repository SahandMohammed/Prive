# Backend Architecture

Reference guide for building and extending the Prive ASP.NET Core API. Every module must follow these patterns exactly.

## Project layout

```
Api/
├── Infrastructure/              # Cross-cutting concerns (DO NOT put business logic here)
│   ├── Configuration/           # Strongly-typed options (JwtOptions, CorsOptions)
│   ├── Errors/                  # GlobalExceptionHandler (IExceptionHandler)
│   ├── Http/                    # ApiResponse<T>, ApiException hierarchy, ErrorCodes
│   └── OpenApi/                 # Swagger configuration
├── Modules/                     # Business modules — one directory per module
│   ├── Auth/                    # Authentication (login, refresh, logout, change-password)
│   └── User/                    # User management (CRUD)
├── Shared/                      # Reusable utilities shared across modules
│   ├── Pagination/              # PaginationRequest, PagedResult<T>, PaginationExtensions
│   └── Persistence/             # AppDbContext, AppDbContextFactory, DbSeeder
├── Migrations/                  # EF Core migrations (auto-generated)
└── Program.cs                   # Application bootstrap and middleware pipeline
```

## Module structure

Every module lives under `Api/Modules/<ModuleName>/` and follows this exact layout:

```
Modules/<ModuleName>/
├── <Name>Controller.cs                    # API endpoints
├── <Name>Service.cs                       # Business logic
├── <Name>Module.cs                        # DI registration extension method
├── DTOs/
│   └── <Name>Dtos.cs                      # All request/response records in one file
└── Entities/
    ├── <Name>Entity.cs                    # Entity class (+ enum if needed)
    └── <Name>EntityConfiguration.cs       # IEntityTypeConfiguration<T>
```

### Reference: User module (copy this pattern for new modules)

#### Entity — `Entities/UserEntity.cs`

```csharp
namespace Api.Modules.User;

public sealed class UserEntity
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Username { get; set; } = string.Empty;
  public string PasswordHash { get; set; } = string.Empty;
  public UserRole Role { get; set; } = UserRole.Unassigned;
  public bool IsActive { get; set; } = true;
  // ... other properties
}

public enum UserRole
{
  Unassigned = 0,
  SuperAdmin = 1,
  Owner = 2,
  // ...
}
```

Rules:
- Entity classes are `sealed`.
- Use `Guid` for primary keys, defaulted to `Guid.NewGuid()`.
- Enums live in the same file as the entity that owns them.
- No data annotations — all configuration goes in the `IEntityTypeConfiguration`.

#### EF Configuration — `Entities/UserEntityConfiguration.cs`

```csharp
namespace Api.Modules.User;

public sealed class UserEntityConfiguration : IEntityTypeConfiguration<UserEntity>
{
  public void Configure(EntityTypeBuilder<UserEntity> builder)
  {
    builder.ToTable("users");                                    // snake_case table name
    builder.HasKey(u => u.Id);
    builder.Property(u => u.Username).HasMaxLength(100).IsRequired();
    builder.HasIndex(u => u.Username).IsUnique();
    builder.Property(u => u.PasswordHash).HasMaxLength(512).IsRequired();
    builder.Property(u => u.Role).HasConversion<string>().HasMaxLength(32).IsRequired();
  }
}
```

Rules:
- Table names are **snake_case** (e.g., `users`, `refresh_tokens`, `appointments`).
- Enum columns use `.HasConversion<string>()` — never store as integers.
- All string columns must have `HasMaxLength()`.
- Configurations are auto-discovered by `modelBuilder.ApplyConfigurationsFromAssembly()` in `AppDbContext` — no manual registration needed.

#### DTOs — `DTOs/UserDtos.cs`

```csharp
namespace Api.Modules.User;

// Query parameters for list endpoints — extend PaginationRequest
public sealed class UserListQuery : PaginationRequest
{
  public string? Search { get; init; }
}

// Response DTO — always a record
public sealed record UserResponse(
  Guid Id, string Username, UserRole Role, bool IsActive, DateTime? LastLoginAtUtc);

// Create request — use DataAnnotations for shape validation
public sealed record CreateUserRequest(
  [Required, MinLength(3), MaxLength(100)] string Username,
  [Required, MinLength(8)] string Password,
  [Required] UserRole Role);

// Update request
public sealed record UpdateUserRequest(
  [MinLength(3), MaxLength(100)] string? Username,
  [Required] UserRole Role,
  bool IsActive);
```

Rules:
- All DTOs for a module go in **one file**: `<Name>Dtos.cs`.
- Use `sealed record` for DTOs.
- Use `DataAnnotations` (`[Required]`, `[MinLength]`, etc.) for input shape validation. The framework's `InvalidModelStateResponseFactory` auto-formats validation errors into the `ApiResponse` envelope.
- **Never expose entities as API responses.** Map entity → response DTO explicitly.
- List query classes extend `PaginationRequest` from `Api.Shared.Pagination`.

#### Service — `UserService.cs`

```csharp
public sealed class UserService
{
  private readonly AppDbContext _db;

  public UserService(AppDbContext db) { _db = db; }

  public async Task<PagedResult<UserResponse>> GetAllAsync(UserListQuery request, CancellationToken ct)
  {
    var query = _db.Users.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(request.Search))
    {
      var search = request.Search.Trim().ToLower();
      query = query.Where(u => u.Username.ToLower().Contains(search));
    }
    return await query
      .OrderBy(u => u.Username).ThenBy(u => u.Id)
      .Select(u => ToResponse(u))
      .ToPagedResultAsync(request, ct);        // ← Use the shared pagination extension
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
    // ... create entity, save, return response
  }

  private static UserResponse ToResponse(UserEntity u) => new(u.Id, u.Username, u.Role, u.IsActive, u.LastLoginAtUtc);
}
```

Rules:
- Services are `sealed` classes registered as `Scoped`.
- Inject `AppDbContext` directly — no repository abstraction.
- **Throw typed exceptions** for expected failures: `NotFoundException`, `ConflictException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`.
- Always pair exceptions with an `ErrorCodes` constant — never use inline strings.
- Use `.AsNoTracking()` for read-only queries.
- Map entities to response DTOs via a private static `ToResponse()` method.
- Use `ToPagedResultAsync()` for paginated queries.

#### Controller — `UserController.cs`

```csharp
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/users")]
[Authorize]
public sealed class UserController : ControllerBase
{
  private readonly UserService _userService;

  public UserController(UserService userService) { _userService = userService; }

  [HttpGet]
  [Authorize(Roles = "SuperAdmin,Manager")]
  [ProducesResponseType(typeof(ApiResponse<List<UserResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAll([FromQuery] UserListQuery query, CancellationToken ct)
  {
    var users = await _userService.GetAllAsync(query, ct);
    return Ok(ApiResponse<List<UserResponse>>.Ok(users.Items, users.ToMetadata()));
  }

  [HttpGet("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetById(Guid id)
  {
    var user = await _userService.GetByIdAsync(id);
    return Ok(ApiResponse<UserResponse>.Ok(user));
  }

  [HttpPost]
  [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status201Created)]
  public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
  {
    var user = await _userService.CreateAsync(request);
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(nameof(GetById), new { id = user.Id, version }, ApiResponse<UserResponse>.Ok(user));
  }

  [HttpPut("{id:guid}")]
  public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
  {
    var user = await _userService.UpdateAsync(id, request);
    return Ok(ApiResponse<UserResponse>.Ok(user));
  }

  [HttpDelete("{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  public async Task<IActionResult> Delete(Guid id)
  {
    await _userService.DeleteAsync(id);
    return NoContent();
  }
}
```

Rules:
- Controllers are `sealed`.
- Route pattern: `api/v{version:apiVersion}/<resource>` (plural, lowercase).
- **Always wrap** success data in `ApiResponse<T>.Ok(data)` or `ApiResponse<T>.Ok(data, metadata)`.
- **Never** write `ApiResponse.Fail()` in controllers — throw an exception and the `GlobalExceptionHandler` will format it.
- Use `[ProducesResponseType]` attributes on every endpoint.
- Use `[Authorize(Roles = "...")]` for role-based access — never rely on an implicit default.
- Delete and void-action endpoints return `NoContent()` (204).
- For `CreatedAtAction`, include the `version` route value for correct URL generation.
- Parse the current user ID from JWT: `Guid.TryParse(User.FindFirstValue("sub"), out var id)`.

#### Module registration — `UserModule.cs`

```csharp
namespace Api.Modules.User;

public static class UserModule
{
  public static IServiceCollection AddUserModule(this IServiceCollection services)
  {
    services.AddScoped<UserService>();
    return services;
  }
}
```

Then in `Program.cs`:
```csharp
builder.Services
  .AddUserModule()
  .AddAuthModule()
  .AddNewModule();  // ← chain new modules here
```

#### AppDbContext registration

Add `DbSet` properties for new entities:

```csharp
// In Api/Shared/Persistence/AppDbContext.cs
public DbSet<NewEntity> NewEntities => Set<NewEntity>();
```

EF configurations are auto-discovered — no additional registration needed.

## Existing infrastructure — USE IT, DON'T DUPLICATE

### Response envelope (`Api.Infrastructure.Http`)

```csharp
// Success with data:
ApiResponse<T>.Ok(data)

// Success with data + pagination:
ApiResponse<T>.Ok(data, paginationMetadata)

// Success with no body:
return NoContent();

// Errors — NEVER construct manually. Throw typed exceptions instead.
```

### Exception hierarchy (`Api.Infrastructure.Http.ApiException`)

| Exception | HTTP Status | When to use |
|-----------|------------|-------------|
| `NotFoundException` | 404 | Resource doesn't exist |
| `ConflictException` | 409 | Unique constraint violation, state conflict |
| `BadRequestException` | 400 | Invalid input that passed shape validation |
| `UnauthorizedException` | 401 | Missing, invalid, or expired credentials |
| `ForbiddenException` | 403 | Authenticated but insufficient permissions |

All require: `(string code, string message)` where `code` comes from `ErrorCodes`.

### Error codes (`Api.Infrastructure.Http.ErrorCodes`)

Add a new nested class per module:

```csharp
public static class ErrorCodes
{
  // ... existing Auth, User, Common groups ...

  public static class Appointments  // ← new module
  {
    public const string NotFound = "APPOINTMENT_NOT_FOUND";
    public const string TimeSlotConflict = "APPOINTMENT_TIME_SLOT_CONFLICT";
  }
}
```

### Pagination (`Api.Shared.Pagination`)

| Class | Purpose |
|-------|---------|
| `PaginationRequest` | Base class for list query parameters (Page, PageSize with defaults and normalization) |
| `PagedResult<T>` | Internal result carrying Items + TotalCount + computed metadata |
| `PaginationExtensions.ToPagedResultAsync()` | IQueryable extension: count + skip/take in one call |
| `PaginationMetadata` | Record sent in the `meta` field of `ApiResponse` |

Usage flow:
```
Query DTO extends PaginationRequest
  → Service calls query.ToPagedResultAsync(request, ct)
  → Controller returns ApiResponse<List<T>>.Ok(result.Items, result.ToMetadata())
```

### Global exception handler (`Api.Infrastructure.Errors.GlobalExceptionHandler`)

- Implements `IExceptionHandler` (registered via `AddExceptionHandler<>` in Program.cs)
- Maps `ApiException` → HTTP status code + `ApiResponse.Fail()` envelope
- Catches `OperationCanceledException` for client disconnects
- Logs 4xx at `Information`, 5xx at `Error`
- **You never need to modify this** — just throw the right exception type

## Checklist: adding a new module

1. Create `Api/Modules/<Name>/` with the directory structure shown above
2. Add error codes to `ErrorCodes.<Name>`
3. Create entity + configuration in `Entities/`
4. Create DTOs in `DTOs/<Name>Dtos.cs`
5. Create service in `<Name>Service.cs` — throw typed exceptions, use pagination
6. Create controller in `<Name>Controller.cs` — wrap in `ApiResponse<T>`, use `[Authorize]`
7. Create `<Name>Module.cs` with DI registration
8. Add `DbSet` to `AppDbContext.cs`
9. Chain `.Add<Name>Module()` in `Program.cs`
10. Run `dotnet ef migrations add <MigrationName>`
11. Run `dotnet build` — must pass with 0 errors, 0 warnings
