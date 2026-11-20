namespace ConsultorioContable.Application.Identity;

public interface ITokenService
{
    AccessTokenResult CreateAccessToken(AuthenticatedIdentity identity);
}

public sealed record AccessTokenResult(string Token, DateTimeOffset ExpiresAt);

