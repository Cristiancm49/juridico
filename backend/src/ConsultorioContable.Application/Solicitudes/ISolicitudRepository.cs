using ConsultorioContable.Domain.Solicitudes;

namespace ConsultorioContable.Application.Solicitudes;

public interface ISolicitudRepository
{
    Task AddAsync(SolicitudAsesoria solicitud, CancellationToken cancellationToken);
    Task<SolicitudAsesoria?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SolicitudAsesoria>> ListAsync(CancellationToken cancellationToken);
    Task UpdateAsync(SolicitudAsesoria solicitud, CancellationToken cancellationToken);
}

