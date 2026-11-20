using ConsultorioContable.Domain.Solicitudes;

namespace ConsultorioContable.Application.Solicitudes;

public sealed record SolicitudDto(
    Guid Id,
    string Radicado,
    Guid SolicitanteId,
    Guid AreaAsesoriaId,
    Guid PeriodoAcademicoId,
    string Asunto,
    string DescripcionNecesidad,
    CanalRecepcion CanalRecepcion,
    EstadoSolicitud Estado,
    DateTimeOffset CreadoEn,
    DateTimeOffset ActualizadoEn);

