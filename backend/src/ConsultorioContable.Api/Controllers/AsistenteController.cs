using ConsultorioContable.Api.Contracts.Asistente;
using ConsultorioContable.Application.Asistente;
using ConsultorioContable.Application.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConsultorioContable.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.Coordinadora},{SystemRoles.JefePrograma}")]
[Route("api/asistente")]
public sealed class AsistenteController(AsistenteCasosService service) : ControllerBase
{
    [HttpPost("consultar")]
    public async Task<ActionResult<AsistenteRespuestaDto>> Consultar(
        ConsultarCasosRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await service.ConsultarAsync(request.Pregunta, cancellationToken));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "No fue posible procesar la consulta",
                Detail = exception.Message
            });
        }
    }
}
