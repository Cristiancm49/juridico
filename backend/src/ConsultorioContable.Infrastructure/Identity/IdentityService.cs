using ConsultorioContable.Application.Common;
using ConsultorioContable.Application.Identity;
using Microsoft.AspNetCore.Identity;

namespace ConsultorioContable.Infrastructure.Identity;

public sealed class IdentityService(
    UserManager<ApplicationUser> userManager,
    IClock clock) : IIdentityService
{
    public async Task<AuthenticatedIdentity?> ValidateCredentialsAsync(
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var user = await userManager.FindByEmailAsync(email);
        if (user is null || !user.Activo || await userManager.IsLockedOutAsync(user))
        {
            return null;
        }

        if (!await userManager.CheckPasswordAsync(user, password))
        {
            await userManager.AccessFailedAsync(user);
            return null;
        }

        await userManager.ResetAccessFailedCountAsync(user);
        user.UltimoAccesoEn = clock.UtcNow;
        user.ActualizadoEn = clock.UtcNow;
        await userManager.UpdateAsync(user);

        var roles = await userManager.GetRolesAsync(user);

        return new AuthenticatedIdentity(
            user.Id,
            user.Email!,
            user.NombreCompleto,
            roles.ToArray());
    }
}

