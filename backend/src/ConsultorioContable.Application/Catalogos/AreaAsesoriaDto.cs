namespace ConsultorioContable.Application.Catalogos;

public sealed record AreaAsesoriaDto(
    Guid Id,
    string Codigo,
    string Nombre,
    string? Descripcion,
    bool Activo,
    short Orden);
