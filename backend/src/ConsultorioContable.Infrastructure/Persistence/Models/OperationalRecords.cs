namespace ConsultorioContable.Infrastructure.Persistence.Models;

public sealed class CasoRecord
{
    public Guid Id { get; set; }
    public required string Numero { get; set; }
    public Guid SolicitanteId { get; set; }
    public Guid AreaAsesoriaId { get; set; }
    public Guid? SolicitudOrigenId { get; set; }
    public Guid? EstadoId { get; set; }
    public string? Titulo { get; set; }
    public string? Descripcion { get; set; }
    public DateOnly? FechaApertura { get; set; }
    public DateOnly? FechaCierre { get; set; }
    public Guid? CreadoPor { get; set; }
    public Guid? ActualizadoPor { get; set; }
    public DateTimeOffset? CreadoEn { get; set; }
    public required string Responsable { get; set; }
    public required string Estado { get; set; }
    public DateTimeOffset ActualizadoEn { get; set; }
}

public sealed class AsignacionRecord
{
    public Guid Id { get; set; }
    public Guid CasoId { get; set; }
    public Guid? DocenteId { get; set; }
    public Guid? EstudianteId { get; set; }
    public Guid? AsignadoPor { get; set; }
    public required string Area { get; set; }
    public required string Docente { get; set; }
    public required string Estudiante { get; set; }
    public DateTimeOffset? AsignadoEn { get; set; }
    public DateTimeOffset? DesasignadoEn { get; set; }
    public string? Comentario { get; set; }
    public required string Estado { get; set; }
}

public sealed class SesionRecord
{
    public Guid Id { get; set; }
    public Guid CasoId { get; set; }
    public DateTimeOffset Fecha { get; set; }
    public required string Tipo { get; set; }
    public required string Responsable { get; set; }
    public short Compromisos { get; set; }
    public required string Estado { get; set; }
}

public sealed class DocumentoRecord
{
    public Guid Id { get; set; }
    public Guid CasoId { get; set; }
    public Guid? SolicitudId { get; set; }
    public Guid? AvanceId { get; set; }
    public Guid? EvaluacionId { get; set; }
    public Guid? CategoriaId { get; set; }
    public Guid? GrupoDocumentoId { get; set; }
    public int? NumeroVersion { get; set; }
    public bool EsVigente { get; set; } = true;
    public required string Nombre { get; set; }
    public required string Categoria { get; set; }
    public required string Version { get; set; }
    public required string Responsable { get; set; }
    public string? RutaAlmacenamiento { get; set; }
    public string? Extension { get; set; }
    public string? HashArchivo { get; set; }
    public string? Descripcion { get; set; }
    public Guid? CargadoPor { get; set; }
    public DateTimeOffset? CreadoEn { get; set; }
    public DateTimeOffset ActualizadoEn { get; set; }
    public byte[]? Contenido { get; set; }
    public string? MimeType { get; set; }
    public long Tamano { get; set; }
}

public sealed class NotificacionRecord
{
    public Guid Id { get; set; }
    public DateTimeOffset Fecha { get; set; }
    public Guid? UsuarioId { get; set; }
    public required string Destinatario { get; set; }
    public required string Tipo { get; set; }
    public required string Asunto { get; set; }
    public string? Mensaje { get; set; }
    public string? EntidadRelacionada { get; set; }
    public string? EntidadId { get; set; }
    public DateTimeOffset? LeidoEn { get; set; }
    public DateTimeOffset? CreadoEn { get; set; }
    public required string Canal { get; set; }
    public required string Estado { get; set; }
}

public sealed class AuditoriaRecord
{
    public Guid Id { get; set; }
    public DateTimeOffset Fecha { get; set; }
    public Guid? UsuarioId { get; set; }
    public required string Usuario { get; set; }
    public required string Modulo { get; set; }
    public required string Operacion { get; set; }
    public required string Resultado { get; set; }
    public required string Detalle { get; set; }
    public string? TipoEntidad { get; set; }
    public string? EntidadId { get; set; }
    public string? DireccionIp { get; set; }
    public string? AgenteUsuario { get; set; }
}
