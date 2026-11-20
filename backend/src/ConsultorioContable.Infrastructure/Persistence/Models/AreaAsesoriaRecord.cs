namespace ConsultorioContable.Infrastructure.Persistence.Models;

public sealed class AreaAsesoriaRecord
{
    public Guid Id { get; set; }
    public required string Codigo { get; set; }
    public required string Nombre { get; set; }
    public string? Descripcion { get; set; }
    public bool Activo { get; set; } = true;
    public short Orden { get; set; }
}

