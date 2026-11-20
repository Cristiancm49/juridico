namespace ConsultorioContable.Infrastructure.Persistence.Models;

public sealed class PeriodoAcademicoRecord
{
    public Guid Id { get; set; }
    public required string Codigo { get; set; }
    public required string Nombre { get; set; }
    public DateOnly FechaInicio { get; set; }
    public DateOnly FechaFin { get; set; }
    public bool Activo { get; set; }
}

