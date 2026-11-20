namespace ConsultorioContable.Application.Modulos;

public sealed class ModuleService(IModuleReadRepository repository)
{
    public Task<ModuleViewDto?> GetAsync(
        string module,
        CancellationToken cancellationToken) =>
        repository.GetAsync(module.Trim().ToLowerInvariant(), cancellationToken);

    public Task<ModuleMutationResultDto?> CreateAsync(
        string module,
        IReadOnlyDictionary<string, string> values,
        string actor,
        CancellationToken cancellationToken) =>
        repository.CreateAsync(
            module.Trim().ToLowerInvariant(),
            values,
            actor,
            cancellationToken);

    public Task<ModuleDocumentDto?> GetDocumentAsync(
        Guid id,
        CancellationToken cancellationToken) =>
        repository.GetDocumentAsync(id, cancellationToken);
}
