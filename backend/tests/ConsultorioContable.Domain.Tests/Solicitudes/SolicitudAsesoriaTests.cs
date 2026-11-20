using ConsultorioContable.Domain.Common;
using ConsultorioContable.Domain.Solicitudes;

namespace ConsultorioContable.Domain.Tests.Solicitudes;

public sealed class SolicitudAsesoriaTests
{
    private static readonly DateTimeOffset FechaInicial =
        new(2026, 11, 2, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Crear_deja_la_solicitud_radicada()
    {
        var solicitud = CrearSolicitud();

        Assert.Equal(EstadoSolicitud.Radicada, solicitud.Estado);
        Assert.False(solicitud.EsTerminal);
    }

    [Fact]
    public void Flujo_aprobado_puede_convertirse_en_caso()
    {
        var solicitud = CrearSolicitud();

        solicitud.IniciarRevision(FechaInicial.AddMinutes(1));
        solicitud.Aprobar(FechaInicial.AddMinutes(2));
        solicitud.ConvertirEnCaso(FechaInicial.AddMinutes(3));

        Assert.Equal(EstadoSolicitud.Convertida, solicitud.Estado);
        Assert.True(solicitud.EsTerminal);
    }

    [Fact]
    public void No_se_puede_aprobar_sin_revision()
    {
        var solicitud = CrearSolicitud();

        var error = Assert.Throws<DomainException>(
            () => solicitud.Aprobar(FechaInicial.AddMinutes(1)));

        Assert.Contains("Radicada", error.Message);
        Assert.Equal(EstadoSolicitud.Radicada, solicitud.Estado);
    }

    [Fact]
    public void Solicitud_rechazada_no_se_puede_reactivar()
    {
        var solicitud = CrearSolicitud();
        solicitud.IniciarRevision(FechaInicial.AddMinutes(1));
        solicitud.Rechazar(FechaInicial.AddMinutes(2));

        Assert.Throws<DomainException>(
            () => solicitud.IniciarRevision(FechaInicial.AddMinutes(3)));
    }

    private static SolicitudAsesoria CrearSolicitud() =>
        SolicitudAsesoria.Crear(
            Guid.NewGuid(),
            "SOL-20261102-0001",
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Orientacion contable",
            "Se requiere orientacion para organizar los soportes contables.",
            CanalRecepcion.Web,
            FechaInicial);
}

