import { Building2, Edit3, Plus, RefreshCw, Search, UserCheck, UserRound, UserX, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = {
  personType: 'natural',
  documentType: 'CC',
  documentNumber: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  notes: '',
};

const documentLabels = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  NIT: 'NIT',
  PASSPORT: 'Pasaporte',
  TI: 'Tarjeta de identidad',
};

export function PeoplePage() {
  const { can } = useAuth();
  const [people, setPeople] = useState([]);
  const [filters, setFilters] = useState({ search: '', active: '' });
  const [appliedFilters, setAppliedFilters] = useState({ search: '', active: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadPeople = useCallback(async (page = 1, activeFilters = appliedFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (activeFilters.search.trim()) params.set('search', activeFilters.search.trim());
      if (activeFilters.active !== '') params.set('active', activeFilters.active);
      const data = await apiFetch(`/api/v1/people?${params}`);
      setPeople(data.people);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { loadPeople(1, appliedFilters); }, [appliedFilters, loadPeople]);

  function openCreate() {
    setEditing({ mode: 'create' });
    setForm(emptyForm);
  }

  function openEdit(person) {
    setEditing({ mode: 'edit', person });
    setForm({
      personType: person.personType,
      documentType: person.documentType,
      documentNumber: person.documentNumber,
      fullName: person.fullName,
      email: person.email || '',
      phone: person.phone || '',
      address: person.address || '',
      city: person.city || '',
      notes: person.notes || '',
    });
  }

  function closeModal() {
    if (!saving) setEditing(null);
  }

  async function savePerson(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing.mode === 'create') {
        await apiFetch('/api/v1/people', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Persona registrada correctamente.');
      } else {
        await apiFetch(`/api/v1/people/${editing.person.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        toast.success('Información actualizada correctamente.');
      }
      setEditing(null);
      await loadPeople(pagination.page);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(person, active) {
    const action = active ? 'activar' : 'desactivar';
    if (!window.confirm(`¿Deseas ${action} a ${person.fullName}?`)) return;
    try {
      await apiFetch(`/api/v1/people/${person.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      toast.success(`Persona ${active ? 'activada' : 'desactivada'}.`);
      await loadPeople(pagination.page);
    } catch (error) {
      toast.error(error.message);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMISIONES</span>
          <h1>Personas y clientes</h1>
          <p>Conserva una ficha única para cada persona natural o jurídica.</p>
        </div>
        {can('requests.write') && <button className="primary-button" onClick={openCreate}><Plus size={18} /> Nueva persona</button>}
      </div>

      <form className="panel people-filters" onSubmit={applyFilters}>
        <label className="search-field">
          <Search size={18} />
          <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Nombre, documento, correo o teléfono" />
        </label>
        <select aria-label="Filtrar por estado" value={filters.active} onChange={(event) => setFilters({ ...filters, active: event.target.value })}>
          <option value="">Todos los estados</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
        <button className="primary-button">Buscar</button>
        <button type="button" className="icon-button" onClick={() => loadPeople(pagination.page)} aria-label="Actualizar listado" title="Actualizar"><RefreshCw size={18} /></button>
      </form>

      <article className="panel table-panel">
        <div className="table-caption"><strong>{pagination.total} personas</strong><span>El documento evita registros duplicados.</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Persona</th><th>Documento</th><th>Contacto</th><th>Ciudad</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td><div className="person-cell"><div className="avatar small">{person.personType === 'legal' ? <Building2 size={17} /> : <UserRound size={17} />}</div><div><strong>{person.fullName}</strong><span>{person.personType === 'legal' ? 'Persona jurídica' : 'Persona natural'}</span></div></div></td>
                  <td><strong className="table-primary">{person.documentNumber}</strong><span className="table-secondary">{documentLabels[person.documentType]}</span></td>
                  <td><strong className="table-primary">{person.email || 'Sin correo'}</strong><span className="table-secondary">{person.phone || 'Sin teléfono'}</span></td>
                  <td>{person.city || '—'}</td>
                  <td><span className={`state ${person.active ? 'active' : 'inactive'}`}>{person.active ? 'Activa' : 'Inactiva'}</span></td>
                  <td className="actions-cell">
                    {can('requests.write') && <div className="row-actions"><button className="icon-button" onClick={() => openEdit(person)} aria-label={`Editar a ${person.fullName}`} title="Editar"><Edit3 size={18} /></button><button className="icon-button" onClick={() => setActive(person, !person.active)} aria-label={person.active ? 'Desactivar persona' : 'Activar persona'} title={person.active ? 'Desactivar' : 'Activar'}>{person.active ? <UserX size={18} /> : <UserCheck size={18} />}</button></div>}
                  </td>
                </tr>
              ))}
              {!loading && people.length === 0 && <tr><td colSpan="6" className="empty-cell">No hay personas que coincidan con la búsqueda.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pagination"><button className="secondary-button" disabled={pagination.page <= 1 || loading} onClick={() => loadPeople(pagination.page - 1)}>Anterior</button><span>Página {pagination.page} de {totalPages}</span><button className="secondary-button" disabled={pagination.page >= totalPages || loading} onClick={() => loadPeople(pagination.page + 1)}>Siguiente</button></div>
      </article>

      {editing && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <form className="modal-card person-modal" onSubmit={savePerson} aria-label={editing.mode === 'create' ? 'Registrar persona' : 'Editar persona'}>
            <div className="modal-head"><div><span className="eyebrow">FICHA DE CONTACTO</span><h2>{editing.mode === 'create' ? 'Registrar persona' : 'Editar persona'}</h2></div><button type="button" className="icon-button" onClick={closeModal} aria-label="Cerrar"><X /></button></div>
            <div className="form-grid">
              <label>Tipo de persona<select value={form.personType} onChange={(event) => setForm({ ...form, personType: event.target.value })}><option value="natural">Persona natural</option><option value="legal">Persona jurídica</option></select></label>
              <label>Tipo de documento<select value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}>{Object.entries(documentLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label>Número de documento<input value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} required minLength="3" maxLength="40" /></label>
              <label>Nombre completo o razón social<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required minLength="3" maxLength="180" /></label>
              <label>Correo <small className="optional-label">Opcional</small><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label>Teléfono <small className="optional-label">Opcional</small><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength="30" /></label>
              <label>Ciudad <small className="optional-label">Opcional</small><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} maxLength="100" /></label>
              <label>Dirección <small className="optional-label">Opcional</small><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} maxLength="240" /></label>
              <label className="full">Notas internas <small className="optional-label">Opcional</small><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength="1200" rows="4" /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar persona'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
