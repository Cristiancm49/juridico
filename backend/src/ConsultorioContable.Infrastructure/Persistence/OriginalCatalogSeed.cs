using ConsultorioContable.Infrastructure.Persistence.Models;

namespace ConsultorioContable.Infrastructure.Persistence;

internal static class OriginalCatalogSeed
{
    internal static IEnumerable<EstadoSolicitudRecord> EstadosSolicitud =>
    [
        EstadoSolicitud("60000000-0000-0000-0000-000000000001", "RADICADA", "Radicada", 1, false),
        EstadoSolicitud("60000000-0000-0000-0000-000000000002", "PEND_INFO", "Pendiente información", 2, false),
        EstadoSolicitud("60000000-0000-0000-0000-000000000003", "EN_REVISION", "En revisión", 3, false),
        EstadoSolicitud("60000000-0000-0000-0000-000000000004", "APROBADA", "Aprobada", 4, false),
        EstadoSolicitud("60000000-0000-0000-0000-000000000005", "RECHAZADA", "Rechazada", 5, true),
        EstadoSolicitud("60000000-0000-0000-0000-000000000006", "CANCELADA", "Cancelada", 6, true),
        EstadoSolicitud("60000000-0000-0000-0000-000000000007", "CONVERTIDA", "Convertida en caso", 7, true)
    ];

    internal static IEnumerable<EstadoCasoRecord> EstadosCaso =>
    [
        EstadoCaso("70000000-0000-0000-0000-000000000001", "ASIGNADO", "Asignado", 1, false),
        EstadoCaso("70000000-0000-0000-0000-000000000002", "EN_PROCESO", "En proceso", 2, false),
        EstadoCaso("70000000-0000-0000-0000-000000000003", "EN_REV_AVANCE", "En revisión de avances", 3, false),
        EstadoCaso("70000000-0000-0000-0000-000000000004", "PEND_CORREC", "Pendiente corrección", 4, false),
        EstadoCaso("70000000-0000-0000-0000-000000000005", "FINALIZADO", "Finalizado", 5, true),
        EstadoCaso("70000000-0000-0000-0000-000000000006", "CERRADO", "Cerrado", 6, true),
        EstadoCaso("70000000-0000-0000-0000-000000000007", "CANCELADO", "Cancelado", 7, true),
        EstadoCaso("70000000-0000-0000-0000-000000000008", "REABIERTO", "Reabierto", 8, false)
    ];

    internal static IEnumerable<CategoriaDocumentoRecord> CategoriasDocumento =>
    [
        Categoria("80000000-0000-0000-0000-000000000001", "DOC_IDENT", "Documento de identificación", 1),
        Categoria("80000000-0000-0000-0000-000000000002", "SOPORTE_SOL", "Soporte de solicitud", 2),
        Categoria("80000000-0000-0000-0000-000000000003", "FORMATO_INST", "Formato institucional", 3),
        Categoria("80000000-0000-0000-0000-000000000004", "EVID_AVANCE", "Evidencia de avance", 4),
        Categoria("80000000-0000-0000-0000-000000000005", "DOC_CONTABLE", "Documento contable", 5),
        Categoria("80000000-0000-0000-0000-000000000006", "INFORME_FINAL", "Reporte final", 6),
        Categoria("80000000-0000-0000-0000-000000000007", "EVAL_SERVICIO", "Evaluación del servicio", 7),
        Categoria("80000000-0000-0000-0000-000000000008", "OTRO", "Otro", 8)
    ];

    private static EstadoSolicitudRecord EstadoSolicitud(
        string id, string codigo, string nombre, short orden, bool terminal) => new()
    {
        Id = Guid.Parse(id), Codigo = codigo, Nombre = nombre, Orden = orden, Terminal = terminal
    };

    private static EstadoCasoRecord EstadoCaso(
        string id, string codigo, string nombre, short orden, bool terminal) => new()
    {
        Id = Guid.Parse(id), Codigo = codigo, Nombre = nombre, Orden = orden, Terminal = terminal
    };

    private static CategoriaDocumentoRecord Categoria(
        string id, string codigo, string nombre, short orden) => new()
    {
        Id = Guid.Parse(id), Codigo = codigo, Nombre = nombre, Orden = orden, Activo = true
    };
}
