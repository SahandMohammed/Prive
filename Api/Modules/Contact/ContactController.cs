using Api.Infrastructure.Http;
using Api.Shared.Pagination;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Modules.Contact;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/contacts")]
[Authorize(Roles = "SuperAdmin,Manager")]
public sealed class ContactController : ControllerBase
{
  private readonly ContactService _contactService;

  public ContactController(ContactService contactService) => _contactService = contactService;

  [HttpGet]
  [ProducesResponseType(typeof(ApiResponse<List<ContactResponse>>), StatusCodes.Status200OK)]
  public async Task<IActionResult> GetAll([FromQuery] ContactListQuery query, CancellationToken ct)
  {
    var contacts = await _contactService.GetAllAsync(query, ct);
    return Ok(ApiResponse<List<ContactResponse>>.Ok(contacts.Items, contacts.ToMetadata()));
  }

  [HttpGet("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ContactResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
  {
    var contact = await _contactService.GetByIdAsync(id, ct);
    return Ok(ApiResponse<ContactResponse>.Ok(contact));
  }

  [HttpPost]
  [ProducesResponseType(typeof(ApiResponse<ContactResponse>), StatusCodes.Status201Created)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
  public async Task<IActionResult> Create([FromBody] CreateContactRequest request, CancellationToken ct)
  {
    var contact = await _contactService.CreateAsync(request, ct);
    var version = RouteData.Values["version"]?.ToString() ?? "1";
    return CreatedAtAction(
      nameof(GetById),
      new { id = contact.Id, version },
      ApiResponse<ContactResponse>.Ok(contact));
  }

  [HttpPut("{id:guid}")]
  [ProducesResponseType(typeof(ApiResponse<ContactResponse>), StatusCodes.Status200OK)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Update(
    Guid id,
    [FromBody] UpdateContactRequest request,
    CancellationToken ct)
  {
    var contact = await _contactService.UpdateAsync(id, request, ct);
    return Ok(ApiResponse<ContactResponse>.Ok(contact));
  }

  [HttpPost("{id:guid}/activate")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
  {
    await _contactService.ActivateAsync(id, ct);
    return NoContent();
  }

  [HttpPost("{id:guid}/deactivate")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
  {
    await _contactService.DeactivateAsync(id, ct);
    return NoContent();
  }

  [HttpDelete("{id:guid}")]
  [ProducesResponseType(StatusCodes.Status204NoContent)]
  [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
  public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
  {
    await _contactService.DeleteAsync(id, ct);
    return NoContent();
  }
}
