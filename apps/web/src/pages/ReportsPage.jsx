import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Download, FileText, FolderOpen, RefreshCw, Scale, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiDownload, apiFetch } from '../api.js';

function initialFilters() {
  const today = new Date();
  return {
    from: `${today.getFullYear()}-01-01`, to: today.toISOString().slice(0, 10),
    legalAreaId: '', assigneeId: '', status: '',
  };
}

function buildParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.toString();
}

function BarList({ items, emptyText }) {
  const maximum = Math.max(1, ...items.map(({ total }) => total));
  if (!items.length) return <div className="report-empty"><span>{emptyText}</span></div>;
  return <div className="report-bars">{items.map((item) => (
    <div className="report-bar-row" key={item.id || item.code || item.name}>
      <div><span>{item.name}</span><strong>{item.total}</strong></div>
      <span className="report-bar-track" aria-hidden="true"><i style={{ width: `${Math.max(4, (item.total / maximum) * 100)}%`, background: item.color }} /></span>
    </div>
  ))}</div>;
}

export function ReportsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [options, setOptions] = useState({ legalAreas: [], assignees: [], statuses: [] });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const query = buildParams(appliedFilters);
      const [reportData, optionsData] = await Promise.all([
        apiFetch(`/api/v1/reports/overview${query ? `?${query}` : ''}`),
        apiFetch('/api/v1/reports/options'),
      ]);
      setReport(reportData); setOptions(optionsData);
    } catch (loadError) {
      setError(loadError.message); toast.error(loadError.message);
    } finally { setLoading(false); }
  }, [appliedFilters]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const periodLabel = useMemo(() => {
    if (!appliedFilters.from && !appliedFilters.to) return 'Todo el historial';
    return `${appliedFilters.from || 'Inicio'} — ${appliedFilters.to || 'Hoy'}`;
  }, [appliedFilters]);

  function submitFilters(event) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      toast.error('La fecha inicial no puede ser posterior a la fecha final.'); return;
    }
    setAppliedFilters(filters);
  }

  function clearFilters() {
    const cleared = { from: '', to: '', legalAreaId: '', assigneeId: '', status: '' };
    setFilters(cleared); setAppliedFilters(cleared);
  }

  async function downloadCsv() {
    setDownloading(true);
    try {
      const query = buildParams(appliedFilters);
      const { blob, filename } = await apiDownload(`/api/v1/reports/cases.csv${query ? `?${query}` : ''}`);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
      toast.success('Reporte CSV generado correctamente.');
    } catch (downloadError) { toast.error(downloadError.message); }
    finally { setDownloading(false); }
  }

  const totals = report?.totals || {};
  return <section>
    <div className="page-heading">
      <div><span className="eyebrow">ANÁLISIS OPERATIVO</span><h1>Reportes</h1><p>Consulta la carga jurídica y exporta el detalle con los mismos filtros.</p></div>
      <button type="button" className="primary-button" onClick={downloadCsv} disabled={loading || downloading || !report}><Download size={18} /> {downloading ? 'Generando…' : 'Exportar CSV'}</button>
    </div>

    <form className="panel report-filters" onSubmit={submitFilters} aria-label="Filtros del reporte">
      <label>Desde<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
      <label>Hasta<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
      <label>Área jurídica<select value={filters.legalAreaId} onChange={(event) => setFilters({ ...filters, legalAreaId: event.target.value })}><option value="">Todas las áreas</option>{options.legalAreas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select></label>
      <label>Estado<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos los estados</option>{options.statuses.map((status) => <option value={status.code} key={status.code}>{status.name}</option>)}</select></label>
      <label>Responsable<select value={filters.assigneeId} onChange={(event) => setFilters({ ...filters, assigneeId: event.target.value })}><option value="">Todos los responsables</option>{options.assignees.map((assignee) => <option value={assignee.id} key={assignee.id}>{assignee.fullName}</option>)}</select></label>
      <div className="report-filter-actions"><button className="primary-button" type="submit">Aplicar</button><button className="secondary-button" type="button" onClick={clearFilters}>Limpiar</button></div>
    </form>

    {loading && <div className="panel report-state" role="status"><RefreshCw className="spin" size={22} /><span>Calculando indicadores…</span></div>}
    {!loading && error && <div className="panel report-state error-state" role="alert"><AlertTriangle size={23} /><div><strong>No fue posible cargar el reporte</strong><span>{error}</span></div><button className="secondary-button" type="button" onClick={loadReport}>Reintentar</button></div>}

    {!loading && !error && report && <>
      <div className="report-context"><span>Periodo aplicado</span><strong>{periodLabel}</strong><small>Actualizado {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.generatedAt))}</small></div>
      <div className="report-metric-grid">
        <article><BriefcaseBusiness /><span>Expedientes</span><strong>{totals.totalCases}</strong><small>{totals.activeCases} activos</small></article>
        <article><CheckCircle2 /><span>Cerrados o archivados</span><strong>{totals.closedCases}</strong><small>En el periodo</small></article>
        <article className={totals.overdueTasks ? 'warning' : ''}><AlertTriangle /><span>Tareas vencidas</span><strong>{totals.overdueTasks}</strong><small>de {totals.activeTasks} activas</small></article>
        <article><Scale /><span>Solicitudes recibidas</span><strong>{totals.requests}</strong><small>Según periodo y área</small></article>
        <article><FolderOpen /><span>Documentos vigentes</span><strong>{totals.currentDocuments}</strong><small>Versiones actuales</small></article>
        <article><FileText /><span>Actuaciones</span><strong>{totals.actions}</strong><small>Registradas en expedientes</small></article>
      </div>

      {totals.totalCases === 0 ? <div className="panel report-state"><BriefcaseBusiness size={24} /><div><strong>No hay expedientes para estos filtros</strong><span>Ajusta el periodo o limpia algún filtro para ampliar el resultado.</span></div></div> : <>
        <div className="report-chart-grid">
          <article className="panel report-panel"><div className="report-panel-head"><div><span className="eyebrow">EXPEDIENTES</span><h2>Por estado</h2></div><BriefcaseBusiness /></div><BarList items={report.casesByStatus} emptyText="Sin estados para mostrar." /></article>
          <article className="panel report-panel"><div className="report-panel-head"><div><span className="eyebrow">DISTRIBUCIÓN</span><h2>Por área jurídica</h2></div><Scale /></div><BarList items={report.casesByArea} emptyText="Sin áreas para mostrar." /></article>
          <article className="panel report-panel"><div className="report-panel-head"><div><span className="eyebrow">COMPROMISOS</span><h2>Tareas por estado</h2></div><CheckCircle2 /></div><BarList items={report.tasksByStatus} emptyText="No hay tareas asociadas." /></article>
        </div>

        <article className="panel report-workload">
          <div className="report-panel-head"><div><span className="eyebrow">EQUIPO</span><h2>Carga de trabajo actual</h2><p>Expedientes asignados y tareas dentro del conjunto filtrado.</p></div><UsersRound /></div>
          <div className="table-scroll"><table><thead><tr><th>Responsable</th><th>Expedientes</th><th>Tareas activas</th><th>Vencidas</th></tr></thead><tbody>
            {report.workload.map((item) => <tr key={item.id}><td><strong className="table-primary">{item.fullName}</strong></td><td>{item.cases}</td><td>{item.activeTasks}</td><td><span className={item.overdueTasks ? 'report-overdue' : ''}>{item.overdueTasks}</span></td></tr>)}
            {!report.workload.length && <tr><td className="empty-cell" colSpan="4">Los expedientes encontrados todavía no tienen responsable.</td></tr>}
          </tbody></table></div>
        </article>
      </>}
    </>}
  </section>;
}
