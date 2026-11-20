using ConsultorioContable.Domain.Common;

namespace ConsultorioContable.Domain.Solicitudes;

public sealed class SolicitudAsesoria
{
    private SolicitudAsesoria(
        Guid id,
        string radicado,
        Guid solicitanteId,
        Guid areaAsesoriaId,
        Guid periodoAcademicoId,
        string asunto,
        string descripcionNecesidad,
        CanalRecepcion canalRecepcion,
        DateTimeOffset creadoEn)
    {
        Id = id;
        Radicado = radicado;
        SolicitanteId = solicitanteId;
        AreaAsesoriaId = areaAsesoriaId;
        PeriodoAcademicoId = periodoAcademicoId;
        Asunto = asunto;
        DescripcionNecesidad = descripcionNecesidad;
        CanalRecepcion = canalRecepcion;
        Estado = EstadoSolicitud.Radicada;
        CreadoEn = creadoEn;
        ActualizadoEn = creadoEn;
    }

    public Guid Id { get; }
    public string Radicado { get; }
    public Guid SolicitanteId { get; }
    public Guid AreaAsesoriaId { get; }
    public Guid PeriodoAcademicoId { get; }
    public string Asunto { get; }
    public string DescripcionNecesidad { get; }
    public CanalRecepcion CanalRecepcion { get; }
    public EstadoSolicitud Estado { get; private set; }
    public DateTimeOffset CreadoEn { get; }
    public DateTimeOffset ActualizadoEn { get; private set; }

    public bool EsTerminal => Estado is EstadoSolicitud.Rechazada
        or EstadoSolicitud.Cancelada
        or EstadoSolicitud.Convertida;

    public static SolicitudAsesoria Crear(
        Guid id,
        string radicado,
        Guid solicitanteId,
        Guid areaAsesoriaId,
        Guid periodoAcademicoId,
        string asunto,
        string descripcionNecesidad,
        CanalRecepcion canalRecepcion,
        DateTimeOffset creadoEn)
    {
        ValidarId(id, nameof(id));
        ValidarId(solicitanteId, nameof(solicitanteId));
        ValidarId(areaAsesoriaId, nameof(areaAsesoriaId));
        ValidarId(periodoAcademicoId, nameof(periodoAcademicoId));

        return new SolicitudAsesoria(
            id,
            ValidarTexto(radicado, 50, nameof(radicado)),
            solicitanteId,
            areaAsesoriaId,
            periodoAcademicoId,
            ValidarTexto(asunto, 250, nameof(asunto)),
            ValidarTexto(descripcionNecesidad, 4_000, nameof(descripcionNecesidad)),
            canalRecepcion,
            creadoEn);
    }

    public void IniciarRevision(DateTimeOffset fecha) =>
        CambiarEstado(
            EstadoSolicitud.EnRevision,
            fecha,
            EstadoSolicitud.Radicada,
            EstadoSolicitud.PendienteInformacion);

    public void SolicitarInformacion(DateTimeOffset fecha) =>
        CambiarEstado(EstadoSolicitud.PendienteInformacion, fecha, EstadoSolicitud.EnRevision);

    public void Aprobar(DateTimeOffset fecha) =>
        CambiarEstado(EstadoSolicitud.Aprobada, fecha, EstadoSolicitud.EnRevision);

    public void Rechazar(DateTimeOffset fecha) =>
        CambiarEstado(EstadoSolicitud.Rechazada, fecha, EstadoSolicitud.EnRevision);

    public void Cancelar(DateTimeOffset fecha) =>
        CambiarEstado(
            EstadoSolicitud.Cancelada,
            fecha,
            EstadoSolicitud.Radicada,
            EstadoSolicitud.PendienteInformacion,
            EstadoSolicitud.EnRevision,
            EstadoSolicitud.Aprobada);

    public void ConvertirEnCaso(DateTimeOffset fecha) =>
        CambiarEstado(EstadoSolicitud.Convertida, fecha, EstadoSolicitud.Aprobada);

    private void CambiarEstado(
        EstadoSolicitud nuevoEstado,
        DateTimeOffset fecha,
        params EstadoSolicitud[] estadosPermitidos)
    {
        if (!estadosPermitidos.Contains(Estado))
        {
            throw new DomainException(
                $"No se puede cambiar una solicitud de {Estado} a {nuevoEstado}.");
        }

        if (fecha < ActualizadoEn)
        {
            throw new DomainException("La fecha de actualizacion no puede ser anterior al ultimo cambio.");
        }

        Estado = nuevoEstado;
        ActualizadoEn = fecha;
    }

    private static void ValidarId(Guid id, string nombre)
    {
        if (id == Guid.Empty)
        {
            throw new DomainException($"{nombre} es obligatorio.");
        }
    }

    private static string ValidarTexto(string valor, int longitudMaxima, string nombre)
    {
        var texto = valor?.Trim();

        if (string.IsNullOrWhiteSpace(texto))
        {
            throw new DomainException($"{nombre} es obligatorio.");
        }

        if (texto.Length > longitudMaxima)
        {
            throw new DomainException($"{nombre} supera la longitud maxima de {longitudMaxima} caracteres.");
        }

        return texto;
    }
}
