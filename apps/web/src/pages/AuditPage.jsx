import { ChevronLeft, ChevronRight, FilterX, Search, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';

const actionLabels = {
  'auth.login': 'Inicio de sesión',
  'auth.logout': 'Cierre de sesión',
  'auth.password_change': 'Cambio de contraseña',
  'user.create': 'Usuario creado',
  'user.update': 'Usuario actualizado',
  'user.password_reset': 'Contraseña restablecida',
  'role.update': 'Rol actualizado',
  'person.create': 'Persona registrada',
  'person.update': 'Persona actualizada',
  'request.create': 'Solicitud registrada',
  'request.update': 'Solicitud actualizada',
  'request.status_change': 'Estado de solicitud cambiado',
  'request.convert': 'Solicitud convertida',
  'case.create': 'Expediente creado',
  'case.update': 'Expediente actualizado',
  'case.assignment_change': 'Responsable de expediente cambiado',
  'case.status_change': 'Estado de expediente cambiado',
  'legal_action.create': 'Actuación jurídica registrada',
  'legal_action.update': 'Actuación jurídica actualizada',
};

const emptyFilters = { search: '', action: '', from: '', to: '' };

function describeDetails(log) {
  const fields = log.details?.changedFields;
  if (Array.isArray(fields) && fields.length) return `Campos: ${fields.join(', ')}`;
  const roles = log.details?.roleIds;
  if (Array.isArray(roles) && roles.length) return `${roles.length} rol(es) asignado(s)`;
  return log.entityType ? `${log.entityType}${log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}` : 'Evento de seguridad';
}

export function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async (page = 1, activeFilters = appliedFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const data = await apiFetch(`/api/v1/audit?${params}`);
      setLogs(data.logs);
      setActions(data.actions);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { loadLogs(1, appliedFilters); }, [appliedFilters, loadLogs]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(pagination.total / pagination.limit)),
    [pagination],
  );

  function submitFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRAZABILIDAD</span>
          <h1>Bitácora de auditoría</h1>
          <p>Consulta accesos y cambios sensibles realizados dentro de LegalDesk.</p>
        </div>
        <div className="date-chip"><ShieldCheck size={18} /> Solo lectura</div>
      </div>

      <form className="panel audit-filters" onSubmit={submitFilters}>
        <label className="search-field audit-search">
          <Search size={18} />
          <input
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Usuario, correo, acción o identificador"
          />
        </label>
        <label>
          Acción
          <select value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })}>
            <option value="">Todas</option>
            {actions.map((action) => <option value={action} key={action}>{actionLabels[action] || action}</option>)}
          </select>
        </label>
        <label>Desde<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label>Hasta<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <div className="filter-actions">
          <button type="button" className="icon-button" onClick={clearFilters} title="Limpiar filtros" aria-label="Limpiar filtros"><FilterX size={18} /></button>
          <button className="primary-button">Aplicar</button>
        </div>
      </form>

      <article className="panel table-panel audit-panel">
        <div className="table-caption">
          <strong>{pagination.total} eventos</strong>
          <span>Los registros no pueden modificarse desde esta pantalla.</span>
        </div>
        <div className="table-scroll">
          <table className="audit-table">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>Dirección IP</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.createdAt))}</td>
                  <td>
                    <div className="audit-actor">
                      <strong>{log.actor?.fullName || 'Usuario eliminado'}</strong>
                      <span>{log.actor?.email || 'Sin cuenta activa'}</span>
                    </div>
                  </td>
                  <td><span className="audit-action"><i />{actionLabels[log.action] || log.action}</span></td>
                  <td><span className="audit-detail" title={JSON.stringify(log.details)}>{describeDetails(log)}</span></td>
                  <td><code>{log.ipAddress || '—'}</code></td>
                </tr>
              ))}
              {!loading && logs.length === 0 && <tr><td colSpan="5" className="empty-cell">No hay eventos para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="secondary-button" disabled={pagination.page <= 1 || loading} onClick={() => loadLogs(pagination.page - 1)}><ChevronLeft size={17} /> Anterior</button>
          <span>Página {pagination.page} de {totalPages}</span>
          <button className="secondary-button" disabled={pagination.page >= totalPages || loading} onClick={() => loadLogs(pagination.page + 1)}>Siguiente <ChevronRight size={17} /></button>
        </div>
      </article>
    </section>
  );
}
