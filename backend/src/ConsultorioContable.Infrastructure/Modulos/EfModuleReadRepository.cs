using System.Globalization;
using ConsultorioContable.Application.Modulos;
using ConsultorioContable.Application.Common;
using ConsultorioContable.Domain.Solicitudes;
using ConsultorioContable.Infrastructure.Identity;
using ConsultorioContable.Infrastructure.Persistence;
using ConsultorioContable.Infrastructure.Persistence.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ConsultorioContable.Infrastructure.Modulos;

public sealed class EfModuleReadRepository(
    ConsultorioDbContext dbContext,
    UserManager<ApplicationUser> userManager,
    IClock clock)
    : IModuleReadRepository
{
    private static readonly CultureInfo SpanishColombia =
        CultureInfo.GetCultureInfo("es-CO");

    public Task<ModuleViewDto?> GetAsync(
        string module,
        CancellationToken cancellationToken) =>
        module switch
        {
            "casos" => GetCasesAsync(cancellationToken),
            "asignaciones" => GetAssignmentsAsync(cancellationToken),
            "sesiones" => GetSessionsAsync(cancellationToken),
            "documentos" => GetDocumentsAsync(cancellationToken),
            "notificaciones" => GetNotificationsAsync(cancellationToken),
            "reportes" => GetReportsAsync(cancellationToken),
            "usuarios" => GetUsersAsync(cancellationToken),
            "auditoria" => GetAuditAsync(cancellationToken),
            _ => Task.FromResult<ModuleViewDto?>(null)
        };

    public async Task<ModuleMutationResultDto?> CreateAsync(
        string module,
        IReadOnlyDictionary<string, string> values,
        string actor,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var result = module switch
        {
            "casos" => await CreateCaseAsync(values, cancellationToken),
            "asignaciones" => await CreateAssignmentAsync(values, cancellationToken),
            "sesiones" => await CreateSessionAsync(values, cancellationToken),
            "documentos" => await CreateDocumentAsync(values, cancellationToken),
            "notificaciones" => await CreateNotificationAsync(values, cancellationToken),
            "usuarios" => await CreateUserAsync(values),
            _ => null
        };

        if (result is null)
        {
            return null;
        }

        dbContext.Auditoria.Add(new AuditoriaRecord
        {
            Id = Guid.NewGuid(),
            Fecha = clock.UtcNow,
            Usuario = actor,
            Modulo = ModuleName(module),
            Operacion = "Creación",
            Resultado = "Exitoso",
            Detalle = result.Message
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        return result;
    }

    public async Task<ModuleDocumentDto?> GetDocumentAsync(
        Guid id,
        CancellationToken cancellationToken) =>
        await dbContext.Documentos.AsNoTracking()
            .Where(x => x.Id == id && x.Contenido != null)
            .Select(x => new ModuleDocumentDto(
                x.Nombre,
                x.MimeType ?? "application/octet-stream",
                x.Contenido!))
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<ModuleMutationResultDto> CreateCaseAsync(
        IReadOnlyDictionary<string, string> values,
        CancellationToken cancellationToken)
    {
        var applicantId = GuidValue(values, "solicitanteId");
        var areaId = GuidValue(values, "areaAsesoriaId");
        if (!await dbContext.Solicitantes.AnyAsync(x => x.Id == applicantId, cancellationToken) ||
            !await dbContext.AreasAsesoria.AnyAsync(x => x.Id == areaId, cancellationToken))
        {
            throw new ArgumentException("El solicitante o área seleccionada no existe.");
        }

        var id = Guid.NewGuid();
        var sequence = await dbContext.Casos.CountAsync(cancellationToken) + 1;
        var number = Optional(values, "numero") ?? $"CAS-{clock.UtcNow.Year}-{sequence:D3}";
        if (await dbContext.Casos.AnyAsync(x => x.Numero == number, cancellationToken))
        {
            throw new ArgumentException("Ya existe un caso con ese número.");
        }

        dbContext.Casos.Add(new CasoRecord
        {
            Id = id,
            Numero = number,
            SolicitanteId = applicantId,
            AreaAsesoriaId = areaId,
            Responsable = Required(values, "responsable"),
            Estado = Optional(values, "estado") ?? "Activo",
            EstadoId = CaseStateId(Optional(values, "estado") ?? "Activo"),
            Titulo = number,
            Descripcion = $"Caso de asesoría creado para {number}",
            FechaApertura = DateOnly.FromDateTime(clock.UtcNow.UtcDateTime),
            CreadoEn = clock.UtcNow,
            ActualizadoEn = clock.UtcNow
        });
        return new(id, $"Caso {number} creado");
    }

    private async Task<ModuleMutationResultDto> CreateAssignmentAsync(
        IReadOnlyDictionary<string, string> values,
        CancellationToken cancellationToken)
    {
        var caseItem = await FindCaseAsync(values, cancellationToken);
        var id = Guid.NewGuid();
        dbContext.Asignaciones.Add(new AsignacionRecord
        {
            Id = id,
            CasoId = caseItem.Id,
            Area = Required(values, "area"),
            Docente = Required(values, "docente"),
            Estudiante = Required(values, "estudiante"),
            AsignadoEn = clock.UtcNow,
            Estado = Optional(values, "estado") ?? "Asignado"
        });
        return new(id, $"Asignación registrada para {caseItem.Numero}");
    }

    private async Task<ModuleMutationResultDto> CreateSessionAsync(
        IReadOnlyDictionary<string, string> values,
        CancellationToken cancellationToken)
    {
        var caseItem = await FindCaseAsync(values, cancellationToken);
        var id = Guid.NewGuid();
        dbContext.Sesiones.Add(new SesionRecord
        {
            Id = id,
            CasoId = caseItem.Id,
            Fecha = DateValue(values, "fecha"),
            Tipo = Required(values, "tipo"),
            Responsable = Required(values, "responsable"),
            Compromisos = ShortValue(values, "compromisos"),
            Estado = Optional(values, "estado") ?? "Programada"
        });
        return new(id, $"Sesión registrada para {caseItem.Numero}");
    }

    private async Task<ModuleMutationResultDto> CreateDocumentAsync(
        IReadOnlyDictionary<string, string> values,
        CancellationToken cancellationToken)
    {
        var caseItem = await FindCaseAsync(values, cancellationToken);
        var id = Guid.NewGuid();
        var name = Required(values, "nombre");
        var contentText = Required(values, "contenidoBase64");
        byte[] content;
        try
        {
            content = Convert.FromBase64String(contentText);
        }
        catch (FormatException)
        {
            throw new ArgumentException("El contenido del archivo no es válido.");
        }
        if (content.Length == 0 || content.Length > 10 * 1024 * 1024)
        {
            throw new ArgumentException("El archivo debe tener contenido y no superar 10 MB.");
        }
        dbContext.Documentos.Add(new DocumentoRecord
        {
            Id = id,
            CasoId = caseItem.Id,
            Nombre = name,
            Categoria = Required(values, "categoria"),
            Version = Required(values, "version"),
            GrupoDocumentoId = id,
            NumeroVersion = ParseVersion(Required(values, "version")),
            EsVigente = true,
            CategoriaId = Guid.Parse("80000000-0000-0000-0000-000000000008"),
            Responsable = Required(values, "responsable"),
            CreadoEn = clock.UtcNow,
            ActualizadoEn = clock.UtcNow,
            Contenido = content,
            MimeType = Optional(values, "mimeType") ?? "application/octet-stream",
            Tamano = content.LongLength
        });
        return new(id, $"Documento {name} vinculado a {caseItem.Numero}");
    }

    private Task<ModuleMutationResultDto> CreateNotificationAsync(
        IReadOnlyDictionary<string, string> values,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var id = Guid.NewGuid();
        var subject = Required(values, "asunto");
        dbContext.Notificaciones.Add(new NotificacionRecord
        {
            Id = id,
            Fecha = clock.UtcNow,
            Destinatario = Required(values, "destinatario"),
            Tipo = Required(values, "tipo"),
            Asunto = subject,
            Mensaje = subject,
            Canal = Required(values, "canal"),
            Estado = Optional(values, "estado") ?? "Enviada",
            CreadoEn = clock.UtcNow
        });
        return Task.FromResult(new ModuleMutationResultDto(id, $"Notificación {subject} registrada"));
    }

    private async Task<ModuleMutationResultDto> CreateUserAsync(
        IReadOnlyDictionary<string, string> values)
    {
        var email = Required(values, "email");
        if (await userManager.FindByEmailAsync(email) is not null)
        {
            throw new ArgumentException("Ya existe un usuario con ese correo.");
        }

        var role = Required(values, "rol").ToUpperInvariant();
        if (!await dbContext.Roles.AnyAsync(x => x.Name == role))
        {
            throw new ArgumentException("El rol seleccionado no existe.");
        }

        var id = Guid.NewGuid();
        var user = new ApplicationUser
        {
            Id = id,
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            NombreCompleto = Required(values, "nombreCompleto"),
            Activo = true,
            LockoutEnabled = true,
            DebeCambiarContrasena = true,
            CreadoEn = clock.UtcNow,
            ActualizadoEn = clock.UtcNow
        };
        var createResult = await userManager.CreateAsync(user, Required(values, "password"));
        EnsureIdentitySucceeded(createResult);
        var roleResult = await userManager.AddToRoleAsync(user, role);
        EnsureIdentitySucceeded(roleResult);
        return new(id, $"Usuario {email} creado con rol {role}");
    }

    private async Task<CasoRecord> FindCaseAsync(
        IReadOnlyDictionary<string, string> values,
        CancellationToken cancellationToken)
    {
        var number = Required(values, "caso");
        return await dbContext.Casos.FirstOrDefaultAsync(x => x.Numero == number, cancellationToken)
            ?? throw new ArgumentException("El caso seleccionado no existe.");
    }

    private static string Required(IReadOnlyDictionary<string, string> values, string key) =>
        values.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value.Trim()
            : throw new ArgumentException($"El campo {key} es obligatorio.");

    private static string? Optional(IReadOnlyDictionary<string, string> values, string key) =>
        values.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value.Trim()
            : null;

    private static Guid GuidValue(IReadOnlyDictionary<string, string> values, string key) =>
        Guid.TryParse(Required(values, key), out var value)
            ? value
            : throw new ArgumentException($"El campo {key} no es válido.");

    private static short ShortValue(IReadOnlyDictionary<string, string> values, string key) =>
        short.TryParse(Required(values, key), out var value) && value >= 0
            ? value
            : throw new ArgumentException($"El campo {key} debe ser un número positivo.");

    private static DateTimeOffset DateValue(IReadOnlyDictionary<string, string> values, string key) =>
        DateTimeOffset.TryParse(Required(values, key), SpanishColombia, DateTimeStyles.AssumeLocal, out var value)
            ? value
            : throw new ArgumentException($"El campo {key} no contiene una fecha válida.");

    private static string ModuleName(string module) => module switch
    {
        "casos" => "Casos",
        "asignaciones" => "Asignaciones",
        "sesiones" => "Sesiones",
        "documentos" => "Documentos",
        "notificaciones" => "Notificaciones",
        "usuarios" => "Usuarios",
        _ => module
    };

    private static void EnsureIdentitySucceeded(IdentityResult result)
    {
        if (result.Succeeded)
        {
            return;
        }

        var messages = result.Errors.Select(error => error.Code switch
        {
            "PasswordTooShort" => "La contraseña debe tener al menos 8 caracteres.",
            "PasswordRequiresDigit" => "La contraseña debe incluir al menos un número.",
            "PasswordRequiresLower" => "La contraseña debe incluir al menos una letra minúscula.",
            "PasswordRequiresUpper" => "La contraseña debe incluir al menos una letra mayúscula.",
            "PasswordRequiresNonAlphanumeric" => "La contraseña debe incluir al menos un símbolo.",
            "DuplicateEmail" or "DuplicateUserName" => "Ya existe un usuario con ese correo electrónico.",
            _ => error.Description
        });
        throw new ArgumentException(string.Join("; ", messages));
    }

    private async Task<ModuleViewDto?> GetCasesAsync(CancellationToken cancellationToken)
    {
        var items = await (
                from item in dbContext.Casos.AsNoTracking()
                join applicant in dbContext.Solicitantes.AsNoTracking()
                    on item.SolicitanteId equals applicant.Id
                join area in dbContext.AreasAsesoria.AsNoTracking()
                    on item.AreaAsesoriaId equals area.Id
                orderby item.ActualizadoEn descending
                select new
                {
                    item.Id,
                    item.Numero,
                    Solicitante = applicant.NombreCompleto,
                    Area = area.Nombre,
                    item.Responsable,
                    item.Estado,
                    item.ActualizadoEn
                })
            .ToArrayAsync(cancellationToken);

        return View(
            [
                Metric("Pendientes de apertura", items.Count(x => x.Estado == "Pendiente")),
                Metric("Casos activos", items.Count(x => x.Estado is "Activo" or "En seguimiento")),
                Metric("Casos cerrados", items.Count(x => x.Estado == "Cerrado"))
            ],
            ["Caso", "Solicitante", "Área", "Responsable", "Estado", "Actualización"],
            items.Select(x => Row(x.Numero, x.Solicitante, x.Area, x.Responsable, x.Estado, Date(x.ActualizadoEn))));
    }

    private async Task<ModuleViewDto?> GetAssignmentsAsync(CancellationToken cancellationToken)
    {
        var items = await (
                from item in dbContext.Asignaciones.AsNoTracking()
                join caseItem in dbContext.Casos.AsNoTracking()
                    on item.CasoId equals caseItem.Id
                orderby item.AsignadoEn descending
                select new
                {
                    Caso = caseItem.Numero,
                    item.Area,
                    item.Docente,
                    item.Estudiante,
                    item.AsignadoEn,
                    item.Estado
                })
            .ToArrayAsync(cancellationToken);

        return View(
            [
                Metric("Sin asignar", items.Count(x => x.Estado is "Pendiente" or "Sin asignar")),
                Metric("Docentes disponibles", items.Where(x => x.Docente != "Por definir").Select(x => x.Docente).Distinct().Count()),
                Metric("Estudiantes vinculados", items.Where(x => x.Estudiante != "Por definir").Select(x => x.Estudiante).Distinct().Count())
            ],
            ["Caso", "Área", "Docente", "Estudiante", "Fecha de asignación", "Estado"],
            items.Select(x => Row(x.Caso, x.Area, x.Docente, x.Estudiante, x.AsignadoEn is null ? "—" : Date(x.AsignadoEn.Value), x.Estado)));
    }

    private async Task<ModuleViewDto?> GetSessionsAsync(CancellationToken cancellationToken)
    {
        var items = await (
                from item in dbContext.Sesiones.AsNoTracking()
                join caseItem in dbContext.Casos.AsNoTracking()
                    on item.CasoId equals caseItem.Id
                orderby item.Fecha descending
                select new
                {
                    item.Fecha,
                    Caso = caseItem.Numero,
                    item.Tipo,
                    item.Responsable,
                    item.Compromisos,
                    item.Estado
                })
            .ToArrayAsync(cancellationToken);

        return View(
            [
                Metric("Sesiones programadas", items.Count(x => x.Estado == "Programada")),
                Metric("Compromisos abiertos", items.Where(x => x.Estado is "Programada" or "Realizada").Sum(x => x.Compromisos)),
                Metric("Sesiones finalizadas", items.Count(x => x.Estado == "Finalizada"))
            ],
            ["Fecha", "Caso", "Tipo de sesión", "Responsable", "Compromisos", "Estado"],
            items.Select(x => Row(DateTimeValue(x.Fecha), x.Caso, x.Tipo, x.Responsable, x.Compromisos.ToString(SpanishColombia), x.Estado)));
    }

    private async Task<ModuleViewDto?> GetDocumentsAsync(CancellationToken cancellationToken)
    {
        var items = await (
                from item in dbContext.Documentos.AsNoTracking()
                join caseItem in dbContext.Casos.AsNoTracking()
                    on item.CasoId equals caseItem.Id
                orderby item.ActualizadoEn descending
                select new
                {
                    item.Id,
                    item.Nombre,
                    Caso = caseItem.Numero,
                    item.Categoria,
                    item.Version,
                    item.Responsable,
                    item.ActualizadoEn,
                    HasContent = item.Contenido != null
                })
            .ToArrayAsync(cancellationToken);

        return new ModuleViewDto(
            [
                Metric("Documentos vigentes", items.Length),
                Metric("Pendientes de revisión", items.Count(x => x.Categoria == "Hoja de trabajo")),
                Metric("Versiones registradas", items.Sum(x => ParseVersion(x.Version)))
            ],
            ["Documento", "Caso", "Categoría", "Versión", "Responsable", "Actualización"],
            items.Select(x => Row(x.Nombre, x.Caso, x.Categoria, x.Version, x.Responsable, Date(x.ActualizadoEn))).ToArray(),
            true,
            items.Select(x => x.HasContent ? x.Id : Guid.Empty).ToArray());
    }

    private async Task<ModuleViewDto?> GetNotificationsAsync(CancellationToken cancellationToken)
    {
        var items = await dbContext.Notificaciones
            .AsNoTracking()
            .OrderByDescending(x => x.Fecha)
            .ToArrayAsync(cancellationToken);
        var today = DateTimeOffset.UtcNow.Date;

        return View(
            [
                Metric("Sin leer", items.Count(x => x.Estado == "No leída")),
                Metric("Importantes", items.Count(x => x.Tipo is "Compromiso" or "Solicitud")),
                Metric("Enviadas hoy", items.Count(x => x.Fecha.UtcDateTime.Date == today))
            ],
            ["Fecha", "Destinatario", "Tipo", "Asunto", "Canal", "Estado"],
            items.Select(x => Row(DateTimeValue(x.Fecha), x.Destinatario, x.Tipo, x.Asunto, x.Canal, x.Estado)));
    }

    private async Task<ModuleViewDto?> GetReportsAsync(CancellationToken cancellationToken)
    {
        var requests = await dbContext.Solicitudes.AsNoTracking().ToArrayAsync(cancellationToken);
        var cases = await dbContext.Casos.AsNoTracking().ToArrayAsync(cancellationToken);
        var period = await dbContext.PeriodosAcademicos.AsNoTracking()
            .Where(x => x.Activo)
            .Select(x => x.Codigo)
            .FirstOrDefaultAsync(cancellationToken) ?? "Actual";
        var decided = requests.Count(x => x.Estado is EstadoSolicitud.Aprobada or EstadoSolicitud.Rechazada or EstadoSolicitud.Convertida);
        var approved = requests.Count(x => x.Estado is EstadoSolicitud.Aprobada or EstadoSolicitud.Convertida);
        var approvalRate = decided == 0 ? 0 : (int)Math.Round(approved * 100d / decided);
        var updated = Date(DateTimeOffset.UtcNow);

        return View(
            [
                Metric("Solicitudes del periodo", requests.Length),
                Metric("Casos activos", cases.Count(x => x.Estado is "Activo" or "En seguimiento")),
                Metric("Asesorías finalizadas", cases.Count(x => x.Estado == "Cerrado"))
            ],
            ["Indicador", "Periodo", "Área", "Resultado", "Variación", "Actualización"],
            [
                Row("Solicitudes recibidas", period, "Todas", requests.Length.ToString(SpanishColombia), "Datos actuales", updated),
                Row("Tasa de aprobación", period, "Todas", $"{approvalRate} %", "Calculada", updated),
                Row("Casos abiertos", period, "Todas", cases.Count(x => x.Estado != "Cerrado").ToString(SpanishColombia), "Datos actuales", updated),
                Row("Casos finalizados", period, "Todas", cases.Count(x => x.Estado == "Cerrado").ToString(SpanishColombia), "Datos actuales", updated)
            ]);
    }

    private async Task<ModuleViewDto?> GetUsersAsync(CancellationToken cancellationToken)
    {
        var users = await dbContext.Users.AsNoTracking().OrderBy(x => x.NombreCompleto).ToArrayAsync(cancellationToken);
        var roles = await dbContext.Roles.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.Name ?? string.Empty, cancellationToken);
        var relationships = await dbContext.UserRoles.AsNoTracking().ToArrayAsync(cancellationToken);
        var roleByUser = relationships
            .Where(x => roles.ContainsKey(x.RoleId))
            .GroupBy(x => x.UserId)
            .ToDictionary(x => x.Key, x => string.Join(", ", x.Select(item => roles[item.RoleId])));

        return View(
            [
                Metric("Usuarios activos", users.Count(x => x.Activo)),
                Metric("Roles del sistema", roles.Count),
                Metric("Cuentas bloqueadas", users.Count(x => x.LockoutEnd > DateTimeOffset.UtcNow))
            ],
            ["Usuario", "Correo", "Rol", "Último acceso", "Estado", "Acciones"],
            users.Select(x => Row(
                x.NombreCompleto,
                x.Email ?? "—",
                roleByUser.GetValueOrDefault(x.Id, "Sin rol"),
                x.UltimoAccesoEn is null ? "Sin acceso" : DateTimeValue(x.UltimoAccesoEn.Value),
                x.Activo ? "Activo" : "Inactivo",
                "Gestionar")));
    }

    private async Task<ModuleViewDto?> GetAuditAsync(CancellationToken cancellationToken)
    {
        var items = await dbContext.Auditoria.AsNoTracking()
            .OrderByDescending(x => x.Fecha)
            .ToArrayAsync(cancellationToken);
        var today = DateTimeOffset.UtcNow.Date;

        return View(
            [
                Metric("Eventos de hoy", items.Count(x => x.Fecha.UtcDateTime.Date == today)),
                Metric("Accesos fallidos", items.Count(x => x.Resultado == "Fallido")),
                Metric("Cambios sensibles", items.Count(x => x.Operacion is "Cambio de rol" or "Cambio de estado"))
            ],
            ["Fecha y hora", "Usuario", "Módulo", "Operación", "Resultado", "Detalle"],
            items.Select(x => Row(DateTimeValue(x.Fecha), x.Usuario, x.Modulo, x.Operacion, x.Resultado, x.Detalle)));
    }

    private static ModuleMetricDto Metric(string label, int value) => new(label, value);

    private static IReadOnlyCollection<string> Row(params string[] values) => values;

    private static ModuleViewDto View(
        IReadOnlyCollection<ModuleMetricDto> metrics,
        IReadOnlyCollection<string> columns,
        IEnumerable<IReadOnlyCollection<string>> rows) =>
        new(metrics, columns, rows.ToArray(), true);

    private static string Date(DateTimeOffset value) =>
        value.ToString("dd MMM yyyy", SpanishColombia);

    private static string DateTimeValue(DateTimeOffset value) =>
        value.ToString("dd MMM yyyy · HH:mm", SpanishColombia);

    private static int ParseVersion(string version) =>
        int.TryParse(version.TrimStart('v', 'V'), out var value) ? value : 1;

    private static Guid CaseStateId(string state) => state.Trim().ToLowerInvariant() switch
    {
        "cerrado" => Guid.Parse("70000000-0000-0000-0000-000000000006"),
        "finalizado" => Guid.Parse("70000000-0000-0000-0000-000000000005"),
        "cancelado" => Guid.Parse("70000000-0000-0000-0000-000000000007"),
        "reabierto" => Guid.Parse("70000000-0000-0000-0000-000000000008"),
        "pendiente" or "asignado" => Guid.Parse("70000000-0000-0000-0000-000000000001"),
        _ => Guid.Parse("70000000-0000-0000-0000-000000000002")
    };
}
