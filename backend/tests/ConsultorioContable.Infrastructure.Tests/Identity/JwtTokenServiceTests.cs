using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ConsultorioContable.Application.Common;
using ConsultorioContable.Application.Identity;
using ConsultorioContable.Infrastructure.Identity;
using Microsoft.Extensions.Options;

namespace ConsultorioContable.Infrastructure.Tests.Identity;

public sealed class JwtTokenServiceTests
{
    [Fact]
    public void Token_contiene_identidad_rol_y_expiracion()
    {
        var now = new DateTimeOffset(2026, 11, 3, 2, 0, 0, TimeSpan.Zero);
        var options = Options.Create(new JwtOptions
        {
            Issuer = "ConsultorioContable.Api",
            Audience = "ConsultorioContable.Web",
            SigningKey = "Clave_de_prueba_con_mas_de_32_bytes_2026",
            ExpirationMinutes = 30
        });
        var service = new JwtTokenService(options, new FakeClock(now));
        var identity = new AuthenticatedIdentity(
            Guid.NewGuid(),
            "admin@consultorio.local",
            "Administrador",
            [SystemRoles.Admin]);

        var result = service.CreateAccessToken(identity);
        var token = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);

        Assert.Equal(now.AddMinutes(30), result.ExpiresAt);
        Assert.Equal("ConsultorioContable.Api", token.Issuer);
        Assert.Contains("ConsultorioContable.Web", token.Audiences);
        Assert.Contains(token.Claims, claim =>
            claim.Type == ClaimTypes.Role && claim.Value == SystemRoles.Admin);
    }

    private sealed class FakeClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }
}
