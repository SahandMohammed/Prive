using Api.Modules.Business;
using Api.Shared.Time;

namespace Api.Tests;

public sealed class BusinessTimeTests
{
  [Theory]
  [InlineData("")]
  [InlineData("   ")]
  public void Blank_saved_time_zone_uses_the_business_default(string timeZoneId)
  {
    var business = new BusinessEntity { TimeZoneId = timeZoneId };
    var localDate = new DateOnly(2026, 9, 25);

    Assert.Equal(localDate, BusinessTime.DateAt(business, new DateTime(2026, 9, 24, 21, 30, 0, DateTimeKind.Utc)));
    Assert.Equal(
      (new DateTime(2026, 9, 24, 21, 0, 0, DateTimeKind.Utc),
        new DateTime(2026, 9, 25, 21, 0, 0, DateTimeKind.Utc)),
      BusinessTime.UtcRange(business, localDate, localDate));
  }

  [Fact]
  public void Configured_time_zone_is_preserved()
  {
    var business = new BusinessEntity { TimeZoneId = "America/New_York" };

    Assert.Equal(new DateOnly(2026, 9, 24),
      BusinessTime.DateAt(business, new DateTime(2026, 9, 24, 21, 30, 0, DateTimeKind.Utc)));
  }
}
