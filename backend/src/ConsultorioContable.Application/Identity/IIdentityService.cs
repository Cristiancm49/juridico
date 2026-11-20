namespace ConsultorioContable.Application.Identity;

public interface IIdentityService
{
    Task<AuthenticatedIdentity?> ValidateCredentialsAsync(
        string email,
        string password,
        CancellationToken cancellationToken);
}

