namespace Api.Shared.Pagination;

public sealed class PagedResult<T>(List<T> items, int totalCount, int page, int pageSize)
{
  public List<T> Items { get; } = items;
  public int TotalCount { get; } = totalCount;
  public int Page { get; } = page;
  public int PageSize { get; } = pageSize;
  public int TotalPages => TotalCount == 0 ? 0 : (int)Math.Ceiling((double)TotalCount / PageSize);
  public bool HasPreviousPage => Page > 1;
  public bool HasNextPage => Page < TotalPages;

  public PaginationMetadata ToMetadata() => new(Page, PageSize, TotalCount, TotalPages, HasPreviousPage, HasNextPage);
}
