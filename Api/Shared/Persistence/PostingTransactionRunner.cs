using System.Data;
using Api.Infrastructure.Http;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Api.Shared.Persistence;

public static class PostingTransactionRunner
{
  public static async Task<T> ExecuteSerializableAsync<T>(
    AppDbContext db,
    Func<CancellationToken, Task<T>> operation,
    CancellationToken ct)
  {
    await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

    try
    {
      var result = await operation(ct);
      await db.SaveChangesAsync(ct);
      await transaction.CommitAsync(ct);
      return result;
    }
    catch (PostgresException exception) when (
      exception.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.UniqueViolation)
    {
      throw ConcurrentOperation();
    }
    catch (DbUpdateException exception) when (
      exception.InnerException is PostgresException postgres &&
      postgres.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.UniqueViolation)
    {
      throw ConcurrentOperation();
    }
    catch (DbUpdateConcurrencyException)
    {
      throw ConcurrentOperation();
    }
  }

  private static ConflictException ConcurrentOperation() => new(
    ErrorCodes.Common.ConcurrentOperation,
    "The document changed during posting. Reload it and try again.");
}
