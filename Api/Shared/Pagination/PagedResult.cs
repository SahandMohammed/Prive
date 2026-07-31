namespace Api.Shared.Pagination;

public class PagedResult<T>
{
  public List<T> Items { get; set; } = new();
  public int TotalCount { get; set; }
  public int PageNumber { get; set; }
  public int PageSize { get; set; }
  public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);

  public PagedResult() { }

  public PagedResult(List<T> items, int totalCount, int pageNumber, int pageSize)
  {
    Items = items;
    TotalCount = totalCount;
    PageNumber = pageNumber;
    PageSize = pageSize;
  }
}
