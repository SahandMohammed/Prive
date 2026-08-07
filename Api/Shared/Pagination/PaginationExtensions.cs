using Microsoft.EntityFrameworkCore;

namespace Api.Shared.Pagination;

public static class PaginationExtensions
{
  public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
    this IQueryable<T> query,
    PaginationRequest request,
    CancellationToken ct = default)
  {
    var normalized = request.Normalize();
    var totalCount = await query.CountAsync(ct);
    var skip = Math.Min((long)(normalized.Page - 1) * normalized.PageSize, int.MaxValue);
    var items = await query.Skip((int)skip).Take(normalized.PageSize).ToListAsync(ct);

    return new PagedResult<T>(items, totalCount, normalized.Page, normalized.PageSize);
  }
}
