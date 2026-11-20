using ConsultorioContable.Application.Auth;
using ConsultorioContable.Application.Identity;

namespace ConsultorioContable.Application.Tests.Auth;

public sealed class AuthServiceTests
{
    [Fact]
    public async Task Credenciales_validas_generan_token()
    {
        var identity = new AuthenticatedIdentity(
            Guid.NewGuid(),
            "admin@consultorio.local",
            "Administrador",
            [SystemRoles.Admin]);
        var service = new AuthService(
            new FakeIdentityService(identity),
            new FakeTokenService());

        var result = await service.LoginAsync(
            new LoginCommand(identity.Email, "Password_123!"),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("token-de-prueba", result.AccessToken);
        Assert.Contains(SystemRoles.Admin, result.Roles);
    }

    [Fact]
    public async Task Credenciales_invalidas_no_generan_token()
    {
        var service = new AuthService(
            new FakeIdentityService(null),
            new FakeTokenService());

        var result = await service.LoginAsync(
            new LoginCommand("nadie@consultorio.local", "incorrecta"),
            CancellationToken.None);

        Assert.Null(result);
    }

    private sealed class FakeIdentityService(AuthenticatedIdentity? identity) : IIdentityService
    {
        public Task<AuthenticatedIdentity?> ValidateCredentialsAsync(
            string email,
            string password,
            CancellationToken cancellationToken) =>
            Task.FromResult(identity);
    }

    private sealed class FakeTokenService : ITokenService
    {
        public AccessTokenResult CreateAccessToken(AuthenticatedIdentity identity) =>
            new(
                "token-de-prueba",
                new DateTimeOffset(2026, 11, 2, 21, 30, 0, TimeSpan.Zero));
    }
}
