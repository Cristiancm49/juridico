import { BriefcaseBusiness, Edit3, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

function emptyForm() {
  return {
    personId: '',
    legalAreaId: '',
    priorityId: '',
    title: '',
    description: '',
    externalReference: '',
    authority: '',
    openedDate: new Date().toISOString().slice(0, 10),
  };
}

export function CasesPage() {
  const { can } = useAuth();
  const [cases, setCases] = useState([]);
  const [people, setPeople] = useState([]);
  const [areas, setAreas] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [filters, setFilters] = useState({ search: '', legalAreaId: '', priorityId: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const loadCases = useCallback(async (page = 1, activeFilters = appliedFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const data = await apiFetch(`/api/v1/cases?${params}`);
      setCases(data.cases);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { loadCases(1, appliedFilters); }, [appliedFilters, loadCases]);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/v1/people?limit=100'),
      apiFetch('/api/v1/catalogs/legal-areas'),
      apiFetch('/api/v1/catalogs/priorities'),
    ])
      .then(([peopleData, areaData, priorityData]) => {
        setPeople(peopleData.people);
        setAreas(areaData.legalAreas);
        setPriorities(priorityData.priorities);
      })
      .catch((error) => toast.error(error.message));
  }, []);

  function openCreate() {
    const activePeople = people.filter(({ active }) => active);
    const activeAreas = areas.filter(({ active }) => active);
    const activePriorities = priorities.filter(({ active }) => active);
    if (!activePeople.length || !activeAreas.length || !activePriorities.length) {
      toast.error('Faltan personas o catálogos activos para crear el expediente.');
      return;
    }
    setEditing({ mode: 'create' });
    setForm({
      ...emptyForm(),
      personId: activePeople[0].id,
      legalAreaId: activeAreas[0].id,
      priorityId: activePriorities.find(({ code }) => code === 'medium')?.id || activePriorities[0].id,
    });
  }

  async function openEdit(item) {
    try {
      const data = await apiFetch(`/api/v1/cases/${item.id}`);
      const detail = data.case;
      setEditing({ mode: 'edit', case: detail });
      setForm({
        personId: detail.person.id,
        legalAreaId: detail.legalArea.id,
        priorityId: detail.priority.id,
        title: detail.title,
        description: detail.description,
        externalReference: detail.externalReference || '',
        authority: detail.authority || '',
        openedDate: detail.openedDate,
      });
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveCase(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing.mode === 'create') {
        await apiFetch('/api/v1/cases', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Expediente creado correctamente.');
      } else {
        await apiFetch(`/api/v1/cases/${editing.case.id}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast.success('Expediente actualizado correctamente.');
      }
      setEditing(null);
      await loadCases(pagination.page);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  const activeOnly = editing?.mode === 'create';
  const selectablePeople = activeOnly ? people.filter(({ active }) => active) : people;
  const selectableAreas = activeOnly ? areas.filter(({ active }) => active) : areas;
  const selectablePriorities = activeOnly ? priorities.filter(({ active }) => active) : priorities;
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">GESTIÓN JURÍDICA</span><h1>Expedientes</h1><p>Consulta los asuntos admitidos y conserva sus datos principales en una sola ficha.</p></div>
        {can('cases.write') && <button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo expediente</button>}
      </div>

      <form className="panel case-filters" onSubmit={(event) => { event.preventDefault(); setAppliedFilters(filters); }}>
        <label className="search-field"><Search size={18} /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Número, radicado, asunto, cliente o documento" /></label>
        <select aria-label="Filtrar por área" value={filters.legalAreaId} onChange={(event) => setFilters({ ...filters, legalAreaId: event.target.value })}><option value="">Todas las áreas</option>{areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select>
        <select aria-label="Filtrar por prioridad" value={filters.priorityId} onChange={(event) => setFilters({ ...filters, priorityId: event.target.value })}><option value="">Todas las prioridades</option>{priorities.map((priority) => <option value={priority.id} key={priority.id}>{priority.name}</option>)}</select>
        <button className="primary-button">Aplicar</button>
        <button type="button" className="icon-button" onClick={() => loadCases(pagination.page)} aria-label="Actualizar expedientes" title="Actualizar"><RefreshCw size={18} /></button>
      </form>

      <article className="panel table-panel">
        <div className="table-caption"><strong>{pagination.total} expedientes</strong><span>Los expedientes convertidos conservan el vínculo con su solicitud.</span></div>
        <div className="table-scroll">
          <table className="cases-table">
            <thead><tr><th>Expediente</th><th>Cliente</th><th>Clasificación</th><th>Prioridad</th><th>Origen</th><th>Estado</th><th>Apertura</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td><strong className="request-number">{item.caseNumber}</strong><span className="request-subject">{item.title}</span>{item.externalReference && <small className="case-reference">Radicado: {item.externalReference}</small>}</td>
                  <td><strong className="table-primary">{item.person.fullName}</strong><span className="table-secondary">{item.person.documentType} {item.person.documentNumber}</span></td>
                  <td><span className="tag">{item.legalArea.name}</span></td>
                  <td><span className="priority-badge"><i style={{ backgroundColor: item.priority.color }} />{item.priority.name}</span></td>
                  <td>{item.originRequest ? <span className="origin-badge">{item.originRequest.requestNumber}</span> : <span className="table-secondary">Creación manual</span>}</td>
                  <td><span className="request-status" style={{ color: item.status.color, backgroundColor: `${item.status.color}14` }}>{item.status.name}</span></td>
                  <td>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${item.openedDate}T00:00:00Z`))}</td>
                  <td className="actions-cell">{can('cases.write') && <button className="icon-button" onClick={() => openEdit(item)} aria-label={`Editar ${item.caseNumber}`} title="Editar expediente"><Edit3 size={18} /></button>}</td>
                </tr>
              ))}
              {!loading && cases.length === 0 && <tr><td colSpan="8" className="empty-cell">No hay expedientes que coincidan con los filtros.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pagination"><button className="secondary-button" disabled={pagination.page <= 1 || loading} onClick={() => loadCases(pagination.page - 1)}>Anterior</button><span>Página {pagination.page} de {totalPages}</span><button className="secondary-button" disabled={pagination.page >= totalPages || loading} onClick={() => loadCases(pagination.page + 1)}>Siguiente</button></div>
      </article>

      {editing && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setEditing(null)}>
          <form className="modal-card case-modal" onSubmit={saveCase} aria-label={editing.mode === 'create' ? 'Crear expediente' : 'Editar expediente'}>
            <div className="modal-head"><div><span className="eyebrow">{editing.mode === 'create' ? 'NUEVO ASUNTO' : editing.case.caseNumber}</span><h2>{editing.mode === 'create' ? 'Crear expediente' : 'Editar expediente'}</h2></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Cerrar"><X /></button></div>
            {editing.mode === 'edit' && editing.case.originRequest && <div className="case-origin-note"><BriefcaseBusiness size={19} /><div><strong>Originado en {editing.case.originRequest.requestNumber}</strong><span>La solicitud y el expediente permanecen relacionados.</span></div></div>}
            <div className="form-grid">
              <label className="full">Persona o cliente<select value={form.personId} onChange={(event) => setForm({ ...form, personId: event.target.value })} required>{selectablePeople.map((person) => <option value={person.id} key={person.id} disabled={!person.active}>{person.fullName} · {person.documentType} {person.documentNumber}{person.active ? '' : ' · Inactiva'}</option>)}</select></label>
              <label>Área jurídica<select value={form.legalAreaId} onChange={(event) => setForm({ ...form, legalAreaId: event.target.value })} required>{selectableAreas.map((area) => <option value={area.id} key={area.id} disabled={!area.active}>{area.name}{area.active ? '' : ' · Inactiva'}</option>)}</select></label>
              <label>Prioridad<select value={form.priorityId} onChange={(event) => setForm({ ...form, priorityId: event.target.value })} required>{selectablePriorities.map((priority) => <option value={priority.id} key={priority.id} disabled={!priority.active}>{priority.name}{priority.active ? '' : ' · Inactiva'}</option>)}</select></label>
              <label className="full">Asunto del expediente<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength="5" maxLength="180" /></label>
              <label>Radicado o referencia externa <small className="optional-label">Opcional</small><input value={form.externalReference} onChange={(event) => setForm({ ...form, externalReference: event.target.value })} maxLength="100" /></label>
              <label>Despacho o entidad <small className="optional-label">Opcional</small><input value={form.authority} onChange={(event) => setForm({ ...form, authority: event.target.value })} maxLength="180" /></label>
              <label>Fecha de apertura<input type="date" value={form.openedDate} onChange={(event) => setForm({ ...form, openedDate: event.target.value })} required /></label>
              <label className="full">Descripción del asunto<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required minLength="10" maxLength="5000" rows="5" /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar expediente'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
