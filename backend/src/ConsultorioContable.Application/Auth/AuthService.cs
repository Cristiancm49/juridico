using ConsultorioContable.Application.Identity;

namespace ConsultorioContable.Application.Auth;

public sealed class AuthService(IIdentityService identityService, ITokenService tokenService)
{
    public async Task<LoginResponse?> LoginAsync(
        LoginCommand command,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.Email) || string.IsNullOrWhiteSpace(command.Password))
        {
            return null;
        }

        var identity = await identityService.ValidateCredentialsAsync(
            command.Email.Trim(),
            command.Password,
            cancellationToken);

        if (identity is null)
        {
            return null;
        }

        var accessToken = tokenService.CreateAccessToken(identity);

        return new LoginResponse(
            accessToken.Token,
            accessToken.ExpiresAt,
            identity.UserId,
            identity.Email,
            identity.NombreCompleto,
            identity.Roles);
    }
}

