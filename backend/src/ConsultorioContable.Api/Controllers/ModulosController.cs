using ConsultorioContable.Application.Identity;
using ConsultorioContable.Application.Modulos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConsultorioContable.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora}")]
[Route("api/modulos")]
public sealed class ModulosController(ModuleService service) : ControllerBase
{
    [HttpGet("{module}")]
    public async Task<ActionResult<ModuleViewDto>> Get(
        string module,
        CancellationToken cancellationToken)
    {
        var view = await service.GetAsync(module, cancellationToken);
        return view is null ? NotFound() : Ok(view);
    }

    [HttpPost("{module}")]
    public async Task<ActionResult<ModuleMutationResultDto>> Create(
        string module,
        [FromBody] Dictionary<string, string> values,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.CreateAsync(
                module,
                values,
                User.Identity?.Name ?? "Usuario autenticado",
                cancellationToken);
            return result is null ? NotFound() : Created($"/api/modulos/{module}", result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "No fue posible registrar la información",
                Detail = exception.Message
            });
        }
    }

    [HttpGet("documentos/{id:guid}/contenido")]
    public async Task<IActionResult> DownloadDocument(
        Guid id,
        CancellationToken cancellationToken)
    {
        var document = await service.GetDocumentAsync(id, cancellationToken);
        return document is null
            ? NotFound(new ProblemDetails { Title = "El documento no tiene un archivo almacenado." })
            : File(document.Contenido, document.MimeType, document.Nombre);
    }
}
