using ConsultorioContable.Application.Common;
using ConsultorioContable.Domain.Solicitudes;

namespace ConsultorioContable.Application.Solicitudes;

public sealed class SolicitudService(ISolicitudRepository repository, IClock clock)
{
    private static readonly TimeSpan BogotaUtcOffset = TimeSpan.FromHours(-5);

    public async Task<SolicitudDto> CrearAsync(
        CrearSolicitudCommand command,
        CancellationToken cancellationToken)
    {
        var ahora = clock.UtcNow;
        var fechaInstitucional = ahora.ToOffset(BogotaUtcOffset);
        var id = Guid.NewGuid();
        var radicado = $"SOL-{fechaInstitucional:yyyyMMdd}-{id.ToString("N")[..8].ToUpperInvariant()}";

        var solicitud = SolicitudAsesoria.Crear(
            id,
            radicado,
            command.SolicitanteId,
            command.AreaAsesoriaId,
            command.PeriodoAcademicoId,
            command.Asunto,
            command.DescripcionNecesidad,
            command.CanalRecepcion,
            ahora);

        await repository.AddAsync(solicitud, cancellationToken);
        return Map(solicitud);
    }

    public async Task<SolicitudDto?> ObtenerAsync(Guid id, CancellationToken cancellationToken)
    {
        var solicitud = await repository.GetByIdAsync(id, cancellationToken);
        return solicitud is null ? null : Map(solicitud);
    }

    public async Task<IReadOnlyCollection<SolicitudDto>> ListarAsync(
        CancellationToken cancellationToken)
    {
        var solicitudes = await repository.ListAsync(cancellationToken);
        return solicitudes.Select(Map).ToArray();
    }

    public async Task<SolicitudDto?> TransicionarAsync(
        Guid id,
        TransicionSolicitud transicion,
        CancellationToken cancellationToken)
    {
        var solicitud = await repository.GetByIdAsync(id, cancellationToken);
        if (solicitud is null)
        {
            return null;
        }

        var ahora = clock.UtcNow;

        switch (transicion)
        {
            case TransicionSolicitud.IniciarRevision:
                solicitud.IniciarRevision(ahora);
                break;
            case TransicionSolicitud.SolicitarInformacion:
                solicitud.SolicitarInformacion(ahora);
                break;
            case TransicionSolicitud.Aprobar:
                solicitud.Aprobar(ahora);
                break;
            case TransicionSolicitud.Rechazar:
                solicitud.Rechazar(ahora);
                break;
            case TransicionSolicitud.Cancelar:
                solicitud.Cancelar(ahora);
                break;
            case TransicionSolicitud.ConvertirEnCaso:
                solicitud.ConvertirEnCaso(ahora);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(transicion), transicion, null);
        }

        await repository.UpdateAsync(solicitud, cancellationToken);
        return Map(solicitud);
    }

    private static SolicitudDto Map(SolicitudAsesoria solicitud) =>
        new(
            solicitud.Id,
            solicitud.Radicado,
            solicitud.SolicitanteId,
            solicitud.AreaAsesoriaId,
            solicitud.PeriodoAcademicoId,
            solicitud.Asunto,
            solicitud.DescripcionNecesidad,
            solicitud.CanalRecepcion,
            solicitud.Estado,
            solicitud.CreadoEn,
            solicitud.ActualizadoEn);
}

