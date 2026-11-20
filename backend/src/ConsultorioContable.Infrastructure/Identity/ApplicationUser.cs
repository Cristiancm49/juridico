using Microsoft.AspNetCore.Identity;

namespace ConsultorioContable.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public required string NombreCompleto { get; set; }
    public bool Activo { get; set; } = true;
    public bool DebeCambiarContrasena { get; set; }
    public DateTimeOffset? UltimoAccesoEn { get; set; }
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;
}

