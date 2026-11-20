namespace ConsultorioContable.Infrastructure.Persistence.Models;

public sealed class SolicitanteRecord
{
    public Guid Id { get; set; }
    public Guid? UsuarioId { get; set; }
    public Guid? EmpresaId { get; set; }
    public required string TipoDocumento { get; set; }
    public required string NumeroDocumento { get; set; }
    public required string NombreCompleto { get; set; }
    public string? CorreoElectronico { get; set; }
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string? Municipio { get; set; }
    public string? CargoORelacion { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreadoEn { get; set; }
    public DateTimeOffset ActualizadoEn { get; set; }
}

