namespace ConsultorioContable.Application.Asistente;

public interface IAsistenteLenguajeNatural
{
    Task<InterpretacionAsistente?> InterpretarAsync(
        string pregunta,
        OpcionesInterpretacionAsistente opciones,
        CancellationToken cancellationToken);
}

public sealed record OpcionesInterpretacionAsistente(
    IReadOnlyCollection<string> Areas,
    IReadOnlyCollection<string> Periodos,
    DateOnly FechaActual);

public sealed record InterpretacionAsistente(
    TipoConsultaAsistente Tipo,
    string? Area,
    string? NumeroCaso,
    string? Persona = null,
    RolPersonaAsistente RolPersona = RolPersonaAsistente.Cualquiera,
    string? Periodo = null,
    DateOnly? Desde = null,
    DateOnly? Hasta = null,
    DimensionComparacionAsistente AgruparPor = DimensionComparacionAsistente.Area,
    EntidadComparacionAsistente Entidad = EntidadComparacionAsistente.Casos);

public enum TipoConsultaAsistente
{
    Resumen,
    Retrasados,
    SinAsignar,
    Pendientes,
    Cerrados,
    Activos,
    Caso,
    CasosAsignados,
    CargaResponsable,
    SesionesRealizadas,
    SesionesProximas,
    CompromisosPendientes,
    DocumentosFaltantes,
    VersionesDocumentos,
    SolicitudesSinCaso,
    Comparacion
}

public enum RolPersonaAsistente
{
    Cualquiera,
    Docente,
    Estudiante,
    Responsable
}

public enum DimensionComparacionAsistente
{
    Area,
    Periodo,
    Responsable,
    Estado,
    Mes
}

public enum EntidadComparacionAsistente
{
    Casos,
    Solicitudes,
    Sesiones
}
