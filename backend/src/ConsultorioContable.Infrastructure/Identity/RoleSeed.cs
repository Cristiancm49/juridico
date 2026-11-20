namespace ConsultorioContable.Infrastructure.Identity;

internal static class RoleSeed
{
    private static readonly DateTimeOffset SeedDate =
        new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    internal static IEnumerable<ApplicationRole> Roles =>
    [
        Role("30000000-0000-0000-0000-000000000001", "ADMIN", "Administra la configuracion general del sistema"),
        Role("30000000-0000-0000-0000-000000000002", "JEFE_PROGRAMA", "Consulta reportes e historico institucional"),
        Role("30000000-0000-0000-0000-000000000003", "COORDINADORA", "Revisa y gestiona solicitudes y casos"),
        Role("30000000-0000-0000-0000-000000000004", "DOCENTE", "Orienta y revisa los casos asignados"),
        Role("30000000-0000-0000-0000-000000000005", "ESTUDIANTE", "Ejecuta y reporta avances de los casos"),
        Role("30000000-0000-0000-0000-000000000006", "SOLICITANTE", "Registra y consulta solicitudes de asesoria")
    ];

    private static ApplicationRole Role(string id, string codigo, string descripcion) => new()
    {
        Id = Guid.Parse(id),
        Name = codigo,
        NormalizedName = codigo,
        Descripcion = descripcion,
        RolSistema = true,
        CreadoEn = SeedDate,
        ActualizadoEn = SeedDate
    };
}

