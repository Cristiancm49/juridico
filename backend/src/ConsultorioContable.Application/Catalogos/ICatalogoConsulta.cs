namespace ConsultorioContable.Application.Catalogos;

public interface ICatalogoConsulta
{
    Task<IReadOnlyCollection<AreaAsesoriaDto>> ListarAreasAsync(
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<PeriodoAcademicoDto>> ListarPeriodosAsync(
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<SolicitanteDto>> ListarSolicitantesAsync(
        CancellationToken cancellationToken);

    Task<SolicitanteDto> CrearSolicitanteAsync(
        CrearSolicitanteCommand command,
        string actor,
        CancellationToken cancellationToken);

    Task<AreaAsesoriaDto> CrearAreaAsync(
        CrearAreaCommand command,
        string actor,
        CancellationToken cancellationToken);

    Task<PeriodoAcademicoDto> CrearPeriodoAsync(
        CrearPeriodoCommand command,
        string actor,
        CancellationToken cancellationToken);
}
