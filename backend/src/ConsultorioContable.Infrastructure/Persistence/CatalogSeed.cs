using ConsultorioContable.Infrastructure.Persistence.Models;

namespace ConsultorioContable.Infrastructure.Persistence;

internal static class CatalogSeed
{
    internal static readonly Guid Periodo2026_2Id =
        Guid.Parse("10000000-0000-0000-0000-000000000001");

    internal static readonly Guid ContabilidadGeneralId =
        Guid.Parse("20000000-0000-0000-0000-000000000001");

    internal static IEnumerable<AreaAsesoriaRecord> Areas =>
    [
        Area("20000000-0000-0000-0000-000000000001", "CONT_GENERAL", "Contabilidad general", 1),
        Area("20000000-0000-0000-0000-000000000002", "ORG_CONTABLE", "Organizacion contable", 2),
        Area("20000000-0000-0000-0000-000000000003", "COSTOS", "Costos", 3),
        Area("20000000-0000-0000-0000-000000000004", "INVENTARIOS", "Inventarios", 4),
        Area("20000000-0000-0000-0000-000000000005", "EST_FINANC", "Estados financieros", 5),
        Area("20000000-0000-0000-0000-000000000006", "FORMALIZ", "Formalizacion contable", 6),
        Area("20000000-0000-0000-0000-000000000007", "GEST_DOC", "Gestion documental contable", 7),
        Area("20000000-0000-0000-0000-000000000008", "ORIENT_EMP", "Orientacion empresarial", 8),
        Area("20000000-0000-0000-0000-000000000009", "OTRA", "Otra", 9)
    ];

    internal static IEnumerable<PeriodoAcademicoRecord> Periodos =>
    [
        Periodo("10000000-0000-0000-0000-000000000002", "2025-2", "Segundo semestre 2025", new(2025, 8, 1), new(2025, 12, 15), false),
        Periodo("10000000-0000-0000-0000-000000000003", "2026-1", "Primer semestre 2026", new(2026, 1, 20), new(2026, 6, 15), false),
        Periodo(Periodo2026_2Id.ToString(), "2026-2", "Segundo semestre 2026", new(2026, 8, 1), new(2026, 12, 15), true)
    ];

    private static AreaAsesoriaRecord Area(string id, string codigo, string nombre, short orden) => new()
    {
        Id = Guid.Parse(id),
        Codigo = codigo,
        Nombre = nombre,
        Orden = orden,
        Activo = true
    };

    private static PeriodoAcademicoRecord Periodo(
        string id,
        string codigo,
        string nombre,
        DateOnly inicio,
        DateOnly fin,
        bool activo) => new()
    {
        Id = Guid.Parse(id),
        Codigo = codigo,
        Nombre = nombre,
        FechaInicio = inicio,
        FechaFin = fin,
        Activo = activo
    };
}

