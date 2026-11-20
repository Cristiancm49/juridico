namespace ConsultorioContable.Application.Modulos;

public sealed record ModuleMetricDto(string Label, int Value);

public sealed record ModuleViewDto(
    IReadOnlyCollection<ModuleMetricDto> Metrics,
    IReadOnlyCollection<string> Columns,
    IReadOnlyCollection<IReadOnlyCollection<string>> Rows,
    bool EsDemostracion,
    IReadOnlyCollection<Guid>? RowIds = null);

public sealed record ModuleDocumentDto(
    string Nombre,
    string MimeType,
    byte[] Contenido);
