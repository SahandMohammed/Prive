using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Api.Modules.Pos;

internal static class PosConcurrency
{
  public static bool IsConflict(Exception exception)
  {
    for (Exception? current = exception; current is not null; current = current.InnerException)
    {
      if (current is DbUpdateConcurrencyException) return true;
      if (current is PostgresException postgres
        && (postgres.SqlState == PostgresErrorCodes.SerializationFailure
          || postgres.SqlState == PostgresErrorCodes.DeadlockDetected
          || postgres.SqlState == PostgresErrorCodes.UniqueViolation)) return true;
    }
    return false;
  }
}
