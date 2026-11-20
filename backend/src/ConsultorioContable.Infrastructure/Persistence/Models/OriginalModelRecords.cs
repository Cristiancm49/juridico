namespace ConsultorioContable.Infrastructure.Persistence.Models;

public sealed class EmpresaRecord
{
    public Guid Id { get; set; }
    public required string TipoDocumento { get; set; }
    public required string NumeroDocumento { get; set; }
    public required string RazonSocial { get; set; }
    public string? Direccion { get; set; }
    public string? Municipio { get; set; }
    public string? Telefono { get; set; }
    public string? CorreoElectronico { get; set; }
    public string? RepresentanteLegal { get; set; }
    public bool Activo { get; set; } = true;
    public Guid? CreadoPor { get; set; }
    public Guid? ActualizadoPor { get; set; }
    public DateTimeOffset CreadoEn { get; set; }
    public DateTimeOffset ActualizadoEn { get; set; }
}

public sealed class DocenteRecord
{
    public Guid Id { get; set; }
    public Guid UsuarioId { get; set; }
    public string? CodigoDocente { get; set; }
    public required string NombreCompleto { get; set; }
    public string? CorreoInstitucional { get; set; }
    public string? Telefono { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreadoEn { get; set; }
    public DateTimeOffset ActualizadoEn { get; set; }
}

public sealed class EstudianteRecord
{
    public Guid Id { get; set; }
    public Guid UsuarioId { get; set; }
    public string? CodigoEstudiante { get; set; }
    public required string NombreCompleto { get; set; }
    public string? CorreoInstitucional { get; set; }
    public string? Telefono { get; set; }
    public string ProgramaAcademico { get; set; } = "Contaduría Pública";
    public int? Semestre { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreadoEn { get; set; }
    public DateTimeOffset ActualizadoEn { get; set; }
}

public sealed class EstadoSolicitudRecord
{
    public Guid Id { get; set; }
    public required string Codigo { get; set; }
    public required string Nombre { get; set; }
    public string? Descripcion { get; set; }
    public string? Color { get; set; }
    public short Orden { get; set; }
    public bool Terminal { get; set; }
}

public sealed class EstadoCasoRecord
{
    public Guid Id { get; set; }
    public required string Codigo { get; set; }
    public required string Nombre { get; set; }
    public string? Descripcion { get; set; }
    public string? Color { get; set; }
    public short Orden { get; set; }
    public bool Terminal { get; set; }
}

public sealed class CategoriaDocumentoRecord
{
    public Guid Id { get; set; }
    public required string Codigo { get; set; }
    public required string Nombre { get; set; }
    public string? Descripcion { get; set; }
    public bool Activo { get; set; } = true;
    public short Orden { get; set; }
}

public sealed class RevisionSolicitudRecord
{
    public long Id { get; set; }
    public Guid SolicitudId { get; set; }
    public Guid RevisadoPor { get; set; }
    public required string Resultado { get; set; }
    public string? Observacion { get; set; }
    public DateTimeOffset FechaRevision { get; set; }
}

public sealed class TrazabilidadEventoRecord
{
    public long Id { get; set; }
    public required string TipoEvento { get; set; }
    public required string EntidadTipo { get; set; }
    public required string EntidadId { get; set; }
    public string? EstadoAnterior { get; set; }
    public string? EstadoNuevo { get; set; }
    public required string Descripcion { get; set; }
    public string? Observacion { get; set; }
    public Guid UsuarioId { get; set; }
    public DateTimeOffset FechaEvento { get; set; }
}

public sealed class EvaluacionServicioRecord
{
    public Guid Id { get; set; }
    public Guid CasoId { get; set; }
    public Guid SolicitanteId { get; set; }
    public int CalificacionGeneral { get; set; }
    public int? ClaridadOrientacion { get; set; }
    public int? OportunidadAtencion { get; set; }
    public int? UtilidadServicio { get; set; }
    public string? Comentario { get; set; }
    public string? Recomendaciones { get; set; }
    public DateTimeOffset CreadoEn { get; set; }
}

public sealed class AvanceRecord
{
    public Guid Id { get; set; }
    public Guid CasoId { get; set; }
    public Guid EstudianteId { get; set; }
    public required string TipoAvance { get; set; }
    public required string Titulo { get; set; }
    public required string Descripcion { get; set; }
    public string? Resultado { get; set; }
    public string? Recomendacion { get; set; }
    public DateTimeOffset OcurridoEn { get; set; }
    public Guid? CreadoPor { get; set; }
    public Guid? ActualizadoPor { get; set; }
    public DateTimeOffset CreadoEn { get; set; }
    public DateTimeOffset ActualizadoEn { get; set; }
}

public sealed class RevisionAvanceRecord
{
    public long Id { get; set; }
    public Guid AvanceId { get; set; }
    public Guid DocenteId { get; set; }
    public required string Resultado { get; set; }
    public string? Observacion { get; set; }
    public DateTimeOffset FechaRevision { get; set; }
}
