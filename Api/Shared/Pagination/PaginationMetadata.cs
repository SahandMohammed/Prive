namespace Api.Shared.Pagination;

public sealed record PaginationMetadata(
  int Page,
  int PageSize,
  int TotalCount,
  int TotalPages,
  bool HasPreviousPage,
  bool HasNextPage);
