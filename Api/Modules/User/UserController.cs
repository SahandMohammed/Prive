using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.User
{
  [ApiController]
  [ApiVersion("1.0")]
  [Route("api/v{version:apiVersion}/users")]
  public class UserController : ControllerBase
  {
    [HttpGet]
    public IActionResult Get()
    {
      return Ok(new { message = "Hello from UsersController!" });
    }
  }
}
