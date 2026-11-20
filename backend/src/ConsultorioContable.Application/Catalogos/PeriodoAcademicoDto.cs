namespace ConsultorioContable.Application.Catalogos;

public sealed record PeriodoAcademicoDto(
    Guid Id,
    string Codigo,
    string Nombre,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    bool Activo);
