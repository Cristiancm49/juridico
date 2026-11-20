using ConsultorioContable.Domain.Solicitudes;

namespace ConsultorioContable.Application.Solicitudes;

public sealed record CrearSolicitudCommand(
    Guid SolicitanteId,
    Guid AreaAsesoriaId,
    Guid PeriodoAcademicoId,
    string Asunto,
    string DescripcionNecesidad,
    CanalRecepcion CanalRecepcion);

