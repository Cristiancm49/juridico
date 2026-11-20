namespace ConsultorioContable.Application.Catalogos;

public sealed class CatalogoService(ICatalogoConsulta consulta)
{
    public Task<IReadOnlyCollection<AreaAsesoriaDto>> ListarAreasAsync(
        CancellationToken cancellationToken) =>
        consulta.ListarAreasAsync(cancellationToken);

    public Task<IReadOnlyCollection<PeriodoAcademicoDto>> ListarPeriodosAsync(
        CancellationToken cancellationToken) =>
        consulta.ListarPeriodosAsync(cancellationToken);

    public Task<IReadOnlyCollection<SolicitanteDto>> ListarSolicitantesAsync(
        CancellationToken cancellationToken) =>
        consulta.ListarSolicitantesAsync(cancellationToken);

    public Task<SolicitanteDto> CrearSolicitanteAsync(
        CrearSolicitanteCommand command,
        string actor,
        CancellationToken cancellationToken) =>
        consulta.CrearSolicitanteAsync(command, actor, cancellationToken);

    public Task<AreaAsesoriaDto> CrearAreaAsync(
        CrearAreaCommand command,
        string actor,
        CancellationToken cancellationToken) =>
        consulta.CrearAreaAsync(command, actor, cancellationToken);

    public Task<PeriodoAcademicoDto> CrearPeriodoAsync(
        CrearPeriodoCommand command,
        string actor,
        CancellationToken cancellationToken) =>
        consulta.CrearPeriodoAsync(command, actor, cancellationToken);
}
