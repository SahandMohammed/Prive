using Api.Modules.Business;

namespace Api.Shared.Time;

public static class BusinessTime
{
  public static DateOnly DateAt(BusinessEntity business, DateTime utc) =>
    DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone(business)));

  public static (DateTime FromUtc, DateTime ToUtc) UtcRange(BusinessEntity business, DateOnly from, DateOnly toInclusive)
  {
    var zone = Zone(business);
    var fromUtc = TimeZoneInfo.ConvertTimeToUtc(from.ToDateTime(TimeOnly.MinValue), zone);
    var toUtc = TimeZoneInfo.ConvertTimeToUtc(toInclusive.AddDays(1).ToDateTime(TimeOnly.MinValue), zone);
    return (fromUtc, toUtc);
  }

  private static TimeZoneInfo Zone(BusinessEntity business) => TimeZoneInfo.FindSystemTimeZoneById(
    string.IsNullOrWhiteSpace(business.TimeZoneId) ? BusinessEntity.DefaultTimeZoneId : business.TimeZoneId);
}
