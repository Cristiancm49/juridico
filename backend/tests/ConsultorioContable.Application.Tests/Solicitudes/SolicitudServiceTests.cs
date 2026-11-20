using ConsultorioContable.Application.Common;
using ConsultorioContable.Application.Solicitudes;
using ConsultorioContable.Domain.Solicitudes;

namespace ConsultorioContable.Application.Tests.Solicitudes;

public sealed class SolicitudServiceTests
{
    [Fact]
    public async Task Crear_genera_radicado_y_persiste_la_solicitud()
    {
        var repository = new FakeSolicitudRepository();
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 2, 20, 0, 0, TimeSpan.Zero));
        var service = new SolicitudService(repository, clock);

        var resultado = await service.CrearAsync(
            new CrearSolicitudCommand(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Revision de costos",
                "La empresa necesita revisar su estructura de costos.",
                CanalRecepcion.Web),
            CancellationToken.None);

        Assert.StartsWith("SOL-20261102-", resultado.Radicado);
        Assert.Equal(EstadoSolicitud.Radicada, resultado.Estado);
        Assert.NotNull(await repository.GetByIdAsync(resultado.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Transicionar_actualiza_el_estado()
    {
        var repository = new FakeSolicitudRepository();
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 2, 20, 0, 0, TimeSpan.Zero));
        var service = new SolicitudService(repository, clock);
        var creada = await service.CrearAsync(
            new CrearSolicitudCommand(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Formalizacion",
                "Se requiere apoyo en el proceso de formalizacion.",
                CanalRecepcion.Presencial),
            CancellationToken.None);

        clock.Advance(TimeSpan.FromMinutes(1));
        var actualizada = await service.TransicionarAsync(
            creada.Id,
            TransicionSolicitud.IniciarRevision,
            CancellationToken.None);

        Assert.NotNull(actualizada);
        Assert.Equal(EstadoSolicitud.EnRevision, actualizada.Estado);
    }

    [Fact]
    public async Task Radicado_usa_la_fecha_institucional_de_Bogota()
    {
        var repository = new FakeSolicitudRepository();
        var clock = new FakeClock(new DateTimeOffset(2026, 11, 3, 1, 0, 0, TimeSpan.Zero));
        var service = new SolicitudService(repository, clock);

        var resultado = await service.CrearAsync(
            new CrearSolicitudCommand(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Organizacion contable",
                "La empresa necesita organizar sus procesos contables.",
                CanalRecepcion.Web),
            CancellationToken.None);

        Assert.StartsWith("SOL-20261102-", resultado.Radicado);
    }

    [Fact]
    public async Task Listar_devuelve_las_solicitudes_persistidas()
    {
        var repository = new FakeSolicitudRepository();
        var service = new SolicitudService(
            repository,
            new FakeClock(new DateTimeOffset(2026, 11, 3, 12, 0, 0, TimeSpan.Zero)));

        await service.CrearAsync(
            new CrearSolicitudCommand(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Revision tributaria",
                "La empresa solicita orientacion sobre sus obligaciones.",
                CanalRecepcion.Web),
            CancellationToken.None);

        var resultado = await service.ListarAsync(CancellationToken.None);

        Assert.Single(resultado);
    }

    private sealed class FakeClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; private set; } = utcNow;

        public void Advance(TimeSpan duration) => UtcNow = UtcNow.Add(duration);
    }

    private sealed class FakeSolicitudRepository : ISolicitudRepository
    {
        private readonly Dictionary<Guid, SolicitudAsesoria> _solicitudes = [];

        public Task AddAsync(SolicitudAsesoria solicitud, CancellationToken cancellationToken)
        {
            _solicitudes.Add(solicitud.Id, solicitud);
            return Task.CompletedTask;
        }

        public Task<SolicitudAsesoria?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            _solicitudes.TryGetValue(id, out var solicitud);
            return Task.FromResult(solicitud);
        }

        public Task<IReadOnlyCollection<SolicitudAsesoria>> ListAsync(
            CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyCollection<SolicitudAsesoria>>(
                _solicitudes.Values.ToArray());

        public Task UpdateAsync(SolicitudAsesoria solicitud, CancellationToken cancellationToken)
        {
            _solicitudes[solicitud.Id] = solicitud;
            return Task.CompletedTask;
        }
    }
}
