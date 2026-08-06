import { Activity, BriefcaseBusiness, Download, Edit3, Eye, FileText, History, Plus, RefreshCw, Search, ShieldCheck, UploadCloud, UserRoundCheck, Workflow, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiDownload, apiFetch } from '../api.js';
import { formatDateOnly, toDateInputValue } from '../date-utils.js';
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

function localDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyActionForm(actionTypeId = '') {
  return {
    actionTypeId,
    title: '',
    description: '',
    result: '',
    occurredAt: localDateTime(),
  };
}

function emptyDocumentForm(categoryId = '', replacesDocumentId = '') {
  return { categoryId, description: '', replacesDocumentId, file: null };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusTransitions = {
  open: ['in_progress', 'closed'],
  in_progress: ['on_hold', 'closed'],
  on_hold: ['in_progress', 'closed'],
  closed: ['in_progress', 'archived'],
  archived: [],
};

export function CasesPage() {
  const { can } = useAuth();
  const [cases, setCases] = useState([]);
  const [people, setPeople] = useState([]);
  const [areas, setAreas] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [documentCategories, setDocumentCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', legalAreaId: '', priorityId: '', status: '', assignee: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({ userId: '', comment: '' });
  const [statusForm, setStatusForm] = useState({ statusCode: '', comment: '' });
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [actions, setActions] = useState([]);
  const [actionEditing, setActionEditing] = useState(null);
  const [actionForm, setActionForm] = useState(emptyActionForm());
  const [actionSaving, setActionSaving] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentMaxBytes, setDocumentMaxBytes] = useState(20 * 1024 * 1024);
  const [documentEditing, setDocumentEditing] = useState(null);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm());
  const [documentSaving, setDocumentSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadCases = useCallback(async (page = 1, activeFilters = appliedFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (activeFilters.search) params.set('search', activeFilters.search);
      if (activeFilters.legalAreaId) params.set('legalAreaId', activeFilters.legalAreaId);
      if (activeFilters.priorityId) params.set('priorityId', activeFilters.priorityId);
      if (activeFilters.status) params.set('status', activeFilters.status);
      if (activeFilters.assignee === 'unassigned') params.set('unassigned', 'true');
      else if (activeFilters.assignee) params.set('assigneeId', activeFilters.assignee);
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
      apiFetch('/api/v1/catalogs/case-statuses'),
      apiFetch('/api/v1/cases/assignees'),
      apiFetch('/api/v1/catalogs/action-types'),
      can('documents.read') ? apiFetch('/api/v1/catalogs/document-categories') : Promise.resolve({ documentCategories: [] }),
    ])
      .then(([peopleData, areaData, priorityData, statusData, assigneeData, actionTypeData, documentCategoryData]) => {
        setPeople(peopleData.people);
        setAreas(areaData.legalAreas);
        setPriorities(priorityData.priorities);
        setStatuses(statusData.caseStatuses);
        setAssignees(assigneeData.assignees);
        setActionTypes(actionTypeData.actionTypes.filter(({ active }) => active));
        setDocumentCategories(documentCategoryData.documentCategories.filter(({ active }) => active));
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
    setActions([]);
    setActionEditing(null);
    setDocuments([]);
    setDocumentEditing(null);
    setForm({
      ...emptyForm(),
      personId: activePeople[0].id,
      legalAreaId: activeAreas[0].id,
      priorityId: activePriorities.find(({ code }) => code === 'medium')?.id || activePriorities[0].id,
    });
  }

  async function openEdit(item) {
    try {
      const [data, actionData, documentData] = await Promise.all([
        apiFetch(`/api/v1/cases/${item.id}`),
        apiFetch(`/api/v1/cases/${item.id}/actions?limit=50`),
        can('documents.read')
          ? apiFetch(`/api/v1/cases/${item.id}/documents`)
          : Promise.resolve({ documents: [], maxBytes: 20 * 1024 * 1024 }),
      ]);
      const detail = data.case;
      setEditing({ mode: 'edit', case: detail });
      setAssignmentHistory(data.assignmentHistory);
      setStatusHistory(data.statusHistory);
      setActions(actionData.actions);
      setActionEditing(null);
      setDocuments(documentData.documents);
      setDocumentMaxBytes(documentData.maxBytes);
      setDocumentEditing(null);
      setAssignmentForm({ userId: detail.assignee?.id || assignees[0]?.id || '', comment: '' });
      setStatusForm({ statusCode: detail.status.code, comment: '' });
      setForm({
        personId: detail.person.id,
        legalAreaId: detail.legalArea.id,
        priorityId: detail.priority.id,
        title: detail.title,
        description: detail.description,
        externalReference: detail.externalReference || '',
        authority: detail.authority || '',
        openedDate: toDateInputValue(detail.openedDate),
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

  async function refreshTracking(caseId) {
    const data = await apiFetch(`/api/v1/cases/${caseId}`);
    setEditing((value) => ({ ...value, case: data.case }));
    setAssignmentHistory(data.assignmentHistory);
    setStatusHistory(data.statusHistory);
    setAssignmentForm({ userId: data.case.assignee?.id || assignees[0]?.id || '', comment: '' });
    setStatusForm({ statusCode: data.case.status.code, comment: '' });
    await loadCases(pagination.page);
  }

  async function loadActions(caseId) {
    const data = await apiFetch(`/api/v1/cases/${caseId}/actions?limit=50`);
    setActions(data.actions);
  }

  function startNewAction() {
    const firstType = actionTypes[0];
    if (!firstType) {
      toast.error('No hay tipos de actuación activos.');
      return;
    }
    setActionEditing({ mode: 'create' });
    setActionForm(emptyActionForm(firstType.id));
  }

  function startEditAction(action) {
    setActionEditing({ mode: 'edit', id: action.id });
    setActionForm({
      actionTypeId: action.actionType.id,
      title: action.title,
      description: action.description,
      result: action.result || '',
      occurredAt: localDateTime(action.occurredAt),
    });
  }

  async function saveAction() {
    if (!actionForm.actionTypeId || !actionForm.title.trim() || !actionForm.description.trim() || !actionForm.occurredAt) {
      toast.error('Completa el tipo, la fecha, el título y la descripción.');
      return;
    }
    setActionSaving(true);
    try {
      const payload = { ...actionForm, occurredAt: new Date(actionForm.occurredAt).toISOString() };
      const isCreate = actionEditing.mode === 'create';
      const url = isCreate
        ? `/api/v1/cases/${editing.case.id}/actions`
        : `/api/v1/cases/${editing.case.id}/actions/${actionEditing.id}`;
      await apiFetch(url, { method: isCreate ? 'POST' : 'PATCH', body: JSON.stringify(payload) });
      toast.success(isCreate ? 'Actuación registrada correctamente.' : 'Actuación actualizada correctamente.');
      setActionEditing(null);
      await loadActions(editing.case.id);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionSaving(false);
    }
  }

  async function loadDocuments(caseId) {
    const data = await apiFetch(`/api/v1/cases/${caseId}/documents`);
    setDocuments(data.documents);
    setDocumentMaxBytes(data.maxBytes);
  }

  function startNewDocument() {
    const firstCategory = documentCategories[0];
    if (!firstCategory) {
      toast.error('No hay categorías documentales activas.');
      return;
    }
    setDocumentEditing({ mode: 'create', key: Date.now() });
    setDocumentForm(emptyDocumentForm(firstCategory.id));
  }

  function startDocumentVersion(document) {
    setDocumentEditing({ mode: 'version', document, key: Date.now() });
    setDocumentForm({
      ...emptyDocumentForm(document.category.id, document.id),
      description: document.description || '',
    });
  }

  async function saveDocument() {
    if (!documentForm.categoryId || !documentForm.file) {
      toast.error('Selecciona la categoría y el archivo.');
      return;
    }
    if (documentForm.file.size > documentMaxBytes) {
      toast.error(`El archivo supera el máximo de ${formatBytes(documentMaxBytes)}.`);
      return;
    }
    setDocumentSaving(true);
    try {
      const payload = new FormData();
      payload.append('categoryId', documentForm.categoryId);
      if (documentForm.description.trim()) payload.append('description', documentForm.description.trim());
      if (documentForm.replacesDocumentId) payload.append('replacesDocumentId', documentForm.replacesDocumentId);
      payload.append('file', documentForm.file);
      await apiFetch(`/api/v1/cases/${editing.case.id}/documents`, { method: 'POST', body: payload });
      toast.success(documentEditing.mode === 'version' ? 'Nueva versión cargada correctamente.' : 'Documento cargado correctamente.');
      setDocumentEditing(null);
      await loadDocuments(editing.case.id);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDocumentSaving(false);
    }
  }

  async function downloadDocument(document) {
    setDownloadingId(document.id);
    try {
      const { blob, filename } = await apiDownload(`/api/v1/cases/${editing.case.id}/documents/${document.id}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Descarga preparada correctamente.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDownloadingId(null);
    }
  }

  async function assignCase() {
    if (!assignmentForm.userId) {
      toast.error('Selecciona un responsable.');
      return;
    }
    setTrackingSaving(true);
    try {
      await apiFetch(`/api/v1/cases/${editing.case.id}/assign`, {
        method: 'POST',
        body: JSON.stringify(assignmentForm),
      });
      toast.success(editing.case.assignee ? 'Responsable reasignado correctamente.' : 'Responsable asignado correctamente.');
      await refreshTracking(editing.case.id);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTrackingSaving(false);
    }
  }

  async function changeStatus() {
    if (statusForm.statusCode === editing.case.status.code) {
      toast.error('Selecciona un estado diferente.');
      return;
    }
    setTrackingSaving(true);
    try {
      await apiFetch(`/api/v1/cases/${editing.case.id}/status`, {
        method: 'POST',
        body: JSON.stringify(statusForm),
      });
      toast.success('Estado actualizado correctamente.');
      await refreshTracking(editing.case.id);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTrackingSaving(false);
    }
  }

  const activeOnly = editing?.mode === 'create';
  const selectablePeople = activeOnly ? people.filter(({ active }) => active) : people;
  const selectableAreas = activeOnly ? areas.filter(({ active }) => active) : areas;
  const selectablePriorities = activeOnly ? priorities.filter(({ active }) => active) : priorities;
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const currentStatus = editing?.case?.status.code;
  const availableStatuses = currentStatus
    ? statuses.filter(({ code }) => [currentStatus, ...(statusTransitions[currentStatus] || [])].includes(code))
    : statuses;

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
        <select aria-label="Filtrar por estado" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos los estados</option>{statuses.map((status) => <option value={status.code} key={status.id}>{status.name}</option>)}</select>
        <select aria-label="Filtrar por responsable" value={filters.assignee} onChange={(event) => setFilters({ ...filters, assignee: event.target.value })}><option value="">Todos los responsables</option><option value="unassigned">Sin responsable</option>{assignees.map((assignee) => <option value={assignee.id} key={assignee.id}>{assignee.fullName}</option>)}</select>
        <button className="primary-button">Aplicar</button>
        <button type="button" className="icon-button" onClick={() => loadCases(pagination.page)} aria-label="Actualizar expedientes" title="Actualizar"><RefreshCw size={18} /></button>
      </form>

      <article className="panel table-panel">
        <div className="table-caption"><strong>{pagination.total} expedientes</strong><span>Los expedientes convertidos conservan el vínculo con su solicitud.</span></div>
        <div className="table-scroll">
          <table className="cases-table">
            <thead><tr><th>Expediente</th><th>Cliente</th><th>Responsable</th><th>Clasificación</th><th>Prioridad</th><th>Origen</th><th>Estado</th><th>Apertura</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td><strong className="request-number">{item.caseNumber}</strong><span className="request-subject">{item.title}</span>{item.externalReference && <small className="case-reference">Radicado: {item.externalReference}</small>}</td>
                  <td><strong className="table-primary">{item.person.fullName}</strong><span className="table-secondary">{item.person.documentType} {item.person.documentNumber}</span></td>
                  <td>{item.assignee ? <div className="assignee-cell"><span>{item.assignee.fullName.split(' ').slice(0, 2).map((part) => part[0]).join('')}</span><strong>{item.assignee.fullName}</strong></div> : <span className="unassigned-label">Sin asignar</span>}</td>
                  <td><span className="tag">{item.legalArea.name}</span></td>
                  <td><span className="priority-badge"><i style={{ backgroundColor: item.priority.color }} />{item.priority.name}</span></td>
                  <td>{item.originRequest ? <span className="origin-badge">{item.originRequest.requestNumber}</span> : <span className="table-secondary">Creación manual</span>}</td>
                  <td><span className="request-status" style={{ color: item.status.color, backgroundColor: `${item.status.color}14` }}>{item.status.name}</span></td>
                  <td>{formatDateOnly(item.openedDate)}</td>
                  <td className="actions-cell"><button className="icon-button" onClick={() => openEdit(item)} aria-label={`${can('cases.write') ? 'Editar' : 'Ver'} ${item.caseNumber}`} title={can('cases.write') ? 'Editar expediente' : 'Ver expediente'}>{can('cases.write') ? <Edit3 size={18} /> : <Eye size={18} />}</button></td>
                </tr>
              ))}
              {!loading && cases.length === 0 && <tr><td colSpan="9" className="empty-cell">No hay expedientes que coincidan con los filtros.</td></tr>}
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
            {editing.mode === 'edit' && (
              <div className="case-tracking-grid">
                <section className="tracking-card">
                  <div className="tracking-head"><UserRoundCheck size={19} /><div><strong>Responsable actual</strong><span>{editing.case.assignee?.fullName || 'Sin responsable asignado'}</span></div></div>
                  {can('cases.assign') && <div className="tracking-controls"><select aria-label="Nuevo responsable" value={assignmentForm.userId} onChange={(event) => setAssignmentForm({ ...assignmentForm, userId: event.target.value })}><option value="">Seleccionar responsable</option>{assignees.map((assignee) => <option value={assignee.id} key={assignee.id}>{assignee.fullName}</option>)}</select><input value={assignmentForm.comment} onChange={(event) => setAssignmentForm({ ...assignmentForm, comment: event.target.value })} placeholder="Motivo de asignación (opcional)" maxLength="500" /><button type="button" className="secondary-button" onClick={assignCase} disabled={trackingSaving}>Asignar</button></div>}
                </section>
                <section className="tracking-card">
                  <div className="tracking-head"><Workflow size={19} /><div><strong>Estado del expediente</strong><span>{editing.case.status.name}</span></div></div>
                  {can('cases.write') && <div className="tracking-controls"><select aria-label="Nuevo estado" value={statusForm.statusCode} onChange={(event) => setStatusForm({ ...statusForm, statusCode: event.target.value })}>{availableStatuses.map((status) => <option value={status.code} key={status.id}>{status.name}</option>)}</select><input value={statusForm.comment} onChange={(event) => setStatusForm({ ...statusForm, comment: event.target.value })} placeholder="Comentario del cambio (opcional)" maxLength="500" /><button type="button" className="secondary-button" onClick={changeStatus} disabled={trackingSaving || editing.case.status.terminal}>Cambiar estado</button></div>}
                </section>
              </div>
            )}
            <fieldset className="form-grid" disabled={!can('cases.write')}>
              <label className="full">Persona o cliente<select value={form.personId} onChange={(event) => setForm({ ...form, personId: event.target.value })} required>{selectablePeople.map((person) => <option value={person.id} key={person.id} disabled={!person.active}>{person.fullName} · {person.documentType} {person.documentNumber}{person.active ? '' : ' · Inactiva'}</option>)}</select></label>
              <label>Área jurídica<select value={form.legalAreaId} onChange={(event) => setForm({ ...form, legalAreaId: event.target.value })} required>{selectableAreas.map((area) => <option value={area.id} key={area.id} disabled={!area.active}>{area.name}{area.active ? '' : ' · Inactiva'}</option>)}</select></label>
              <label>Prioridad<select value={form.priorityId} onChange={(event) => setForm({ ...form, priorityId: event.target.value })} required>{selectablePriorities.map((priority) => <option value={priority.id} key={priority.id} disabled={!priority.active}>{priority.name}{priority.active ? '' : ' · Inactiva'}</option>)}</select></label>
              <label className="full">Asunto del expediente<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength="5" maxLength="180" /></label>
              <label>Radicado o referencia externa <small className="optional-label">Opcional</small><input value={form.externalReference} onChange={(event) => setForm({ ...form, externalReference: event.target.value })} maxLength="100" /></label>
              <label>Despacho o entidad <small className="optional-label">Opcional</small><input value={form.authority} onChange={(event) => setForm({ ...form, authority: event.target.value })} maxLength="180" /></label>
              <label>Fecha de apertura<input type="date" value={form.openedDate} onChange={(event) => setForm({ ...form, openedDate: event.target.value })} required /></label>
              <label className="full">Descripción del asunto<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required minLength="10" maxLength="5000" rows="5" /></label>
            </fieldset>
            {editing.mode === 'edit' && (
              <section className="actions-section">
                <div className="actions-head">
                  <div><span className="eyebrow">TRAZABILIDAD DEL ASUNTO</span><h3><Activity size={18} /> Actuaciones y avances</h3><p>Registro cronológico del trabajo realizado en este expediente.</p></div>
                  {can('actions.write') && editing.case.status.code !== 'archived' && !actionEditing && <button type="button" className="secondary-button" onClick={startNewAction}><Plus size={16} /> Nueva actuación</button>}
                </div>
                {actionEditing && (
                  <div className="action-editor">
                    <div className="action-editor-title"><strong>{actionEditing.mode === 'create' ? 'Registrar actuación' : 'Editar actuación'}</strong><span>Los cambios quedarán registrados en auditoría.</span></div>
                    <div className="action-form-grid">
                      <label>Tipo<select value={actionForm.actionTypeId} onChange={(event) => setActionForm({ ...actionForm, actionTypeId: event.target.value })}>{actionTypes.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
                      <label>Fecha y hora<input type="datetime-local" value={actionForm.occurredAt} onChange={(event) => setActionForm({ ...actionForm, occurredAt: event.target.value })} /></label>
                      <label className="full">Título<input value={actionForm.title} onChange={(event) => setActionForm({ ...actionForm, title: event.target.value })} minLength="5" maxLength="180" /></label>
                      <label className="full">Descripción<textarea value={actionForm.description} onChange={(event) => setActionForm({ ...actionForm, description: event.target.value })} minLength="10" maxLength="5000" rows="3" /></label>
                      <label className="full">Resultado <small className="optional-label">Opcional</small><textarea value={actionForm.result} onChange={(event) => setActionForm({ ...actionForm, result: event.target.value })} maxLength="2000" rows="2" /></label>
                    </div>
                    <div className="action-editor-buttons"><button type="button" className="secondary-button" onClick={() => setActionEditing(null)} disabled={actionSaving}>Cancelar</button><button type="button" className="primary-button" onClick={saveAction} disabled={actionSaving}>{actionSaving ? 'Guardando…' : 'Guardar actuación'}</button></div>
                  </div>
                )}
                <div className="action-timeline">
                  {actions.map((action) => (
                    <article className="action-entry" key={action.id}>
                      <div className="action-marker" style={{ backgroundColor: action.actionType.color }}><Activity size={14} /></div>
                      <div className="action-body">
                        <div className="action-title-row"><div><span className="action-type" style={{ color: action.actionType.color }}>{action.actionType.name}</span><h4>{action.title}</h4></div>{can('actions.write') && editing.case.status.code !== 'archived' && !actionEditing && <button type="button" className="icon-button" onClick={() => startEditAction(action)} aria-label={`Editar actuación ${action.title}`} title="Editar actuación"><Edit3 size={16} /></button>}</div>
                        <p>{action.description}</p>
                        {action.result && <div className="action-result"><strong>Resultado</strong><span>{action.result}</span></div>}
                        <div className="action-meta"><span>{action.author?.fullName || 'Usuario eliminado'}</span><time>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(action.occurredAt))}</time></div>
                      </div>
                    </article>
                  ))}
                  {!actions.length && <p className="tracking-empty action-empty">Aún no se han registrado actuaciones en este expediente.</p>}
                </div>
              </section>
            )}
            {editing.mode === 'edit' && can('documents.read') && (
              <section className="documents-section">
                <div className="documents-head">
                  <div className="documents-heading-copy"><span className="document-shield"><ShieldCheck size={19} /></span><div><span className="eyebrow">ARCHIVO PRIVADO</span><h3>Documentos del expediente</h3><p>Acceso autorizado, verificación de integridad y versiones sin eliminar antecedentes.</p></div></div>
                  {can('documents.write') && editing.case.status.code !== 'archived' && !documentEditing && <button type="button" className="secondary-button" onClick={startNewDocument}><UploadCloud size={16} /> Cargar documento</button>}
                </div>
                {documentEditing && (
                  <div className="document-editor">
                    <div className="action-editor-title"><strong>{documentEditing.mode === 'version' ? `Nueva versión de ${documentEditing.document.originalName}` : 'Cargar documento privado'}</strong><span>Formatos permitidos: PDF, DOCX, XLSX, JPG y PNG. Máximo {formatBytes(documentMaxBytes)}.</span></div>
                    <div className="document-form-grid">
                      <label>Categoría<select value={documentForm.categoryId} onChange={(event) => setDocumentForm({ ...documentForm, categoryId: event.target.value })}>{documentCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                      <label>Archivo<input key={documentEditing.key} type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={(event) => setDocumentForm({ ...documentForm, file: event.target.files[0] || null })} /></label>
                      <label className="full">Descripción <small className="optional-label">Opcional</small><textarea value={documentForm.description} onChange={(event) => setDocumentForm({ ...documentForm, description: event.target.value })} maxLength="1000" rows="2" /></label>
                    </div>
                    <div className="action-editor-buttons"><button type="button" className="secondary-button" onClick={() => setDocumentEditing(null)} disabled={documentSaving}>Cancelar</button><button type="button" className="primary-button" onClick={saveDocument} disabled={documentSaving}>{documentSaving ? 'Cargando…' : 'Guardar documento'}</button></div>
                  </div>
                )}
                <div className="document-list">
                  {documents.map((document) => (
                    <article className={`document-card ${document.isCurrent ? '' : 'historical'}`} key={document.id}>
                      <div className="document-icon"><FileText size={20} /></div>
                      <div className="document-copy">
                        <div className="document-title-row"><strong>{document.originalName}</strong><span className={document.isCurrent ? 'current-version' : 'old-version'}>{document.isCurrent ? 'Vigente' : 'Anterior'} · v{document.versionNumber}</span></div>
                        <span>{document.category.name} · {formatBytes(document.sizeBytes)} · {document.uploader?.fullName || 'Usuario eliminado'}</span>
                        {document.description && <p>{document.description}</p>}
                        <small>SHA-256 {document.sha256.slice(0, 12)}… · {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(document.createdAt))}</small>
                      </div>
                      <div className="document-buttons">
                        <button type="button" className="icon-button" onClick={() => downloadDocument(document)} disabled={downloadingId === document.id} aria-label={`Descargar ${document.originalName}`} title="Descargar"><Download size={17} /></button>
                        {document.isCurrent && can('documents.write') && editing.case.status.code !== 'archived' && !documentEditing && <button type="button" className="icon-button" onClick={() => startDocumentVersion(document)} aria-label={`Cargar nueva versión de ${document.originalName}`} title="Nueva versión"><History size={17} /></button>}
                      </div>
                    </article>
                  ))}
                  {!documents.length && <div className="document-empty"><FileText size={24} /><div><strong>Sin documentos</strong><span>Este expediente todavía no tiene archivos asociados.</span></div></div>}
                </div>
              </section>
            )}
            {editing.mode === 'edit' && <div className="case-history-grid"><section className="status-history"><h3>Historial de responsables</h3>{assignmentHistory.length ? assignmentHistory.map((entry) => <div className="history-entry" key={entry.id}><i className="assignment-dot" /><div><strong>{entry.assignee.fullName}</strong><span>{entry.comment || 'Sin comentario'} · Asignó {entry.actor?.fullName || 'Usuario eliminado'}</span></div><time>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.assignedAt))}</time></div>) : <p className="tracking-empty">Aún no hay asignaciones.</p>}</section><section className="status-history"><h3>Historial de estados</h3>{statusHistory.map((entry) => <div className="history-entry" key={entry.id}><i style={{ backgroundColor: entry.toStatus.color }} /><div><strong>{entry.toStatus.name}</strong><span>{entry.comment || 'Sin comentario'} · {entry.actor?.fullName || 'Usuario eliminado'}</span></div><time>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</time></div>)}</section></div>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>{can('cases.write') ? 'Cancelar' : 'Cerrar'}</button>{can('cases.write') && <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar expediente'}</button>}</div>
          </form>
        </div>
      )}
    </section>
  );
}
