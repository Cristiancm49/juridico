namespace ConsultorioContable.Application.Auth;

public sealed record LoginResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    Guid UserId,
    string Email,
    string NombreCompleto,
    IReadOnlyCollection<string> Roles);

