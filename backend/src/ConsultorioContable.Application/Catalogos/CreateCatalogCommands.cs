namespace ConsultorioContable.Application.Catalogos;

public sealed record CrearSolicitanteCommand(
    string TipoDocumento,
    string NumeroDocumento,
    string NombreCompleto,
    string? CorreoElectronico,
    string? Telefono);

public sealed record CrearAreaCommand(
    string Codigo,
    string Nombre,
    string? Descripcion);

public sealed record CrearPeriodoCommand(
    string Codigo,
    string Nombre,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    bool Activo);
