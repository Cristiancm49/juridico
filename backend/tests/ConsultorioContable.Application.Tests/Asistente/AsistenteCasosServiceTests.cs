using ConsultorioContable.Application.Asistente;
using ConsultorioContable.Application.Common;

namespace ConsultorioContable.Application.Tests.Asistente;

public sealed class AsistenteCasosServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 15, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Identifica_casos_retrasados_con_30_dias_sin_actividad()
    {
        var service = CreateService();

        var result = await service.ConsultarAsync("¿Qué casos están retrasados?", default);

        var item = Assert.Single(result.Casos);
        Assert.Equal("CAS-001", item.Numero);
        Assert.True(item.Retrasado);
        Assert.Contains("30 días", result.Criterio);
    }

    [Fact]
    public async Task Identifica_casos_pendientes_o_sin_asignacion()
    {
        var service = CreateService();

        var result = await service.ConsultarAsync("Muéstrame los casos pendientes", default);

        var item = Assert.Single(result.Casos);
        Assert.Equal("CAS-002", item.Numero);
    }

    [Fact]
    public async Task Responde_por_numero_de_caso()
    {
        var service = CreateService();

        var result = await service.ConsultarAsync("¿Cómo está el caso CAS-003?", default);

        var item = Assert.Single(result.Casos);
        Assert.Equal("Cerrado", item.Estado);
        Assert.Contains("CAS-003", result.Respuesta);
    }

    [Fact]
    public async Task Usa_gemini_para_interpretar_una_pregunta_ambigua()
    {
        var service = new AsistenteCasosService(
            new FakeRepository(),
            new FakeClock(Now),
            new FakeLanguageAssistant());

        var result = await service.ConsultarAsync(
            "¿Cuáles requieren atención urgente?",
            default);

        var item = Assert.Single(result.Casos);
        Assert.Equal("CAS-001", item.Numero);
        Assert.True(result.AsistidoPorIa);
    }

    [Fact]
    public async Task Calcula_carga_activa_por_docente()
    {
        var service = CreateService(new(
            TipoConsultaAsistente.CargaResponsable,
            null,
            null,
            null,
            RolPersonaAsistente.Docente));

        var result = await service.ConsultarAsync("¿Qué docente tiene mayor carga?", default);

        Assert.Contains("Docente Uno", result.Respuesta);
        Assert.Equal("2", Assert.Single(result.Secciones).Filas.First().ElementAt(2));
    }

    [Fact]
    public async Task Lista_proximas_sesiones()
    {
        var service = CreateService(new(TipoConsultaAsistente.SesionesProximas, null, null));

        var result = await service.ConsultarAsync("¿Cuáles son las próximas sesiones?", default);

        var row = Assert.Single(Assert.Single(result.Secciones).Filas);
        Assert.Equal("CAS-001", row.ElementAt(1));
    }

    [Fact]
    public async Task Lista_solicitudes_sin_caso_y_excluye_terminales()
    {
        var service = CreateService(new(TipoConsultaAsistente.SolicitudesSinCaso, null, null));

        var result = await service.ConsultarAsync("Solicitudes pendientes de caso", default);

        var row = Assert.Single(Assert.Single(result.Secciones).Filas);
        Assert.Equal("SOL-001", row.First());
    }

    [Fact]
    public async Task Reporta_documento_final_faltante_en_caso_cerrado()
    {
        var service = CreateService(new(TipoConsultaAsistente.DocumentosFaltantes, null, null));

        var result = await service.ConsultarAsync("¿Qué documentos faltan?", default);

        var row = Assert.Single(Assert.Single(result.Secciones).Filas.Where(item => item.First() == "CAS-003"));
        Assert.Equal("CAS-003", row.First());
        Assert.Equal("Informe final", row.ElementAt(3));
    }

    [Fact]
    public async Task Respaldo_local_identifica_solicitudes_por_convertir()
    {
        var service = CreateService();

        var result = await service.ConsultarAsync(
            "¿Qué solicitudes faltan por convertirse en caso?",
            default);

        Assert.Equal("SOL-001", Assert.Single(Assert.Single(result.Secciones).Filas).First());
        Assert.False(result.AsistidoPorIa);
    }

    [Fact]
    public async Task Respaldo_local_filtra_asignaciones_por_persona()
    {
        var service = CreateService();

        var result = await service.ConsultarAsync(
            "Muéstrame los casos asignados a Docente Uno",
            default);

        Assert.Equal(2, Assert.Single(result.Secciones).Filas.Count);
    }

    private static AsistenteCasosService CreateService() =>
        new(new FakeRepository(), new FakeClock(Now));

    private static AsistenteCasosService CreateService(InterpretacionAsistente interpretation) =>
        new(new FakeRepository(), new FakeClock(Now), new FakeLanguageAssistant(interpretation));

    private sealed class FakeClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }

    private sealed class FakeRepository : IAsistenteCasosRepository
    {
        private static readonly Guid CaseOne = Guid.Parse("10000000-0000-0000-0000-000000000001");
        private static readonly Guid CaseTwo = Guid.Parse("10000000-0000-0000-0000-000000000002");
        private static readonly Guid CaseThree = Guid.Parse("10000000-0000-0000-0000-000000000003");

        public Task<ContextoAsistenteData> ObtenerContextoAsync(
            CancellationToken cancellationToken)
        {
            IReadOnlyCollection<CasoAsistenteData> cases =
            [
                new(CaseOne, "CAS-001", "Empresa Uno", "Costos", "Docente Uno", "Activo", Now.AddDays(-45), Now.AddDays(-45), true, null),
                new(CaseTwo, "CAS-002", "Empresa Dos", "Inventarios", "Por definir", "Pendiente", Now.AddDays(-5), Now.AddDays(-5), false, null),
                new(CaseThree, "CAS-003", "Empresa Tres", "Costos", "Docente Dos", "Cerrado", Now.AddDays(-90), Now.AddDays(-90), true, null)
            ];
            IReadOnlyCollection<AsignacionAsistenteData> assignments =
            [
                new(Guid.NewGuid(), CaseOne, "CAS-001", "Costos", "Docente Uno", "Estudiante Uno", Now.AddDays(-40), null, "Asignado"),
                new(Guid.NewGuid(), CaseTwo, "CAS-002", "Inventarios", "Docente Uno", "Estudiante Dos", Now.AddDays(-4), null, "Asignado"),
                new(Guid.NewGuid(), CaseThree, "CAS-003", "Costos", "Docente Dos", "Estudiante Uno", Now.AddDays(-80), null, "Finalizada")
            ];
            IReadOnlyCollection<SesionAsistenteData> sessions =
            [
                new(Guid.NewGuid(), CaseOne, "CAS-001", Now.AddDays(1), "Seguimiento", "Docente Uno", 2, "Programada"),
                new(Guid.NewGuid(), CaseThree, "CAS-003", Now.AddDays(-2), "Cierre", "Docente Dos", 0, "Finalizada")
            ];
            IReadOnlyCollection<DocumentoAsistenteData> documents =
            [
                new(Guid.NewGuid(), CaseOne, "CAS-001", "Diagnóstico.pdf", "Diagnóstico", "v1", true, "Estudiante Uno", Now.AddDays(-3)),
                new(Guid.NewGuid(), CaseThree, "CAS-003", "Soporte.xlsx", "Soporte", "v1", true, "Docente Dos", Now.AddDays(-10))
            ];
            IReadOnlyCollection<SolicitudAsistenteData> requests =
            [
                new(Guid.NewGuid(), "SOL-001", "Empresa Uno", "Costos", "2026-2", "Apoyo", "Aprobada", Now.AddDays(-3), false),
                new(Guid.NewGuid(), "SOL-002", "Empresa Dos", "Costos", "2026-2", "Rechazada", "Rechazada", Now.AddDays(-2), false)
            ];
            IReadOnlyCollection<PeriodoAsistenteData> periods =
            [
                new("2026-2", "Segundo semestre 2026", new(2026, 8, 1), new(2026, 12, 15), true)
            ];
            return Task.FromResult(new ContextoAsistenteData(
                cases, assignments, sessions, documents, requests, periods));
        }
    }

    private sealed class FakeLanguageAssistant(
        InterpretacionAsistente? interpretation = null) : IAsistenteLenguajeNatural
    {
        public Task<InterpretacionAsistente?> InterpretarAsync(
            string pregunta,
            OpcionesInterpretacionAsistente opciones,
            CancellationToken cancellationToken) =>
            Task.FromResult<InterpretacionAsistente?>(interpretation ?? new InterpretacionAsistente(
                TipoConsultaAsistente.Retrasados, null, null));
    }
}
