using ConsultorioContable.Domain.Solicitudes;

namespace ConsultorioContable.Api.Contracts.Solicitudes;

public sealed record CrearSolicitudRequest(
    Guid SolicitanteId,
    Guid AreaAsesoriaId,
    Guid PeriodoAcademicoId,
    string Asunto,
    string DescripcionNecesidad,
    CanalRecepcion CanalRecepcion);

