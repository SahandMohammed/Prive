namespace Api.Shared.Domain;

public sealed record DocumentTransitionDto(
  Guid Id,
  DocumentStatus Status,
  DateTime? PostedAtUtc,
  DateTime? VoidedAtUtc);
