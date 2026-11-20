namespace ConsultorioContable.Application.Catalogos;

public sealed record SolicitanteDto(
    Guid Id,
    string TipoDocumento,
    string NumeroDocumento,
    string NombreCompleto,
    string? CorreoElectronico,
    string? Telefono,
    bool Activo);
