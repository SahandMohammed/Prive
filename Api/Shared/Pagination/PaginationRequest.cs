namespace Api.Shared.Pagination;

public class PaginationRequest
{
  public const int DefaultPage = 1;
  public const int DefaultPageSize = 20;
  public const int MaximumPageSize = 100;

  public int Page { get; init; } = DefaultPage;
  public int PageSize { get; init; } = DefaultPageSize;

  public PaginationRequest Normalize() => new()
  {
    Page = Page < DefaultPage ? DefaultPage : Page,
    PageSize = PageSize < 1 ? DefaultPageSize : Math.Min(PageSize, MaximumPageSize)
  };
}
