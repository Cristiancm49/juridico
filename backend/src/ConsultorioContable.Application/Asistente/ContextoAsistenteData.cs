namespace ConsultorioContable.Application.Asistente;

public sealed record ContextoAsistenteData(
    IReadOnlyCollection<CasoAsistenteData> Casos,
    IReadOnlyCollection<AsignacionAsistenteData> Asignaciones,
    IReadOnlyCollection<SesionAsistenteData> Sesiones,
    IReadOnlyCollection<DocumentoAsistenteData> Documentos,
    IReadOnlyCollection<SolicitudAsistenteData> Solicitudes,
    IReadOnlyCollection<PeriodoAsistenteData> Periodos);

public sealed record CasoAsistenteData(
    Guid Id,
    string Numero,
    string Solicitante,
    string Area,
    string Responsable,
    string Estado,
    DateTimeOffset FechaReferencia,
    DateTimeOffset UltimaActividad,
    bool TieneAsignacion,
    Guid? SolicitudOrigenId);

public sealed record AsignacionAsistenteData(
    Guid Id,
    Guid CasoId,
    string CasoNumero,
    string Area,
    string Docente,
    string Estudiante,
    DateTimeOffset? AsignadoEn,
    DateTimeOffset? DesasignadoEn,
    string Estado);

public sealed record SesionAsistenteData(
    Guid Id,
    Guid CasoId,
    string CasoNumero,
    DateTimeOffset Fecha,
    string Tipo,
    string Responsable,
    int Compromisos,
    string Estado);

public sealed record DocumentoAsistenteData(
    Guid Id,
    Guid CasoId,
    string CasoNumero,
    string Nombre,
    string Categoria,
    string Version,
    bool EsVigente,
    string Responsable,
    DateTimeOffset ActualizadoEn);

public sealed record SolicitudAsistenteData(
    Guid Id,
    string Radicado,
    string Solicitante,
    string Area,
    string Periodo,
    string Asunto,
    string Estado,
    DateTimeOffset CreadoEn,
    bool TieneCaso);

public sealed record PeriodoAsistenteData(
    string Codigo,
    string Nombre,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    bool Activo);
