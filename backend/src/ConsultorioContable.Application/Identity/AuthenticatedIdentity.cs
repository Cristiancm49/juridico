namespace ConsultorioContable.Application.Identity;

public sealed record AuthenticatedIdentity(
    Guid UserId,
    string Email,
    string NombreCompleto,
    IReadOnlyCollection<string> Roles);

