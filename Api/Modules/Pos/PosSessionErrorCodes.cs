namespace Api.Modules.Pos;

internal static class PosSessionErrorCodes
{
  public const string RegisterNotFound = "POS_REGISTER_NOT_FOUND";
  public const string RegisterInactive = "POS_REGISTER_INACTIVE";
  public const string RegisterCodeTaken = "POS_REGISTER_CODE_TAKEN";
  public const string SessionNotFound = "POS_SESSION_NOT_FOUND";
  public const string SessionAlreadyOpen = "POS_SESSION_ALREADY_OPEN";
  public const string SessionRequired = "POS_SESSION_REQUIRED";
  public const string SessionClosed = "POS_SESSION_CLOSED";
  public const string SessionAccessDenied = "POS_SESSION_ACCESS_DENIED";
  public const string SessionCloseConflict = "POS_SESSION_CLOSE_CONFLICT";
  public const string OpeningCountInvalid = "POS_OPENING_COUNT_INVALID";
  public const string ClosingCountInvalid = "POS_CLOSING_COUNT_INVALID";
  public const string ZReportNotFound = "POS_Z_REPORT_NOT_FOUND";
}
