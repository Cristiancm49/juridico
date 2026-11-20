namespace ConsultorioContable.Application.Modulos;

public interface IModuleReadRepository
{
    Task<ModuleViewDto?> GetAsync(string module, CancellationToken cancellationToken);

    Task<ModuleMutationResultDto?> CreateAsync(
        string module,
        IReadOnlyDictionary<string, string> values,
        string actor,
        CancellationToken cancellationToken);

    Task<ModuleDocumentDto?> GetDocumentAsync(Guid id, CancellationToken cancellationToken);
}
