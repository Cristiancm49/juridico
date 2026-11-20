using ConsultorioContable.Application.Asistente;
using ConsultorioContable.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConsultorioContable.Infrastructure.Asistente;

public sealed class EfAsistenteCasosRepository(ConsultorioDbContext dbContext)
    : IAsistenteCasosRepository
{
    public async Task<ContextoAsistenteData> ObtenerContextoAsync(
        CancellationToken cancellationToken)
    {
        var cases = await (
                from item in dbContext.Casos.AsNoTracking()
                join applicant in dbContext.Solicitantes.AsNoTracking()
                    on item.SolicitanteId equals applicant.Id
                join area in dbContext.AreasAsesoria.AsNoTracking()
                    on item.AreaAsesoriaId equals area.Id
                select new
                {
                    item.Id,
                    item.Numero,
                    Solicitante = applicant.NombreCompleto,
                    Area = area.Nombre,
                    item.Responsable,
                    item.Estado,
                    FechaReferencia = item.CreadoEn ?? item.ActualizadoEn,
                    item.ActualizadoEn,
                    item.SolicitudOrigenId
                })
            .ToArrayAsync(cancellationToken);

        var sessions = await (
                from item in dbContext.Sesiones.AsNoTracking()
                join caseItem in dbContext.Casos.AsNoTracking()
                    on item.CasoId equals caseItem.Id
                select new SesionAsistenteData(
                    item.Id,
                    item.CasoId,
                    caseItem.Numero,
                    item.Fecha,
                    item.Tipo,
                    item.Responsable,
                    item.Compromisos,
                    item.Estado))
            .ToArrayAsync(cancellationToken);

        var lastSessions = sessions
            .GroupBy(item => item.CasoId)
            .ToDictionary(group => group.Key, group => group.Max(item => item.Fecha));

        var assignments = await (
                from item in dbContext.Asignaciones.AsNoTracking()
                join caseItem in dbContext.Casos.AsNoTracking()
                    on item.CasoId equals caseItem.Id
                select new AsignacionAsistenteData(
                    item.Id,
                    item.CasoId,
                    caseItem.Numero,
                    item.Area,
                    item.Docente,
                    item.Estudiante,
                    item.AsignadoEn,
                    item.DesasignadoEn,
                    item.Estado))
            .ToArrayAsync(cancellationToken);
        var assignedCases = assignments
            .Where(item => item.DesasignadoEn is null && !IsInactive(item.Estado))
            .Select(item => item.CasoId)
            .ToHashSet();

        var caseData = cases.Select(item =>
        {
            var lastActivity = lastSessions.GetValueOrDefault(item.Id);
            if (lastActivity < item.ActualizadoEn)
            {
                lastActivity = item.ActualizadoEn;
            }

            return new CasoAsistenteData(
                item.Id,
                item.Numero,
                item.Solicitante,
                item.Area,
                item.Responsable,
                item.Estado,
                item.FechaReferencia,
                lastActivity,
                assignedCases.Contains(item.Id),
                item.SolicitudOrigenId);
        }).ToArray();

        var documents = await (
                from item in dbContext.Documentos.AsNoTracking()
                join caseItem in dbContext.Casos.AsNoTracking()
                    on item.CasoId equals caseItem.Id
                select new DocumentoAsistenteData(
                    item.Id,
                    item.CasoId,
                    caseItem.Numero,
                    item.Nombre,
                    item.Categoria,
                    item.Version,
                    item.EsVigente,
                    item.Responsable,
                    item.ActualizadoEn))
            .ToArrayAsync(cancellationToken);

        var linkedRequestIds = cases
            .Where(item => item.SolicitudOrigenId.HasValue)
            .Select(item => item.SolicitudOrigenId!.Value)
            .ToHashSet();
        var requests = await (
                from item in dbContext.Solicitudes.AsNoTracking()
                join applicant in dbContext.Solicitantes.AsNoTracking()
                    on item.SolicitanteId equals applicant.Id
                join area in dbContext.AreasAsesoria.AsNoTracking()
                    on item.AreaAsesoriaId equals area.Id
                join period in dbContext.PeriodosAcademicos.AsNoTracking()
                    on item.PeriodoAcademicoId equals period.Id
                select new
                {
                    item.Id,
                    item.Radicado,
                    Solicitante = applicant.NombreCompleto,
                    Area = area.Nombre,
                    Periodo = period.Codigo,
                    item.Asunto,
                    item.Estado,
                    item.CreadoEn
                })
            .ToArrayAsync(cancellationToken);
        var requestData = requests.Select(item => new SolicitudAsistenteData(
            item.Id,
            item.Radicado,
            item.Solicitante,
            item.Area,
            item.Periodo,
            item.Asunto,
            item.Estado.ToString(),
            item.CreadoEn,
            linkedRequestIds.Contains(item.Id))).ToArray();

        var periods = await dbContext.PeriodosAcademicos
            .AsNoTracking()
            .OrderBy(item => item.FechaInicio)
            .Select(item => new PeriodoAsistenteData(
                item.Codigo,
                item.Nombre,
                item.FechaInicio,
                item.FechaFin,
                item.Activo))
            .ToArrayAsync(cancellationToken);

        return new ContextoAsistenteData(
            caseData,
            assignments,
            sessions,
            documents,
            requestData,
            periods);
    }

    private static bool IsInactive(string state) =>
        state.Equals("Finalizada", StringComparison.OrdinalIgnoreCase) ||
        state.Equals("Cancelada", StringComparison.OrdinalIgnoreCase);
}
