namespace Api.Shared.Domain;

public interface IPostableDocument
{
  DocumentStatus Status { get; set; }
}
