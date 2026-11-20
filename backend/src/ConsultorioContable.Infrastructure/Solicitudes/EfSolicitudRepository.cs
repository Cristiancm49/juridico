using ConsultorioContable.Application.Solicitudes;
using ConsultorioContable.Domain.Solicitudes;
using ConsultorioContable.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConsultorioContable.Infrastructure.Solicitudes;

public sealed class EfSolicitudRepository(ConsultorioDbContext dbContext) : ISolicitudRepository
{
    public async Task AddAsync(
        SolicitudAsesoria solicitud,
        CancellationToken cancellationToken)
    {
        await dbContext.Solicitudes.AddAsync(solicitud, cancellationToken);
        ApplyOriginalModelValues(solicitud, includeCreationDate: true);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<SolicitudAsesoria?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Solicitudes.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyCollection<SolicitudAsesoria>> ListAsync(
        CancellationToken cancellationToken) =>
        await dbContext.Solicitudes
            .AsNoTracking()
            .OrderByDescending(x => x.CreadoEn)
            .ToArrayAsync(cancellationToken);

    public async Task UpdateAsync(
        SolicitudAsesoria solicitud,
        CancellationToken cancellationToken)
    {
        dbContext.Solicitudes.Update(solicitud);
        ApplyOriginalModelValues(solicitud, includeCreationDate: false);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private void ApplyOriginalModelValues(SolicitudAsesoria solicitud, bool includeCreationDate)
    {
        var entry = dbContext.Entry(solicitud);
        entry.Property<Guid?>("EstadoCatalogoId").CurrentValue = solicitud.Estado switch
        {
            EstadoSolicitud.Radicada => Guid.Parse("60000000-0000-0000-0000-000000000001"),
            EstadoSolicitud.PendienteInformacion => Guid.Parse("60000000-0000-0000-0000-000000000002"),
            EstadoSolicitud.EnRevision => Guid.Parse("60000000-0000-0000-0000-000000000003"),
            EstadoSolicitud.Aprobada => Guid.Parse("60000000-0000-0000-0000-000000000004"),
            EstadoSolicitud.Rechazada => Guid.Parse("60000000-0000-0000-0000-000000000005"),
            EstadoSolicitud.Cancelada => Guid.Parse("60000000-0000-0000-0000-000000000006"),
            EstadoSolicitud.Convertida => Guid.Parse("60000000-0000-0000-0000-000000000007"),
            _ => throw new ArgumentOutOfRangeException(nameof(solicitud.Estado))
        };

        if (includeCreationDate)
        {
            entry.Property<DateOnly?>("FechaSolicitud").CurrentValue =
                DateOnly.FromDateTime(solicitud.CreadoEn.UtcDateTime);
        }
    }
}

