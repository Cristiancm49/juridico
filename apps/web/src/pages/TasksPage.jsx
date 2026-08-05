import { CalendarClock, CheckCircle2, Clock3, Edit3, Eye, Plus, RefreshCw, Search, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

function tomorrowAtFive() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toLocalDateTime(value) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyForm() {
  return { caseId: '', assigneeId: '', priorityId: '', title: '', description: '', dueAt: tomorrowAtFive(), statusCode: 'pending', comment: '' };
}

const transitions = {
  pending: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['pending', 'completed', 'cancelled'],
  completed: ['in_progress'],
  cancelled: ['pending'],
};

const dueLabels = { overdue: 'Vencida', today: 'Vence hoy', week: 'Próxima', later: 'Programada', finished: 'Finalizada' };

export function TasksPage() {
  const { can, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState({ cases: [], assignees: [], priorities: [], statuses: [] });
  const [filters, setFilters] = useState({ search: '', status: '', dueState: '', mine: 'true' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [summary, setSummary] = useState({ active: 0, overdue: 0, today: 0, week: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [history, setHistory] = useState([]);

  const loadTasks = useCallback(async (page = 1, activeFilters = appliedFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (activeFilters.search) params.set('search', activeFilters.search);
      if (activeFilters.status) params.set('status', activeFilters.status);
      if (activeFilters.dueState) params.set('dueState', activeFilters.dueState);
      if (activeFilters.mine === 'true') params.set('mine', 'true');
      const [listData, summaryData] = await Promise.all([
        apiFetch(`/api/v1/tasks?${params}`),
        apiFetch(`/api/v1/tasks/summary?scope=${activeFilters.mine === 'true' ? 'mine' : 'all'}`),
      ]);
      setTasks(listData.tasks);
      setPagination(listData.pagination);
      setSummary(summaryData.summary);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { loadTasks(1, appliedFilters); }, [appliedFilters, loadTasks]);

  useEffect(() => {
    apiFetch('/api/v1/tasks/options').then(setOptions).catch((error) => toast.error(error.message));
  }, []);

  function openCreate() {
    if (!options.cases.length || !options.assignees.length || !options.priorities.length) {
      toast.error('Faltan expedientes, responsables o prioridades disponibles.');
      return;
    }
    setEditing({ mode: 'create' });
    setHistory([]);
    setForm({
      ...emptyForm(),
      caseId: options.cases[0].id,
      assigneeId: options.assignees.find(({ id }) => id === user.id)?.id || options.assignees[0].id,
      priorityId: options.priorities.find(({ code }) => code === 'medium')?.id || options.priorities[0].id,
    });
  }

  async function openEdit(item) {
    try {
      const data = await apiFetch(`/api/v1/tasks/${item.id}`);
      setEditing({ mode: 'edit', task: data.task });
      setHistory(data.history);
      setForm({
        caseId: data.task.case.id,
        assigneeId: data.task.assignee.id,
        priorityId: data.task.priority.id,
        title: data.task.title,
        description: data.task.description || '',
        dueAt: toLocalDateTime(data.task.dueAt),
        statusCode: data.task.status.code,
        comment: '',
      });
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveTask(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, dueAt: new Date(form.dueAt).toISOString() };
      if (!payload.comment) delete payload.comment;
      if (editing.mode === 'create') {
        delete payload.statusCode;
        await apiFetch('/api/v1/tasks', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Tarea creada correctamente.');
      } else {
        await apiFetch(`/api/v1/tasks/${editing.task.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Tarea actualizada correctamente.');
      }
      setEditing(null);
      await loadTasks(pagination.page);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const currentStatus = editing?.task?.status.code;
  const selectableStatuses = currentStatus
    ? options.statuses.filter(({ code }) => [currentStatus, ...(transitions[currentStatus] || [])].includes(code))
    : options.statuses;

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">AGENDA JURÍDICA</span><h1>Tareas y vencimientos</h1><p>Organiza compromisos, responsables y fechas críticas de cada expediente.</p></div>
        {can('tasks.write') && <button className="primary-button" onClick={openCreate}><Plus size={18} /> Nueva tarea</button>}
      </div>

      <div className="task-summary-grid">
        <article><span className="task-summary-icon"><CheckCircle2 size={19} /></span><div><strong>{summary.active}</strong><small>Activas</small></div></article>
        <article className={summary.overdue ? 'danger' : ''}><span className="task-summary-icon"><Clock3 size={19} /></span><div><strong>{summary.overdue}</strong><small>Vencidas</small></div></article>
        <article><span className="task-summary-icon"><CalendarClock size={19} /></span><div><strong>{summary.today}</strong><small>Para hoy</small></div></article>
        <article><span className="task-summary-icon"><CalendarClock size={19} /></span><div><strong>{summary.week}</strong><small>Próximos 7 días</small></div></article>
      </div>

      <form className="panel task-filters" onSubmit={(event) => { event.preventDefault(); setAppliedFilters(filters); }}>
        <label className="search-field"><Search size={18} /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Tarea, expediente o asunto" /></label>
        <select aria-label="Filtrar por estado" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos los estados</option>{options.statuses.map((status) => <option value={status.code} key={status.id}>{status.name}</option>)}</select>
        <select aria-label="Filtrar por vencimiento" value={filters.dueState} onChange={(event) => setFilters({ ...filters, dueState: event.target.value })}><option value="">Cualquier fecha</option><option value="overdue">Vencidas</option><option value="today">Vencen hoy</option><option value="week">Próximos 7 días</option></select>
        <select aria-label="Filtrar por responsable" value={filters.mine} onChange={(event) => setFilters({ ...filters, mine: event.target.value })}><option value="true">Mis tareas</option><option value="false">Todas las tareas</option></select>
        <button className="primary-button">Aplicar</button>
        <button type="button" className="icon-button" onClick={() => loadTasks(pagination.page)} aria-label="Actualizar tareas" title="Actualizar"><RefreshCw size={18} /></button>
      </form>

      <article className="panel table-panel">
        <div className="table-caption"><strong>{pagination.total} tareas</strong><span>Las alertas se generan una sola vez por fecha y responsable.</span></div>
        <div className="table-scroll">
          <table className="tasks-table">
            <thead><tr><th>Tarea</th><th>Expediente</th><th>Responsable</th><th>Prioridad</th><th>Estado</th><th>Vencimiento</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td><strong className="table-primary">{task.title}</strong><span className="table-secondary task-description">{task.description || 'Sin descripción'}</span></td>
                  <td><strong className="request-number">{task.case.caseNumber}</strong><span className="request-subject">{task.case.title}</span></td>
                  <td><span className="task-assignee"><UserRound size={15} /> {task.assignee.fullName}</span></td>
                  <td><span className="priority-badge"><i style={{ backgroundColor: task.priority.color }} />{task.priority.name}</span></td>
                  <td><span className="request-status" style={{ color: task.status.color, backgroundColor: `${task.status.color}14` }}>{task.status.name}</span></td>
                  <td><div className={`due-badge ${task.dueState}`}><strong>{dueLabels[task.dueState]}</strong><time>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(task.dueAt))}</time></div></td>
                  <td className="actions-cell"><button className="icon-button" onClick={() => openEdit(task)} aria-label={`${can('tasks.write') ? 'Editar' : 'Ver'} ${task.title}`} title={can('tasks.write') ? 'Editar tarea' : 'Ver tarea'}>{can('tasks.write') ? <Edit3 size={18} /> : <Eye size={18} />}</button></td>
                </tr>
              ))}
              {!loading && !tasks.length && <tr><td colSpan="7" className="empty-cell">No hay tareas que coincidan con los filtros.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pagination"><button className="secondary-button" disabled={pagination.page <= 1 || loading} onClick={() => loadTasks(pagination.page - 1)}>Anterior</button><span>Página {pagination.page} de {totalPages}</span><button className="secondary-button" disabled={pagination.page >= totalPages || loading} onClick={() => loadTasks(pagination.page + 1)}>Siguiente</button></div>
      </article>

      {editing && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setEditing(null)}>
          <form className="modal-card task-modal" onSubmit={saveTask} aria-label={editing.mode === 'create' ? 'Crear tarea' : 'Editar tarea'}>
            <div className="modal-head"><div><span className="eyebrow">{editing.mode === 'create' ? 'NUEVO COMPROMISO' : editing.task.case.caseNumber}</span><h2>{editing.mode === 'create' ? 'Crear tarea' : 'Editar tarea'}</h2></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Cerrar"><X /></button></div>
            <fieldset className="form-grid" disabled={!can('tasks.write')}>
              <label className="full">Expediente<select value={form.caseId} onChange={(event) => setForm({ ...form, caseId: event.target.value })} required>{options.cases.map((item) => <option value={item.id} key={item.id}>{item.caseNumber} · {item.title}</option>)}</select></label>
              <label>Responsable<select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })} required>{options.assignees.map((assignee) => <option value={assignee.id} key={assignee.id}>{assignee.fullName}</option>)}</select></label>
              <label>Prioridad<select value={form.priorityId} onChange={(event) => setForm({ ...form, priorityId: event.target.value })} required>{options.priorities.map((priority) => <option value={priority.id} key={priority.id}>{priority.name}</option>)}</select></label>
              <label className="full">Título<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength="5" maxLength="180" /></label>
              <label>Fecha y hora límite<input type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} required /></label>
              {editing.mode === 'edit' && <label>Estado<select value={form.statusCode} onChange={(event) => setForm({ ...form, statusCode: event.target.value })}>{selectableStatuses.map((status) => <option value={status.code} key={status.id}>{status.name}</option>)}</select></label>}
              <label className="full">Descripción <small className="optional-label">Opcional</small><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength="3000" rows="4" /></label>
              {editing.mode === 'edit' && form.statusCode !== editing.task.status.code && <label className="full">Comentario del cambio <small className="optional-label">Opcional</small><input value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} maxLength="500" /></label>}
            </fieldset>
            {editing.mode === 'edit' && <section className="status-history task-history"><h3>Historial de estados</h3>{history.map((entry) => <div className="history-entry" key={entry.id}><i style={{ backgroundColor: entry.toStatus.color }} /><div><strong>{entry.toStatus.name}</strong><span>{entry.comment || 'Sin comentario'} · {entry.actor?.fullName || 'Usuario eliminado'}</span></div><time>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</time></div>)}</section>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>{can('tasks.write') ? 'Cancelar' : 'Cerrar'}</button>{can('tasks.write') && <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar tarea'}</button>}</div>
          </form>
        </div>
      )}
    </section>
  );
}
