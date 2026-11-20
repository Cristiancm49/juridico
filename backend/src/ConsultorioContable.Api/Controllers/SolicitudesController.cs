using ConsultorioContable.Api.Contracts.Solicitudes;
using ConsultorioContable.Application.Identity;
using ConsultorioContable.Application.Solicitudes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConsultorioContable.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/solicitudes")]
public sealed class SolicitudesController(SolicitudService service) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora}")]
    [ProducesResponseType<IReadOnlyCollection<SolicitudDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<SolicitudDto>>> Listar(
        CancellationToken cancellationToken) =>
        Ok(await service.ListarAsync(cancellationToken));

    [HttpPost]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora},{SystemRoles.Solicitante}")]
    [ProducesResponseType<SolicitudDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<SolicitudDto>> Crear(
        CrearSolicitudRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CrearSolicitudCommand(
            request.SolicitanteId,
            request.AreaAsesoriaId,
            request.PeriodoAcademicoId,
            request.Asunto,
            request.DescripcionNecesidad,
            request.CanalRecepcion);

        var solicitud = await service.CrearAsync(command, cancellationToken);

        return CreatedAtAction(nameof(Obtener), new { id = solicitud.Id }, solicitud);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora}")]
    [ProducesResponseType<SolicitudDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SolicitudDto>> Obtener(
        Guid id,
        CancellationToken cancellationToken)
    {
        var solicitud = await service.ObtenerAsync(id, cancellationToken);
        return solicitud is null ? NotFound() : Ok(solicitud);
    }

    [HttpPost("{id:guid}/transiciones")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora}")]
    [ProducesResponseType<SolicitudDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SolicitudDto>> Transicionar(
        Guid id,
        TransicionarSolicitudRequest request,
        CancellationToken cancellationToken)
    {
        var solicitud = await service.TransicionarAsync(id, request.Transicion, cancellationToken);
        return solicitud is null ? NotFound() : Ok(solicitud);
    }
}

