import { BriefcaseBusiness, Edit3, FilePlus2, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatDateOnly, toDateInputValue } from '../date-utils.js';
import { navigate } from '../router.js';

const sourceLabels = {
  in_person: 'Presencial',
  phone: 'Teléfono',
  email: 'Correo electrónico',
  referral: 'Referido',
  other: 'Otro',
};

const transitions = {
  received: ['in_review', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved: ['in_review'],
  rejected: [],
  converted: [],
};

function emptyForm() {
  return {
    personId: '',
    legalAreaId: '',
    priorityId: '',
    subject: '',
    description: '',
    source: 'in_person',
    receivedDate: new Date().toISOString().slice(0, 10),
    statusCode: 'received',
    changeComment: '',
  };
}

export function RequestsPage() {
  const { can } = useAuth();
  const [requests, setRequests] = useState([]);
  const [people, setPeople] = useState([]);
  const [areas, setAreas] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', legalAreaId: '', priorityId: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(emptyForm());

  const loadRequests = useCallback(async (page = 1, activeFilters = appliedFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const data = await apiFetch(`/api/v1/requests?${params}`);
      setRequests(data.requests);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { loadRequests(1, appliedFilters); }, [appliedFilters, loadRequests]);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/v1/people?limit=100'),
      apiFetch('/api/v1/catalogs/legal-areas'),
      apiFetch('/api/v1/catalogs/priorities'),
      apiFetch('/api/v1/catalogs/request-statuses'),
    ])
      .then(([peopleData, areaData, priorityData, statusData]) => {
        setPeople(peopleData.people);
        setAreas(areaData.legalAreas.filter(({ active }) => active));
        setPriorities(priorityData.priorities.filter(({ active }) => active));
        setStatuses(statusData.requestStatuses);
      })
      .catch((error) => toast.error(error.message));
  }, []);

  function openCreate() {
    const activePeople = people.filter(({ active }) => active);
    if (!activePeople.length) {
      toast.error('Primero registra una persona o cliente activo.');
      return;
    }
    setEditing({ mode: 'create' });
    setHistory([]);
    setForm({
      ...emptyForm(),
      personId: activePeople[0]?.id || '',
      legalAreaId: areas[0]?.id || '',
      priorityId: priorities.find(({ code }) => code === 'medium')?.id || priorities[0]?.id || '',
    });
  }

  async function openEdit(item) {
    try {
      const data = await apiFetch(`/api/v1/requests/${item.id}`);
      const detail = data.request;
      setEditing({ mode: 'edit', request: detail });
      setHistory(data.statusHistory);
      setForm({
        personId: detail.person.id,
        legalAreaId: detail.legalArea.id,
        priorityId: detail.priority.id,
        subject: detail.subject,
        description: detail.description,
        source: detail.source,
        receivedDate: toDateInputValue(detail.receivedDate),
        statusCode: detail.status.code,
        changeComment: '',
      });
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveRequest(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing.mode === 'create') {
        const { statusCode, changeComment, ...payload } = form;
        await apiFetch('/api/v1/requests', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Solicitud registrada correctamente.');
      } else {
        await apiFetch(`/api/v1/requests/${editing.request.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        toast.success('Solicitud actualizada correctamente.');
      }
      setEditing(null);
      await loadRequests(pagination.page);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  async function convertToCase(item) {
    if (!window.confirm(`¿Convertir ${item.requestNumber} en un expediente?`)) return;
    setConvertingId(item.id);
    try {
      const data = await apiFetch(`/api/v1/cases/from-request/${item.id}`, {
        method: 'POST',
        body: JSON.stringify({ openedDate: new Date().toISOString().slice(0, 10) }),
      });
      toast.success(`Expediente ${data.case.caseNumber} creado correctamente.`);
      navigate('/expedientes');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setConvertingId(null);
    }
  }

  const currentStatus = editing?.request?.status.code;
  const allowedStatusCodes = currentStatus
    ? [currentStatus, ...(transitions[currentStatus] || [])]
    : ['received'];
  const selectablePeople = editing?.mode === 'create' ? people.filter(({ active }) => active) : people;
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">ADMISIONES</span><h1>Solicitudes de asesoría</h1><p>Registra, clasifica y sigue cada solicitud antes de convertirla en expediente.</p></div>
        {can('requests.write') && <button className="primary-button" onClick={openCreate}><FilePlus2 size={18} /> Nueva solicitud</button>}
      </div>

      <form className="panel request-filters" onSubmit={applyFilters}>
        <label className="search-field"><Search size={18} /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Número, asunto, cliente o documento" /></label>
        <select aria-label="Filtrar por estado" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos los estados</option>{statuses.map((status) => <option value={status.code} key={status.id}>{status.name}</option>)}</select>
        <select aria-label="Filtrar por área" value={filters.legalAreaId} onChange={(event) => setFilters({ ...filters, legalAreaId: event.target.value })}><option value="">Todas las áreas</option>{areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select>
        <select aria-label="Filtrar por prioridad" value={filters.priorityId} onChange={(event) => setFilters({ ...filters, priorityId: event.target.value })}><option value="">Todas las prioridades</option>{priorities.map((priority) => <option value={priority.id} key={priority.id}>{priority.name}</option>)}</select>
        <button className="primary-button">Aplicar</button>
        <button type="button" className="icon-button" onClick={() => loadRequests(pagination.page)} aria-label="Actualizar solicitudes" title="Actualizar"><RefreshCw size={18} /></button>
      </form>

      <article className="panel table-panel">
        <div className="table-caption"><strong>{pagination.total} solicitudes</strong><span>Ordenadas por fecha de recepción.</span></div>
        <div className="table-scroll">
          <table className="requests-table">
            <thead><tr><th>Solicitud</th><th>Cliente</th><th>Clasificación</th><th>Prioridad</th><th>Estado</th><th>Recepción</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id}>
                  <td><strong className="request-number">{item.requestNumber}</strong><span className="request-subject">{item.subject}</span></td>
                  <td><strong className="table-primary">{item.person.fullName}</strong><span className="table-secondary">{item.person.documentType} {item.person.documentNumber}</span></td>
                  <td><span className="tag">{item.legalArea.name}</span></td>
                  <td><span className="priority-badge"><i style={{ backgroundColor: item.priority.color }} />{item.priority.name}</span></td>
                  <td><span className="request-status" style={{ color: item.status.color, backgroundColor: `${item.status.color}14` }}>{item.status.name}</span></td>
                  <td>{formatDateOnly(item.receivedDate)}</td>
                  <td className="actions-cell"><div className="row-actions">{item.status.code === 'approved' && can('cases.write') && <button className="icon-button convert-button" disabled={convertingId === item.id} onClick={() => convertToCase(item)} aria-label={`Convertir ${item.requestNumber} en expediente`} title="Convertir en expediente"><BriefcaseBusiness size={18} /></button>}{can('requests.write') && <button className="icon-button" onClick={() => openEdit(item)} aria-label={`Editar ${item.requestNumber}`} title="Editar y ver historial"><Edit3 size={18} /></button>}</div></td>
                </tr>
              ))}
              {!loading && requests.length === 0 && <tr><td colSpan="7" className="empty-cell">No hay solicitudes que coincidan con los filtros.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pagination"><button className="secondary-button" disabled={pagination.page <= 1 || loading} onClick={() => loadRequests(pagination.page - 1)}>Anterior</button><span>Página {pagination.page} de {totalPages}</span><button className="secondary-button" disabled={pagination.page >= totalPages || loading} onClick={() => loadRequests(pagination.page + 1)}>Siguiente</button></div>
      </article>

      {editing && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setEditing(null)}>
          <form className="modal-card request-modal" onSubmit={saveRequest} aria-label={editing.mode === 'create' ? 'Registrar solicitud' : 'Editar solicitud'}>
            <div className="modal-head"><div><span className="eyebrow">{editing.mode === 'create' ? 'NUEVA ADMISIÓN' : editing.request.requestNumber}</span><h2>{editing.mode === 'create' ? 'Registrar solicitud' : 'Editar solicitud'}</h2></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Cerrar"><X /></button></div>
            <div className="form-grid">
              <label className="full">Persona o cliente<select value={form.personId} onChange={(event) => setForm({ ...form, personId: event.target.value })} required>{selectablePeople.map((person) => <option value={person.id} key={person.id} disabled={!person.active}>{person.fullName} · {person.documentType} {person.documentNumber}{person.active ? '' : ' · Inactiva'}</option>)}</select></label>
              <label>Área jurídica<select value={form.legalAreaId} onChange={(event) => setForm({ ...form, legalAreaId: event.target.value })} required>{areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select></label>
              <label>Prioridad<select value={form.priorityId} onChange={(event) => setForm({ ...form, priorityId: event.target.value })} required>{priorities.map((priority) => <option value={priority.id} key={priority.id}>{priority.name}</option>)}</select></label>
              <label className="full">Asunto<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required minLength="5" maxLength="180" /></label>
              <label>Canal de ingreso<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>{Object.entries(sourceLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label>Fecha de recepción<input type="date" value={form.receivedDate} onChange={(event) => setForm({ ...form, receivedDate: event.target.value })} required /></label>
              <label className="full">Descripción de la consulta<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required minLength="10" maxLength="5000" rows="5" /></label>
              {editing.mode === 'edit' && <><label>Estado<select value={form.statusCode} onChange={(event) => setForm({ ...form, statusCode: event.target.value, changeComment: '' })}>{statuses.filter(({ code }) => allowedStatusCodes.includes(code)).map((status) => <option value={status.code} key={status.id}>{status.name}</option>)}</select></label><label>Comentario del cambio <small className="optional-label">Opcional</small><input value={form.changeComment} onChange={(event) => setForm({ ...form, changeComment: event.target.value })} maxLength="500" disabled={form.statusCode === currentStatus} placeholder={form.statusCode === currentStatus ? 'Selecciona un estado diferente' : 'Motivo o decisión'} /></label></>}
            </div>

            {editing.mode === 'edit' && <div className="status-history"><h3>Historial de estados</h3>{history.map((entry) => <div className="history-entry" key={entry.id}><i style={{ backgroundColor: entry.toStatus.color }} /><div><strong>{entry.toStatus.name}</strong><span>{entry.comment || 'Sin comentario'} · {entry.actor?.fullName || 'Usuario eliminado'}</span></div><time>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</time></div>)}</div>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar solicitud'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
