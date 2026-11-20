using ConsultorioContable.Application.Common;
using ConsultorioContable.Application.Identity;
using ConsultorioContable.Domain.Solicitudes;
using ConsultorioContable.Infrastructure.Identity;
using ConsultorioContable.Infrastructure.Persistence.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ConsultorioContable.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static readonly Guid DemoSolicitanteId =
        Guid.Parse("40000000-0000-0000-0000-000000000001");

    public static async Task InitialiseDatabaseAsync(
        this IServiceProvider serviceProvider,
        IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        await using var scope = serviceProvider.CreateAsyncScope();
        var services = scope.ServiceProvider;
        var dbContext = services.GetRequiredService<ConsultorioDbContext>();

        if (IsEnabled(configuration["Database:ApplyMigrationsOnStartup"]))
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }

        if (!IsEnabled(configuration["Seed:Enabled"]))
        {
            return;
        }

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var clock = services.GetRequiredService<IClock>();
        var email = configuration["Seed:AdminEmail"];
        var password = configuration["Seed:AdminPassword"];
        var adminName = configuration["Seed:AdminName"] ?? "Administrador del sistema";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Seed habilitado sin Seed:AdminEmail o Seed:AdminPassword.");
        }

        var admin = await userManager.FindByEmailAsync(email);
        if (admin is null)
        {
            admin = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                NombreCompleto = adminName,
                Activo = true,
                LockoutEnabled = true,
                CreadoEn = clock.UtcNow,
                ActualizadoEn = clock.UtcNow
            };

            var createResult = await userManager.CreateAsync(admin, password);
            EnsureSucceeded(createResult, "crear el administrador local");

            var roleResult = await userManager.AddToRoleAsync(admin, SystemRoles.Admin);
            EnsureSucceeded(roleResult, "asignar el rol ADMIN");
        }
        else if (!await userManager.IsInRoleAsync(admin, SystemRoles.Admin))
        {
            EnsureSucceeded(
                await userManager.AddToRoleAsync(admin, SystemRoles.Admin),
                "asignar el rol ADMIN");
        }

        await EnsureConfiguredUsersAsync(userManager, configuration, clock.UtcNow);

        if (!IsEnabled(configuration["Seed:DemoData"]))
        {
            await DisableKnownDemoUsersAsync(userManager, email, clock.UtcNow);
            return;
        }

        await EnsureDemoUserAsync(
            userManager,
            Guid.Parse("50000000-0000-0000-0000-000000000002"),
            "coordinacion@consultorio.demo",
            "Ana Lucia Herrera",
            SystemRoles.Coordinadora,
            clock.UtcNow);
        await EnsureDemoUserAsync(
            userManager,
            Guid.Parse("50000000-0000-0000-0000-000000000003"),
            "laura.medina@uniamazonia.demo",
            "Laura Medina",
            SystemRoles.Docente,
            clock.UtcNow);
        await EnsureDemoUserAsync(
            userManager,
            Guid.Parse("50000000-0000-0000-0000-000000000004"),
            "santiago.lopez@uniamazonia.demo",
            "Santiago Lopez",
            SystemRoles.Estudiante,
            clock.UtcNow);
        await EnsureDemoUserAsync(
            userManager,
            Guid.Parse("50000000-0000-0000-0000-000000000005"),
            "demo@consultorio.local",
            "Empresa de demostracion",
            SystemRoles.Solicitante,
            clock.UtcNow);

        if (!await dbContext.Solicitantes.AnyAsync(
                x => x.Id == DemoSolicitanteId,
                cancellationToken))
        {
            dbContext.Solicitantes.Add(new SolicitanteRecord
            {
                Id = DemoSolicitanteId,
                TipoDocumento = "NIT",
                NumeroDocumento = "900000001",
                NombreCompleto = "Empresa de demostracion",
                CorreoElectronico = "demo@consultorio.local",
                Activo = true,
                CreadoEn = clock.UtcNow,
                ActualizadoEn = clock.UtcNow
            });

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await SeedDemonstrationDataAsync(dbContext, clock, cancellationToken);
        await SeedOperationalModulesAsync(dbContext, cancellationToken);
    }

    private static async Task SeedOperationalModulesAsync(
        ConsultorioDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var cases = new[]
        {
            new CasoRecord
            {
                Id = Guid.Parse("70000000-0000-0000-0000-000000000001"),
                Numero = "CAS-2026-001",
                SolicitanteId = Guid.Parse("40000000-0000-0000-0000-000000000005"),
                AreaAsesoriaId = Guid.Parse("20000000-0000-0000-0000-000000000004"),
                Responsable = "Laura Medina",
                Estado = "Activo",
                ActualizadoEn = DemoDate(3, 12, 40)
            },
            new CasoRecord
            {
                Id = Guid.Parse("70000000-0000-0000-0000-000000000002"),
                Numero = "CAS-2026-002",
                SolicitanteId = Guid.Parse("40000000-0000-0000-0000-000000000003"),
                AreaAsesoriaId = Guid.Parse("20000000-0000-0000-0000-000000000003"),
                Responsable = "Carlos Ramirez",
                Estado = "En seguimiento",
                ActualizadoEn = DemoDate(2, 16, 20)
            },
            new CasoRecord
            {
                Id = Guid.Parse("70000000-0000-0000-0000-000000000003"),
                Numero = "CAS-2026-003",
                SolicitanteId = Guid.Parse("40000000-0000-0000-0000-000000000002"),
                AreaAsesoriaId = Guid.Parse("20000000-0000-0000-0000-000000000002"),
                Responsable = "Diana Torres",
                Estado = "Pendiente",
                ActualizadoEn = DemoDate(1, 10, 30)
            },
            new CasoRecord
            {
                Id = Guid.Parse("70000000-0000-0000-0000-000000000004"),
                Numero = "CAS-2026-004",
                SolicitanteId = Guid.Parse("40000000-0000-0000-0000-000000000006"),
                AreaAsesoriaId = Guid.Parse("20000000-0000-0000-0000-000000000005"),
                Responsable = "Laura Medina",
                Estado = "Cerrado",
                ActualizadoEn = DemoDate(30, 15, 0, 10)
            }
        };
        await AddMissingAsync(dbContext, dbContext.Casos, cases, cancellationToken);

        var assignments = new[]
        {
            Assignment("71000000-0000-0000-0000-000000000001", cases[0].Id, "Inventarios", "Laura Medina", "Santiago Lopez", DemoDate(3, 9, 0), "Asignado"),
            Assignment("71000000-0000-0000-0000-000000000002", cases[1].Id, "Costos", "Carlos Ramirez", "Valentina Rojas", DemoDate(2, 14, 0), "Asignado"),
            Assignment("71000000-0000-0000-0000-000000000003", cases[2].Id, "Organizacion contable", "Diana Torres", "Por definir", null, "Pendiente"),
            Assignment("71000000-0000-0000-0000-000000000004", cases[3].Id, "Estados financieros", "Laura Medina", "Santiago Lopez", DemoDate(30, 8, 0, 10), "Finalizada")
        };
        await AddMissingAsync(dbContext, dbContext.Asignaciones, assignments, cancellationToken);

        var sessions = new[]
        {
            Session("72000000-0000-0000-0000-000000000001", cases[0].Id, DemoDate(4, 9, 0), "Diagnostico inicial", "Laura Medina", 3, "Programada"),
            Session("72000000-0000-0000-0000-000000000002", cases[1].Id, DemoDate(4, 14, 0), "Revision de costos", "Carlos Ramirez", 2, "Programada"),
            Session("72000000-0000-0000-0000-000000000003", cases[2].Id, DemoDate(1, 10, 30), "Organizacion documental", "Diana Torres", 2, "Realizada"),
            Session("72000000-0000-0000-0000-000000000004", cases[3].Id, DemoDate(28, 8, 0, 10), "Cierre y recomendaciones", "Laura Medina", 0, "Finalizada")
        };
        await AddMissingAsync(dbContext, dbContext.Sesiones, sessions, cancellationToken);

        var documents = new[]
        {
            Document("73000000-0000-0000-0000-000000000001", cases[0].Id, "Diagnostico contable.pdf", "Diagnostico", "v2", "Santiago Lopez", DemoDate(3, 11, 40)),
            Document("73000000-0000-0000-0000-000000000002", cases[1].Id, "Matriz de costos.xlsx", "Hoja de trabajo", "v3", "Valentina Rojas", DemoDate(2, 15, 25)),
            Document("73000000-0000-0000-0000-000000000003", cases[2].Id, "Plan de cuentas.xlsx", "Entregable", "v1", "Diana Torres", DemoDate(1, 9, 15)),
            Document("73000000-0000-0000-0000-000000000004", cases[3].Id, "Informe final.pdf", "Informe", "v1", "Laura Medina", DemoDate(30, 14, 10, 10))
        };
        await AddMissingAsync(dbContext, dbContext.Documentos, documents, cancellationToken);

        var notifications = new[]
        {
            Notification("74000000-0000-0000-0000-000000000001", DemoDate(3, 12, 40), "Coordinacion", "Asignacion", "Caso CAS-2026-001 asignado", "Sistema", "No leída"),
            Notification("74000000-0000-0000-0000-000000000002", DemoDate(3, 11, 15), "Panaderia La Esperanza", "Solicitud", "Informacion adicional requerida", "Correo", "Enviada"),
            Notification("74000000-0000-0000-0000-000000000003", DemoDate(3, 9, 30), "Laura Medina", "Compromiso", "Compromiso proximo a vencer", "Sistema", "No leída"),
            Notification("74000000-0000-0000-0000-000000000004", DemoDate(2, 16, 20), "Valentina Rojas", "Documento", "Documento aprobado", "Sistema", "Leída")
        };
        await AddMissingAsync(dbContext, dbContext.Notificaciones, notifications, cancellationToken);

        var audit = new[]
        {
            Audit("75000000-0000-0000-0000-000000000001", DemoDate(3, 13, 20), "Administrador local", "Autenticacion", "Inicio de sesion", "Exitoso", "Acceso mediante JWT"),
            Audit("75000000-0000-0000-0000-000000000002", DemoDate(3, 12, 55), "Ana Lucia Herrera", "Solicitudes", "Cambio de estado", "Exitoso", "Radicada a En revision"),
            Audit("75000000-0000-0000-0000-000000000003", DemoDate(3, 11, 40), "Laura Medina", "Documentos", "Carga de version", "Exitoso", "Diagnostico contable v2"),
            Audit("75000000-0000-0000-0000-000000000004", DemoDate(3, 10, 18), "Usuario desconocido", "Autenticacion", "Inicio de sesion", "Fallido", "Credenciales invalidas"),
            Audit("75000000-0000-0000-0000-000000000005", DemoDate(2, 16, 30), "Administrador local", "Usuarios", "Cambio de rol", "Exitoso", "Rol DOCENTE asignado")
        };
        await AddMissingAsync(dbContext, dbContext.Auditoria, audit, cancellationToken);
    }

    private static async Task AddMissingAsync<T>(
        ConsultorioDbContext dbContext,
        DbSet<T> set,
        IEnumerable<T> records,
        CancellationToken cancellationToken) where T : class
    {
        foreach (var record in records)
        {
            var id = (Guid)(typeof(T).GetProperty("Id")?.GetValue(record)
                ?? throw new InvalidOperationException($"{typeof(T).Name} no expone Id."));
            if (await set.FindAsync([id], cancellationToken) is null)
            {
                set.Add(record);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static AsignacionRecord Assignment(
        string id, Guid caseId, string area, string teacher, string student,
        DateTimeOffset? assignedAt, string state) => new()
        {
            Id = Guid.Parse(id), CasoId = caseId, Area = area, Docente = teacher,
            Estudiante = student, AsignadoEn = assignedAt, Estado = state
        };

    private static SesionRecord Session(
        string id, Guid caseId, DateTimeOffset date, string type, string responsible,
        short commitments, string state) => new()
        {
            Id = Guid.Parse(id), CasoId = caseId, Fecha = date, Tipo = type,
            Responsable = responsible, Compromisos = commitments, Estado = state
        };

    private static DocumentoRecord Document(
        string id, Guid caseId, string name, string category, string version,
        string responsible, DateTimeOffset updatedAt) => new()
        {
            Id = Guid.Parse(id), CasoId = caseId, Nombre = name, Categoria = category,
            Version = version, Responsable = responsible, ActualizadoEn = updatedAt
        };

    private static NotificacionRecord Notification(
        string id, DateTimeOffset date, string recipient, string type, string subject,
        string channel, string state) => new()
        {
            Id = Guid.Parse(id), Fecha = date, Destinatario = recipient, Tipo = type,
            Asunto = subject, Canal = channel, Estado = state
        };

    private static AuditoriaRecord Audit(
        string id, DateTimeOffset date, string user, string module, string operation,
        string result, string detail) => new()
        {
            Id = Guid.Parse(id), Fecha = date, Usuario = user, Modulo = module,
            Operacion = operation, Resultado = result, Detalle = detail
        };

    private static DateTimeOffset DemoDate(int day, int hour, int minute, int month = 11) =>
        new(2026, month, day, hour, minute, 0, TimeSpan.FromHours(-5));

    private static async Task EnsureDemoUserAsync(
        UserManager<ApplicationUser> userManager,
        Guid id,
        string email,
        string name,
        string role,
        DateTimeOffset now)
    {
        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return;
        }

        var user = new ApplicationUser
        {
            Id = id,
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            NombreCompleto = name,
            Activo = true,
            LockoutEnabled = true,
            CreadoEn = now,
            ActualizadoEn = now
        };
        EnsureSucceeded(await userManager.CreateAsync(user, "Demo_Local_2026!"), $"crear {email}");
        EnsureSucceeded(await userManager.AddToRoleAsync(user, role), $"asignar el rol {role}");
    }

    private static async Task EnsureConfiguredUsersAsync(
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        DateTimeOffset now)
    {
        var validRoles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            SystemRoles.Admin,
            SystemRoles.JefePrograma,
            SystemRoles.Coordinadora,
            SystemRoles.Docente,
            SystemRoles.Estudiante,
            SystemRoles.Solicitante
        };

        foreach (var section in configuration.GetSection("Seed:Users").GetChildren())
        {
            var email = section["Email"];
            var password = section["Password"];
            var name = section["Name"];
            var role = section["Role"]?.Trim().ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(email)
                && string.IsNullOrWhiteSpace(password)
                && string.IsNullOrWhiteSpace(name)
                && string.IsNullOrWhiteSpace(role))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(email)
                || string.IsNullOrWhiteSpace(password)
                || string.IsNullOrWhiteSpace(name)
                || string.IsNullOrWhiteSpace(role))
            {
                throw new InvalidOperationException(
                    $"El usuario inicial '{section.Key}' debe definir Email, Password, Name y Role.");
            }

            if (!validRoles.Contains(role))
            {
                throw new InvalidOperationException(
                    $"El rol '{role}' del usuario inicial '{email}' no es valido.");
            }

            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    NombreCompleto = name,
                    Activo = true,
                    LockoutEnabled = true,
                    CreadoEn = now,
                    ActualizadoEn = now
                };

                EnsureSucceeded(
                    await userManager.CreateAsync(user, password),
                    $"crear el usuario inicial {email}");
            }

            if (!await userManager.IsInRoleAsync(user, role))
            {
                EnsureSucceeded(
                    await userManager.AddToRoleAsync(user, role),
                    $"asignar el rol {role} a {email}");
            }
        }
    }

    private static async Task DisableKnownDemoUsersAsync(
        UserManager<ApplicationUser> userManager,
        string productionAdminEmail,
        DateTimeOffset now)
    {
        string[] demoEmails =
        [
            "admin@consultorio.local",
            "coordinacion@consultorio.demo",
            "laura.medina@uniamazonia.demo",
            "santiago.lopez@uniamazonia.demo",
            "demo@consultorio.local"
        ];

        foreach (var demoEmail in demoEmails)
        {
            if (string.Equals(
                    demoEmail,
                    productionAdminEmail,
                    StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var user = await userManager.FindByEmailAsync(demoEmail);
            if (user is null || !user.Activo)
            {
                continue;
            }

            user.Activo = false;
            user.ActualizadoEn = now;
            EnsureSucceeded(
                await userManager.UpdateAsync(user),
                $"desactivar la cuenta demostrativa {demoEmail}");
        }
    }

    private static async Task SeedDemonstrationDataAsync(
        ConsultorioDbContext dbContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        var applicants = new[]
        {
            Applicant("40000000-0000-0000-0000-000000000002", "NIT", "900000002", "Panaderia La Esperanza", "contabilidad@laesperanza.demo", "3105550101", clock.UtcNow),
            Applicant("40000000-0000-0000-0000-000000000003", "NIT", "900000003", "Asociacion Agroverde", "administracion@agroverde.demo", "3105550102", clock.UtcNow),
            Applicant("40000000-0000-0000-0000-000000000004", "CC", "1117543201", "Maria Fernanda Ruiz", "maria.ruiz@example.demo", "3105550103", clock.UtcNow),
            Applicant("40000000-0000-0000-0000-000000000005", "NIT", "900000004", "Comercializadora Florencia SAS", "gerencia@comerflorencia.demo", "3105550104", clock.UtcNow),
            Applicant("40000000-0000-0000-0000-000000000006", "NIT", "900000005", "Fundacion Manos del Sur", "contacto@manosdelsur.demo", "3105550105", clock.UtcNow)
        };

        var applicantIds = applicants.Select(x => x.Id).ToArray();
        var existingApplicantIds = await dbContext.Solicitantes
            .Where(x => applicantIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToArrayAsync(cancellationToken);
        dbContext.Solicitantes.AddRange(
            applicants.Where(x => !existingApplicantIds.Contains(x.Id)));
        await dbContext.SaveChangesAsync(cancellationToken);

        var createdAt = new DateTimeOffset(2026, 11, 3, 13, 0, 0, TimeSpan.Zero);
        var requests = new[]
        {
            DemoRequest("60000000-0000-0000-0000-000000000001", "SOL-20261103-DEMO0001", applicants[0].Id, 1, "Organizacion de registros contables", "La empresa requiere organizar comprobantes, libros auxiliares y soportes del periodo.", CanalRecepcion.Web, EstadoSolicitud.Radicada, createdAt),
            DemoRequest("60000000-0000-0000-0000-000000000002", "SOL-20261103-DEMO0002", applicants[1].Id, 2, "Revision del sistema de costos", "La asociacion necesita identificar costos directos e indirectos de sus productos.", CanalRecepcion.Correo, EstadoSolicitud.EnRevision, createdAt.AddMinutes(5)),
            DemoRequest("60000000-0000-0000-0000-000000000003", "SOL-20261103-DEMO0003", applicants[2].Id, 6, "Orientacion para formalizacion", "La solicitante requiere informacion adicional para formalizar su actividad economica.", CanalRecepcion.Presencial, EstadoSolicitud.PendienteInformacion, createdAt.AddMinutes(10)),
            DemoRequest("60000000-0000-0000-0000-000000000004", "SOL-20261103-DEMO0004", applicants[3].Id, 4, "Control y valoracion de inventarios", "La empresa solicita acompañamiento para definir su metodo de control de inventarios.", CanalRecepcion.Telefono, EstadoSolicitud.Aprobada, createdAt.AddMinutes(15)),
            DemoRequest("60000000-0000-0000-0000-000000000005", "SOL-20261103-DEMO0005", applicants[4].Id, 5, "Preparacion de estados financieros", "La fundacion necesita revisar la estructura de sus estados financieros de cierre.", CanalRecepcion.Web, EstadoSolicitud.Rechazada, createdAt.AddMinutes(20)),
            DemoRequest("60000000-0000-0000-0000-000000000006", "SOL-20261103-DEMO0006", applicants[0].Id, 7, "Gestion documental de soportes", "Se requiere establecer una politica basica de archivo y conservacion documental.", CanalRecepcion.Correo, EstadoSolicitud.Convertida, createdAt.AddMinutes(25))
        };

        var requestIds = requests.Select(x => x.Id).ToArray();
        var existingRequestIds = await dbContext.Solicitudes
            .Where(x => requestIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToArrayAsync(cancellationToken);
        dbContext.Solicitudes.AddRange(
            requests.Where(x => !existingRequestIds.Contains(x.Id)));
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static SolicitanteRecord Applicant(
        string id,
        string documentType,
        string documentNumber,
        string fullName,
        string email,
        string phone,
        DateTimeOffset now) => new()
        {
            Id = Guid.Parse(id),
            TipoDocumento = documentType,
            NumeroDocumento = documentNumber,
            NombreCompleto = fullName,
            CorreoElectronico = email,
            Telefono = phone,
            Activo = true,
            CreadoEn = now,
            ActualizadoEn = now
        };

    private static SolicitudAsesoria DemoRequest(
        string id,
        string reference,
        Guid applicantId,
        int areaNumber,
        string subject,
        string description,
        CanalRecepcion channel,
        EstadoSolicitud targetState,
        DateTimeOffset createdAt)
    {
        var request = SolicitudAsesoria.Crear(
            Guid.Parse(id),
            reference,
            applicantId,
            Guid.Parse($"20000000-0000-0000-0000-{areaNumber:D12}"),
            CatalogSeed.Periodo2026_2Id,
            subject,
            description,
            channel,
            createdAt);
        var transitionAt = createdAt.AddMinutes(1);

        if (targetState is not EstadoSolicitud.Radicada)
        {
            request.IniciarRevision(transitionAt);
        }

        switch (targetState)
        {
            case EstadoSolicitud.PendienteInformacion:
                request.SolicitarInformacion(transitionAt.AddMinutes(1));
                break;
            case EstadoSolicitud.Aprobada:
                request.Aprobar(transitionAt.AddMinutes(1));
                break;
            case EstadoSolicitud.Rechazada:
                request.Rechazar(transitionAt.AddMinutes(1));
                break;
            case EstadoSolicitud.Convertida:
                request.Aprobar(transitionAt.AddMinutes(1));
                request.ConvertirEnCaso(transitionAt.AddMinutes(2));
                break;
        }

        return request;
    }

    private static void EnsureSucceeded(IdentityResult result, string operation)
    {
        if (result.Succeeded)
        {
            return;
        }

        var errors = string.Join("; ", result.Errors.Select(error => error.Description));
        throw new InvalidOperationException($"No fue posible {operation}: {errors}");
    }

    private static bool IsEnabled(string? value) =>
        bool.TryParse(value, out var enabled) && enabled;
}

