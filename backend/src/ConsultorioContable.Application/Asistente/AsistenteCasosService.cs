using System.Globalization;
using System.Text;
using ConsultorioContable.Application.Common;

namespace ConsultorioContable.Application.Asistente;

public sealed class AsistenteCasosService(
    IAsistenteCasosRepository repository,
    IClock clock,
    IAsistenteLenguajeNatural? languageAssistant = null)
{
    public const int DiasParaRetraso = 30;

    private static readonly CultureInfo SpanishColombia = CultureInfo.GetCultureInfo("es-CO");

    private static readonly string[] Suggestions =
    [
        "¿Qué docente tiene mayor carga?",
        "¿Cuáles son las próximas sesiones?",
        "Muéstrame los compromisos pendientes",
        "¿Qué solicitudes faltan por convertir en caso?",
        "Compara los casos por área",
        "¿Qué documentos faltan?"
    ];

    public async Task<AsistenteRespuestaDto> ConsultarAsync(
        string pregunta,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(pregunta))
        {
            throw new ArgumentException("Escribe una pregunta sobre la operación del consultorio.");
        }

        var context = await repository.ObtenerContextoAsync(cancellationToken);
        var now = clock.UtcNow;
        var cases = context.Casos.Select(item => Map(item, now)).ToArray();
        var query = Normalize(pregunta);
        var availableAreas = context.Casos
            .Select(item => item.Area)
            .Concat(context.Solicitudes.Select(item => item.Area))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var availablePeriods = context.Periodos
            .Select(item => item.Codigo)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var interpretation = languageAssistant is null
            ? null
            : await languageAssistant.InterpretarAsync(
                pregunta,
                new OpcionesInterpretacionAsistente(
                    availableAreas,
                    availablePeriods,
                    DateOnly.FromDateTime(now.DateTime)),
                cancellationToken);
        var assistedByAi = interpretation is not null;
        var queryType = interpretation?.Tipo ?? InferQueryType(query);
        var area = FindMentioned(query, availableAreas) ?? interpretation?.Area;
        var period = FindMentioned(query, availablePeriods) ?? interpretation?.Periodo;
        var caseNumber = interpretation?.NumeroCaso ?? cases
            .Select(item => item.Numero)
            .FirstOrDefault(value => query.Contains(Normalize(value), StringComparison.Ordinal));
        var availablePeople = context.Asignaciones
            .SelectMany(item => new[] { item.Docente, item.Estudiante })
            .Concat(context.Casos.Select(item => item.Responsable))
            .Where(item => !IsUnassigned(item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var mentionedPerson = interpretation?.Persona ?? FindMentioned(query, availablePeople);
        var effectiveInterpretation = (interpretation ?? new InterpretacionAsistente(
                queryType,
                area,
                caseNumber,
                mentionedPerson,
                InferPersonRole(query),
                period,
                null,
                null,
                InferDimension(query),
                InferEntity(query))) with
            {
                Persona = mentionedPerson,
                Area = area,
                Periodo = period,
                NumeroCaso = caseNumber
            };

        if (queryType == TipoConsultaAsistente.Caso)
        {
            return QueryExactCase(cases, caseNumber, assistedByAi);
        }

        return queryType switch
        {
            TipoConsultaAsistente.CasosAsignados => QueryAssignedCases(
                context, cases, effectiveInterpretation, area, assistedByAi),
            TipoConsultaAsistente.CargaResponsable => QueryWorkload(
                context, cases, effectiveInterpretation, area, assistedByAi),
            TipoConsultaAsistente.SesionesRealizadas => QuerySessions(
                context, effectiveInterpretation, area, caseNumber, now, upcoming: false, assistedByAi),
            TipoConsultaAsistente.SesionesProximas => QuerySessions(
                context, effectiveInterpretation, area, caseNumber, now, upcoming: true, assistedByAi),
            TipoConsultaAsistente.CompromisosPendientes => QueryCommitments(
                context, effectiveInterpretation, area, caseNumber, assistedByAi),
            TipoConsultaAsistente.DocumentosFaltantes => QueryMissingDocuments(
                context, cases, area, caseNumber, assistedByAi),
            TipoConsultaAsistente.VersionesDocumentos => QueryDocumentVersions(
                context, area, caseNumber, assistedByAi),
            TipoConsultaAsistente.SolicitudesSinCaso => QueryRequestsWithoutCase(
                context, effectiveInterpretation, area, period, assistedByAi),
            TipoConsultaAsistente.Comparacion => QueryComparison(
                context, cases, effectiveInterpretation, area, period, assistedByAi),
            _ => QueryCases(queryType, cases, area, assistedByAi)
        };
    }

    private static AsistenteRespuestaDto QueryExactCase(
        IReadOnlyCollection<CasoAsistenteDto> cases,
        string? caseNumber,
        bool assistedByAi)
    {
        var exactCase = caseNumber is null
            ? null
            : cases.FirstOrDefault(item =>
                Normalize(item.Numero) == Normalize(caseNumber));
        return exactCase is null
            ? Response(
                "No encontré un caso con ese número.",
                "La consulta por caso requiere un número registrado.",
                [],
                assistedByAi)
            : Response(
                $"El caso {exactCase.Numero} está {exactCase.Estado.ToLowerInvariant()} y lleva {exactCase.DiasSinActividad} días sin actividad registrada.",
                "Consulta por número de caso.",
                [exactCase],
                assistedByAi);
    }

    private static AsistenteRespuestaDto QueryCases(
        TipoConsultaAsistente queryType,
        IReadOnlyCollection<CasoAsistenteDto> cases,
        string? area,
        bool assistedByAi)
    {
        IEnumerable<CasoAsistenteDto> filtered;
        string answer;
        string criterion;

        switch (queryType)
        {
            case TipoConsultaAsistente.Retrasados:
                filtered = cases.Where(item => item.Retrasado);
                criterion = $"Caso no terminal sin actividad durante {DiasParaRetraso} días o más.";
                answer = "casos retrasados";
                break;
            case TipoConsultaAsistente.SinAsignar:
                filtered = cases.Where(item => !item.TieneAsignacion || IsUnassigned(item.Responsable));
                criterion = "Caso sin una asignación activa o con responsable por definir.";
                answer = "casos sin asignar";
                break;
            case TipoConsultaAsistente.Pendientes:
                filtered = cases.Where(item =>
                    Normalize(item.Estado).Contains("pendient", StringComparison.Ordinal) ||
                    !item.TieneAsignacion);
                criterion = "Caso con estado pendiente o sin una asignación activa.";
                answer = "casos pendientes";
                break;
            case TipoConsultaAsistente.Cerrados:
                filtered = cases.Where(item => IsTerminal(item.Estado));
                criterion = "Caso cerrado, finalizado o cancelado.";
                answer = "casos cerrados o finalizados";
                break;
            case TipoConsultaAsistente.Activos:
                filtered = cases.Where(item => !IsTerminal(item.Estado));
                criterion = "Caso que todavía no está cerrado, finalizado ni cancelado.";
                answer = "casos activos";
                break;
            default:
                var active = cases.Count(item => !IsTerminal(item.Estado));
                var delayed = cases.Count(item => item.Retrasado);
                var pending = cases.Count(item =>
                    Normalize(item.Estado).Contains("pendient", StringComparison.Ordinal) ||
                    !item.TieneAsignacion);
                return Response(
                    $"Hay {cases.Count} casos registrados: {active} activos, {pending} pendientes y {delayed} retrasados.",
                    $"Los retrasados son casos no terminales sin actividad durante {DiasParaRetraso} días o más.",
                    cases.OrderByDescending(item => item.UltimaActividad).Take(10).ToArray(),
                    assistedByAi);
        }

        if (area is not null)
        {
            filtered = filtered.Where(item =>
                item.Area.Equals(area, StringComparison.OrdinalIgnoreCase));
            answer += $" del área {area}";
        }

        var result = filtered
            .OrderByDescending(item => item.DiasSinActividad)
            .ThenBy(item => item.Numero)
            .Take(20)
            .ToArray();
        return Response(
            CountAnswer(result.Length, answer),
            criterion,
            result,
            assistedByAi);
    }

    private static AsistenteRespuestaDto QueryAssignedCases(
        ContextoAsistenteData context,
        IReadOnlyCollection<CasoAsistenteDto> cases,
        InterpretacionAsistente? interpretation,
        string? area,
        bool assistedByAi)
    {
        var assignments = context.Asignaciones
            .Where(item => item.DesasignadoEn is null)
            .Where(item => area is null || item.Area.Equals(area, StringComparison.OrdinalIgnoreCase))
            .Where(item => MatchesAssignmentPerson(item, interpretation?.Persona, interpretation?.RolPersona))
            .OrderBy(item => item.Docente)
            .ThenBy(item => item.CasoNumero)
            .Take(30)
            .ToArray();
        var caseIds = assignments.Select(item => item.CasoId).ToHashSet();
        var resultCases = cases.Where(item => caseIds.Contains(item.Id)).ToArray();
        var personText = interpretation?.Persona is null ? string.Empty : $" para {interpretation.Persona}";
        return Response(
            assignments.Length == 0
                ? $"No encontré casos asignados{personText}."
                : $"Encontré {assignments.Length} asignaciones{personText}.",
            "Se muestran asignaciones que no tienen fecha de desasignación.",
            resultCases,
            assistedByAi,
            Section(
                "Asignaciones",
                ["Caso", "Área", "Docente", "Estudiante", "Estado"],
                assignments.Select(item => Row(
                    item.CasoNumero, item.Area, item.Docente, item.Estudiante, item.Estado))));
    }

    private static AsistenteRespuestaDto QueryWorkload(
        ContextoAsistenteData context,
        IReadOnlyCollection<CasoAsistenteDto> cases,
        InterpretacionAsistente? interpretation,
        string? area,
        bool assistedByAi)
    {
        var activeCaseIds = cases.Where(item => !IsTerminal(item.Estado)).Select(item => item.Id).ToHashSet();
        var activeAssignments = context.Asignaciones
            .Where(item => item.DesasignadoEn is null && activeCaseIds.Contains(item.CasoId))
            .Where(item => area is null || item.Area.Equals(area, StringComparison.OrdinalIgnoreCase))
            .ToArray();
        var role = interpretation?.RolPersona ?? RolPersonaAsistente.Docente;
        IEnumerable<(string Person, string Role, string CaseNumber)> entries = role switch
        {
            RolPersonaAsistente.Estudiante => activeAssignments
                .Select(item => (item.Estudiante, "Estudiante", item.CasoNumero)),
            RolPersonaAsistente.Responsable => cases
                .Where(item => activeCaseIds.Contains(item.Id))
                .Select(item => (item.Responsable, "Responsable", item.Numero)),
            _ => activeAssignments.Select(item => (item.Docente, "Docente", item.CasoNumero))
        };
        var load = entries
            .Where(item => !IsUnassigned(item.Person))
            .Where(item => MatchesPerson(item.Person, interpretation?.Persona))
            .GroupBy(item => new { item.Person, item.Role })
            .Select(group => new
            {
                group.Key.Person,
                group.Key.Role,
                Count = group.Select(item => item.CaseNumber).Distinct().Count(),
                Cases = string.Join(", ", group.Select(item => item.CaseNumber).Distinct().OrderBy(value => value))
            })
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Person)
            .ToArray();
        var leader = load.FirstOrDefault();
        var answer = leader is null
            ? "No encontré carga activa para el filtro indicado."
            : interpretation?.Persona is not null
                ? $"{leader.Person} tiene {leader.Count} casos activos asignados."
                : $"{leader.Person} tiene la mayor carga, con {leader.Count} casos activos.";
        return Response(
            answer,
            "La carga cuenta casos no terminales con asignaciones vigentes.",
            [],
            assistedByAi,
            Section(
                "Carga por responsable",
                ["Persona", "Rol", "Casos activos", "Casos"],
                load.Select(item => Row(
                    item.Person, item.Role, item.Count.ToString(SpanishColombia), item.Cases))));
    }

    private static AsistenteRespuestaDto QuerySessions(
        ContextoAsistenteData context,
        InterpretacionAsistente? interpretation,
        string? area,
        string? caseNumber,
        DateTimeOffset now,
        bool upcoming,
        bool assistedByAi)
    {
        var caseAreas = context.Casos.ToDictionary(item => item.Id, item => item.Area);
        var filteredSessions = context.Sesiones
            .Where(item => upcoming
                ? item.Fecha >= now && !ContainsAny(Normalize(item.Estado), "finaliz", "cancelad", "realizad")
                : ContainsAny(Normalize(item.Estado), "realizad", "finalizad"))
            .Where(item => area is null || caseAreas.GetValueOrDefault(item.CasoId) == area)
            .Where(item => caseNumber is null || Normalize(item.CasoNumero) == Normalize(caseNumber))
            .Where(item => MatchesPerson(item.Responsable, interpretation?.Persona))
            .Where(item => IsWithin(item.Fecha, interpretation?.Desde, interpretation?.Hasta));
        var sessions = (upcoming
                ? filteredSessions.OrderBy(item => item.Fecha)
                : filteredSessions.OrderByDescending(item => item.Fecha))
            .Take(30)
            .ToArray();
        var label = upcoming ? "sesiones próximas" : "sesiones realizadas";
        return Response(
            CountAnswer(sessions.Length, label),
            upcoming
                ? "Sesiones futuras que no están realizadas, finalizadas ni canceladas."
                : "Sesiones marcadas como realizadas o finalizadas.",
            [],
            assistedByAi,
            Section(
                upcoming ? "Próximas sesiones" : "Sesiones realizadas",
                ["Fecha", "Caso", "Tipo", "Responsable", "Compromisos", "Estado"],
                sessions.Select(item => Row(
                    DateTimeValue(item.Fecha),
                    item.CasoNumero,
                    item.Tipo,
                    item.Responsable,
                    item.Compromisos.ToString(SpanishColombia),
                    item.Estado))));
    }

    private static AsistenteRespuestaDto QueryCommitments(
        ContextoAsistenteData context,
        InterpretacionAsistente? interpretation,
        string? area,
        string? caseNumber,
        bool assistedByAi)
    {
        var caseAreas = context.Casos.ToDictionary(item => item.Id, item => item.Area);
        var sessions = context.Sesiones
            .Where(item => item.Compromisos > 0)
            .Where(item => !ContainsAny(Normalize(item.Estado), "finaliz", "cancelad"))
            .Where(item => area is null || caseAreas.GetValueOrDefault(item.CasoId) == area)
            .Where(item => caseNumber is null || Normalize(item.CasoNumero) == Normalize(caseNumber))
            .Where(item => MatchesPerson(item.Responsable, interpretation?.Persona))
            .Where(item => IsWithin(item.Fecha, interpretation?.Desde, interpretation?.Hasta))
            .OrderBy(item => item.Fecha)
            .ToArray();
        var total = sessions.Sum(item => item.Compromisos);
        return Response(
            sessions.Length == 0
                ? "No encontré compromisos pendientes."
                : $"Hay {total} compromisos abiertos distribuidos en {sessions.Length} sesiones.",
            "El sistema registra una cantidad de compromisos por sesión; se consideran abiertos mientras la sesión no esté finalizada ni cancelada.",
            [],
            assistedByAi,
            Section(
                "Compromisos por sesión",
                ["Caso", "Sesión", "Fecha", "Responsable", "Pendientes", "Estado"],
                sessions.Select(item => Row(
                    item.CasoNumero,
                    item.Tipo,
                    DateTimeValue(item.Fecha),
                    item.Responsable,
                    item.Compromisos.ToString(SpanishColombia),
                    item.Estado))));
    }

    private static AsistenteRespuestaDto QueryMissingDocuments(
        ContextoAsistenteData context,
        IReadOnlyCollection<CasoAsistenteDto> cases,
        string? area,
        string? caseNumber,
        bool assistedByAi)
    {
        var selectedCases = cases
            .Where(item => area is null || item.Area.Equals(area, StringComparison.OrdinalIgnoreCase))
            .Where(item => caseNumber is null || Normalize(item.Numero) == Normalize(caseNumber))
            .ToArray();
        var rows = new List<IReadOnlyCollection<string>>();
        foreach (var item in selectedCases)
        {
            var documents = context.Documentos.Where(document => document.CasoId == item.Id).ToArray();
            if (documents.Length == 0)
            {
                rows.Add(Row(item.Numero, item.Area, item.Estado, "Soporte inicial", "Sin documentos registrados"));
            }

            if (IsTerminal(item.Estado) && !documents.Any(IsFinalReport))
            {
                rows.Add(Row(item.Numero, item.Area, item.Estado, "Informe final", "Requerido para cierre"));
            }
        }

        return Response(
            rows.Count == 0
                ? "No encontré documentos faltantes según las reglas operativas actuales."
                : $"Encontré {rows.Count} documentos o soportes faltantes.",
            "Regla operativa: cada caso debe tener al menos un soporte y los casos terminales deben incluir un informe final.",
            [],
            assistedByAi,
            new SeccionAsistenteDto(
                "Documentos faltantes",
                ["Caso", "Área", "Estado", "Faltante", "Motivo"],
                rows));
    }

    private static AsistenteRespuestaDto QueryDocumentVersions(
        ContextoAsistenteData context,
        string? area,
        string? caseNumber,
        bool assistedByAi)
    {
        var caseAreas = context.Casos.ToDictionary(item => item.Id, item => item.Area);
        var documents = context.Documentos
            .Where(item => area is null || caseAreas.GetValueOrDefault(item.CasoId) == area)
            .Where(item => caseNumber is null || Normalize(item.CasoNumero) == Normalize(caseNumber))
            .OrderBy(item => item.CasoNumero)
            .ThenByDescending(item => item.ActualizadoEn)
            .Take(40)
            .ToArray();
        return Response(
            CountAnswer(documents.Length, "documentos con versión registrada"),
            "Se muestran las versiones almacenadas en SQL Server y si cada registro está vigente.",
            [],
            assistedByAi,
            Section(
                "Versiones de documentos",
                ["Caso", "Documento", "Categoría", "Versión", "Vigente", "Actualización"],
                documents.Select(item => Row(
                    item.CasoNumero,
                    item.Nombre,
                    item.Categoria,
                    item.Version,
                    item.EsVigente ? "Sí" : "No",
                    DateTimeValue(item.ActualizadoEn)))));
    }

    private static AsistenteRespuestaDto QueryRequestsWithoutCase(
        ContextoAsistenteData context,
        InterpretacionAsistente? interpretation,
        string? area,
        string? period,
        bool assistedByAi)
    {
        var requests = context.Solicitudes
            .Where(item => !item.TieneCaso)
            .Where(item => !ContainsAny(Normalize(item.Estado), "rechaz", "cancel", "convert"))
            .Where(item => area is null || item.Area.Equals(area, StringComparison.OrdinalIgnoreCase))
            .Where(item => period is null || item.Periodo.Equals(period, StringComparison.OrdinalIgnoreCase))
            .Where(item => IsWithin(item.CreadoEn, interpretation?.Desde, interpretation?.Hasta))
            .OrderBy(item => RequestPriority(item.Estado))
            .ThenBy(item => item.CreadoEn)
            .Take(30)
            .ToArray();
        return Response(
            CountAnswer(requests.Length, "solicitudes pendientes de convertirse en caso"),
            "Solicitudes no terminales que todavía no están vinculadas a un caso.",
            [],
            assistedByAi,
            Section(
                "Solicitudes pendientes de caso",
                ["Radicado", "Área", "Periodo", "Asunto", "Estado", "Registro"],
                requests.Select(item => Row(
                    item.Radicado,
                    item.Area,
                    item.Periodo,
                    item.Asunto,
                    item.Estado,
                    DateTimeValue(item.CreadoEn)))));
    }

    private static AsistenteRespuestaDto QueryComparison(
        ContextoAsistenteData context,
        IReadOnlyCollection<CasoAsistenteDto> mappedCases,
        InterpretacionAsistente? interpretation,
        string? area,
        string? period,
        bool assistedByAi)
    {
        var dimension = interpretation?.AgruparPor ?? DimensionComparacionAsistente.Area;
        var entity = interpretation?.Entidad ?? EntidadComparacionAsistente.Casos;
        IEnumerable<(string Group, string Item)> values;

        if (entity == EntidadComparacionAsistente.Solicitudes || dimension == DimensionComparacionAsistente.Periodo)
        {
            values = context.Solicitudes
                .Where(item => area is null || item.Area.Equals(area, StringComparison.OrdinalIgnoreCase))
                .Where(item => period is null || item.Periodo.Equals(period, StringComparison.OrdinalIgnoreCase))
                .Where(item => IsWithin(item.CreadoEn, interpretation?.Desde, interpretation?.Hasta))
                .Select(item => (
                    dimension switch
                    {
                        DimensionComparacionAsistente.Periodo => item.Periodo,
                        DimensionComparacionAsistente.Estado => item.Estado,
                        DimensionComparacionAsistente.Mes => Month(item.CreadoEn),
                        _ => item.Area
                    },
                    item.Radicado));
            entity = EntidadComparacionAsistente.Solicitudes;
        }
        else if (entity == EntidadComparacionAsistente.Sesiones)
        {
            var caseAreas = context.Casos.ToDictionary(item => item.Id, item => item.Area);
            values = context.Sesiones
                .Where(item => area is null || caseAreas.GetValueOrDefault(item.CasoId) == area)
                .Where(item => IsWithin(item.Fecha, interpretation?.Desde, interpretation?.Hasta))
                .Select(item => (
                    dimension switch
                    {
                        DimensionComparacionAsistente.Responsable => item.Responsable,
                        DimensionComparacionAsistente.Estado => item.Estado,
                        DimensionComparacionAsistente.Mes => Month(item.Fecha),
                        _ => caseAreas.GetValueOrDefault(item.CasoId, "Sin área")
                    },
                    item.Id.ToString()));
        }
        else
        {
            var sourceCases = context.Casos
                .Where(item => area is null || item.Area.Equals(area, StringComparison.OrdinalIgnoreCase))
                .Where(item => IsWithin(item.FechaReferencia, interpretation?.Desde, interpretation?.Hasta));
            values = sourceCases.Select(item => (
                dimension switch
                {
                    DimensionComparacionAsistente.Responsable => item.Responsable,
                    DimensionComparacionAsistente.Estado => item.Estado,
                    DimensionComparacionAsistente.Mes => Month(item.FechaReferencia),
                    _ => item.Area
                },
                item.Numero));
        }

        var comparison = values
            .Where(item => !string.IsNullOrWhiteSpace(item.Group))
            .GroupBy(item => item.Group, StringComparer.OrdinalIgnoreCase)
            .Select(group => new
            {
                Name = group.Key,
                Count = group.Select(item => item.Item).Distinct().Count()
            })
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Name)
            .ToArray();
        var leader = comparison.FirstOrDefault();
        var entityLabel = entity switch
        {
            EntidadComparacionAsistente.Solicitudes => "solicitudes",
            EntidadComparacionAsistente.Sesiones => "sesiones",
            _ => "casos"
        };
        var resultLabel = leader?.Count == 1
            ? entity switch
            {
                EntidadComparacionAsistente.Solicitudes => "solicitud",
                EntidadComparacionAsistente.Sesiones => "sesión",
                _ => "caso"
            }
            : entityLabel;
        return Response(
            leader is null
                ? "No encontré datos para realizar la comparación solicitada."
                : $"{leader.Name} registra la mayor cantidad: {leader.Count} {resultLabel}.",
            $"Comparación de {entityLabel} agrupada por {dimension.ToString().ToLowerInvariant()}.",
            [],
            assistedByAi,
            Section(
                $"Comparación de {entityLabel}",
                [dimension.ToString(), "Cantidad"],
                comparison.Select(item => Row(
                    item.Name, item.Count.ToString(SpanishColombia)))));
    }

    private static AsistenteRespuestaDto Response(
        string answer,
        string criterion,
        IReadOnlyCollection<CasoAsistenteDto> cases,
        bool assistedByAi,
        params SeccionAsistenteDto[] sections) =>
        new(answer, criterion, cases, Suggestions, assistedByAi, sections);

    private static SeccionAsistenteDto Section(
        string title,
        IReadOnlyCollection<string> columns,
        IEnumerable<IReadOnlyCollection<string>> rows) =>
        new(title, columns, rows.ToArray());

    private static IReadOnlyCollection<string> Row(params string[] values) => values;

    private static TipoConsultaAsistente InferQueryType(string query)
    {
        if (ContainsAny(query, "version", "documentos cargados", "documentos vigentes"))
        {
            return TipoConsultaAsistente.VersionesDocumentos;
        }

        if (ContainsAny(query, "documentos falt", "documento falt", "soportes falt", "sin documento"))
        {
            return TipoConsultaAsistente.DocumentosFaltantes;
        }

        if (ContainsAny(query, "compromiso", "acuerdo pendiente"))
        {
            return TipoConsultaAsistente.CompromisosPendientes;
        }

        if (ContainsAny(query, "proxima sesion", "proximas sesiones", "sesiones program"))
        {
            return TipoConsultaAsistente.SesionesProximas;
        }

        if (ContainsAny(query, "sesiones realiz", "sesiones finaliz", "sesiones pasad"))
        {
            return TipoConsultaAsistente.SesionesRealizadas;
        }

        if (ContainsAny(query, "convertir en caso", "convertirse en caso", "convertid", "sin caso", "no tienen caso", "pendientes de caso"))
        {
            return TipoConsultaAsistente.SolicitudesSinCaso;
        }

        if (ContainsAny(query, "mayor carga", "carga por", "cantidad de casos por", "casos por responsable", "cuantos casos tiene", "cada docente", "cada estudiante"))
        {
            return TipoConsultaAsistente.CargaResponsable;
        }

        if (ContainsAny(query, "asignados a", "asignadas a", "casos del docente", "casos del estudiante"))
        {
            return TipoConsultaAsistente.CasosAsignados;
        }

        if (ContainsAny(query, "compar", "agrup", "por area", "por periodo"))
        {
            return TipoConsultaAsistente.Comparacion;
        }

        if (ContainsAny(query, "retras", "vencid", "demor", "atras")) return TipoConsultaAsistente.Retrasados;
        if (ContainsAny(query, "sin asign", "por asignar", "no asign")) return TipoConsultaAsistente.SinAsignar;
        if (ContainsAny(query, "pendient", "sin iniciar")) return TipoConsultaAsistente.Pendientes;
        if (ContainsAny(query, "cerrad", "finaliz", "terminad")) return TipoConsultaAsistente.Cerrados;
        if (ContainsAny(query, "activ", "proceso", "seguimiento", "abiert")) return TipoConsultaAsistente.Activos;
        if (ContainsAny(query, "cas-")) return TipoConsultaAsistente.Caso;
        return TipoConsultaAsistente.Resumen;
    }

    private static CasoAsistenteDto Map(CasoAsistenteData item, DateTimeOffset now)
    {
        var days = Math.Max(0, (int)Math.Floor((now - item.UltimaActividad).TotalDays));
        return new CasoAsistenteDto(
            item.Id,
            item.Numero,
            item.Solicitante,
            item.Area,
            item.Responsable,
            item.Estado,
            item.UltimaActividad,
            days,
            !IsTerminal(item.Estado) && days >= DiasParaRetraso,
            item.TieneAsignacion);
    }

    private static bool MatchesAssignmentPerson(
        AsignacionAsistenteData assignment,
        string? person,
        RolPersonaAsistente? role) => role switch
        {
            RolPersonaAsistente.Docente => MatchesPerson(assignment.Docente, person),
            RolPersonaAsistente.Estudiante => MatchesPerson(assignment.Estudiante, person),
            _ => MatchesPerson(assignment.Docente, person) || MatchesPerson(assignment.Estudiante, person)
        };

    private static bool MatchesPerson(string value, string? person)
    {
        if (string.IsNullOrWhiteSpace(person)) return true;
        var normalizedValue = Normalize(value);
        var normalizedPerson = Normalize(person);
        return normalizedValue.Contains(normalizedPerson, StringComparison.Ordinal) ||
               normalizedPerson.Contains(normalizedValue, StringComparison.Ordinal);
    }

    private static string? FindMentioned(string query, IEnumerable<string> values) =>
        values.FirstOrDefault(value => query.Contains(Normalize(value), StringComparison.Ordinal));

    private static RolPersonaAsistente InferPersonRole(string query)
    {
        if (ContainsAny(query, "estudiante")) return RolPersonaAsistente.Estudiante;
        if (ContainsAny(query, "responsable")) return RolPersonaAsistente.Responsable;
        if (ContainsAny(query, "docente", "profesor")) return RolPersonaAsistente.Docente;
        return RolPersonaAsistente.Cualquiera;
    }

    private static DimensionComparacionAsistente InferDimension(string query)
    {
        if (ContainsAny(query, "periodo", "semestre")) return DimensionComparacionAsistente.Periodo;
        if (ContainsAny(query, "responsable", "docente", "estudiante")) return DimensionComparacionAsistente.Responsable;
        if (ContainsAny(query, "estado")) return DimensionComparacionAsistente.Estado;
        if (ContainsAny(query, "mes", "mensual")) return DimensionComparacionAsistente.Mes;
        return DimensionComparacionAsistente.Area;
    }

    private static EntidadComparacionAsistente InferEntity(string query)
    {
        if (ContainsAny(query, "solicitud")) return EntidadComparacionAsistente.Solicitudes;
        if (ContainsAny(query, "sesion")) return EntidadComparacionAsistente.Sesiones;
        return EntidadComparacionAsistente.Casos;
    }

    private static bool IsWithin(DateTimeOffset value, DateOnly? from, DateOnly? to)
    {
        var date = DateOnly.FromDateTime(value.DateTime);
        return (!from.HasValue || date >= from.Value) && (!to.HasValue || date <= to.Value);
    }

    private static bool IsFinalReport(DocumentoAsistenteData document) =>
        ContainsAny(Normalize(document.Categoria), "informe", "reporte final") ||
        ContainsAny(Normalize(document.Nombre), "informe final", "reporte final");

    private static int RequestPriority(string state) => Normalize(state) switch
    {
        "aprobada" => 0,
        "enrevision" => 1,
        "pendienteinformacion" => 2,
        _ => 3
    };

    private static string CountAnswer(int count, string plural) => count switch
    {
        0 => $"No encontré {plural}.",
        1 => $"Encontré 1 resultado: {plural}.",
        _ => $"Encontré {count} {plural}."
    };

    private static string Month(DateTimeOffset value) =>
        value.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    private static string DateTimeValue(DateTimeOffset value) =>
        value.ToString("dd MMM yyyy · HH:mm", SpanishColombia);

    private static bool IsTerminal(string state) =>
        ContainsAny(Normalize(state), "cerrad", "finaliz", "cancelad");

    private static bool IsUnassigned(string responsible) =>
        string.IsNullOrWhiteSpace(responsible) ||
        ContainsAny(Normalize(responsible), "por definir", "sin asignar", "pendiente");

    private static bool ContainsAny(string value, params string[] fragments) =>
        fragments.Any(fragment => value.Contains(fragment, StringComparison.Ordinal));

    private static string Normalize(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }
}
