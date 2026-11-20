namespace ConsultorioContable.Application.Asistente;

public interface IAsistenteCasosRepository
{
    Task<ContextoAsistenteData> ObtenerContextoAsync(
        CancellationToken cancellationToken);
}
