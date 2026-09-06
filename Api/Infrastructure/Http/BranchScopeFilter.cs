using System.Security.Claims;
using Api.Modules.Branch;
using Api.Shared.Persistence;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Api.Infrastructure.Http;

[AttributeUsage(AttributeTargets.Class)]
public sealed class BranchIndependentAttribute : Attribute;

// Opt-out is explicit: new product controllers require a validated branch by default.
public sealed class BranchScopeFilter(BranchService branches, BranchContext branchContext) : IAsyncResourceFilter, IAsyncActionFilter
{
  public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
  {
    if (context.ActionDescriptor is ControllerActionDescriptor action
      && !Attribute.IsDefined(action.ControllerTypeInfo, typeof(BranchIndependentAttribute)))
    {
      var user = context.HttpContext.User;
      if (!Guid.TryParse(user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        throw new UnauthorizedException(ErrorCodes.Common.Unauthorized, "Invalid token subject.");
      var branch = await branches.ValidateSelectionAsync(userId,
        context.HttpContext.Request.Headers["X-Branch-Id"].ToString(), context.HttpContext.RequestAborted);
      branchContext.BranchId = branch.Id;
      branchContext.CatalogBranchId = branch.CatalogMode == BranchCatalogMode.Separate ? branch.Id : null;
    }
    await next();
  }

  public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
  {
    if (branchContext.BranchId is Guid selected)
    {
      foreach (var argument in context.ActionArguments.Values)
      {
        if (argument?.GetType().GetProperty("BranchId")?.GetValue(argument) is Guid requested && requested != selected)
          throw new ForbiddenException(ErrorCodes.Branch.ScopeMismatch, "The request branch must match the selected branch.");
      }
    }
    await next();
  }
}
