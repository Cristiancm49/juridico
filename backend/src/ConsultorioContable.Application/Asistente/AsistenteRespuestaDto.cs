namespace ConsultorioContable.Application.Asistente;

public sealed record CasoAsistenteDto(
    Guid Id,
    string Numero,
    string Solicitante,
    string Area,
    string Responsable,
    string Estado,
    DateTimeOffset UltimaActividad,
    int DiasSinActividad,
    bool Retrasado,
    bool TieneAsignacion);

public sealed record AsistenteRespuestaDto(
    string Respuesta,
    string Criterio,
    IReadOnlyCollection<CasoAsistenteDto> Casos,
    IReadOnlyCollection<string> Sugerencias,
    bool AsistidoPorIa,
    IReadOnlyCollection<SeccionAsistenteDto> Secciones);

public sealed record SeccionAsistenteDto(
    string Titulo,
    IReadOnlyCollection<string> Columnas,
    IReadOnlyCollection<IReadOnlyCollection<string>> Filas);
