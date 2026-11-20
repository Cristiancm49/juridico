using ConsultorioContable.Application.Catalogos;
using ConsultorioContable.Application.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConsultorioContable.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/catalogos")]
public sealed class CatalogosController(CatalogoService service) : ControllerBase
{
    [HttpGet("areas")]
    public async Task<ActionResult<IReadOnlyCollection<AreaAsesoriaDto>>> ListarAreas(
        CancellationToken cancellationToken) =>
        Ok(await service.ListarAreasAsync(cancellationToken));

    [HttpGet("periodos")]
    public async Task<ActionResult<IReadOnlyCollection<PeriodoAcademicoDto>>> ListarPeriodos(
        CancellationToken cancellationToken) =>
        Ok(await service.ListarPeriodosAsync(cancellationToken));

    [HttpGet("solicitantes")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora}")]
    public async Task<ActionResult<IReadOnlyCollection<SolicitanteDto>>> ListarSolicitantes(
        CancellationToken cancellationToken) =>
        Ok(await service.ListarSolicitantesAsync(cancellationToken));

    [HttpPost("solicitantes")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora}")]
    public async Task<ActionResult<SolicitanteDto>> CrearSolicitante(
        CrearSolicitanteCommand command,
        CancellationToken cancellationToken) =>
        await ExecuteCreate(
            () => service.CrearSolicitanteAsync(command, Actor(), cancellationToken));

    [HttpPost("areas")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora}")]
    public async Task<ActionResult<AreaAsesoriaDto>> CrearArea(
        CrearAreaCommand command,
        CancellationToken cancellationToken) =>
        await ExecuteCreate(() => service.CrearAreaAsync(command, Actor(), cancellationToken));

    [HttpPost("periodos")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora}")]
    public async Task<ActionResult<PeriodoAcademicoDto>> CrearPeriodo(
        CrearPeriodoCommand command,
        CancellationToken cancellationToken) =>
        await ExecuteCreate(() => service.CrearPeriodoAsync(command, Actor(), cancellationToken));

    private string Actor() => User.Identity?.Name ?? "Usuario autenticado";

    private async Task<ActionResult<T>> ExecuteCreate<T>(Func<Task<T>> operation)
    {
        try
        {
            return Created(string.Empty, await operation());
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "No fue posible crear el registro",
                Detail = exception.Message
            });
        }
    }
}
