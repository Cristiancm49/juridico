import { Plus, RefreshCw, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';

export function ApplicantsPage() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tipoDocumento: 'NIT', numeroDocumento: '', nombreCompleto: '', correoElectronico: '', telefono: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setApplicants(await apiFetch('/api/catalogos/solicitantes'));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createApplicant(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/catalogos/solicitantes', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Solicitante creado correctamente.');
      setCreating(false);
      setForm({ tipoDocumento: 'NIT', numeroDocumento: '', nombreCompleto: '', correoElectronico: '', telefono: '' });
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">DIRECTORIO</span><h1>Solicitantes</h1><p>Personas y empresas que solicitan acompañamiento contable.</p></div>
        <div className="row-actions"><button className="icon-button" onClick={load} aria-label="Actualizar solicitantes" title="Actualizar"><RefreshCw size={18} /></button><button className="primary-button" onClick={() => setCreating(true)}><Plus size={18} /> Nuevo solicitante</button></div>
      </div>

      <article className="panel table-panel">
        <div className="table-caption"><strong>{applicants.length} solicitantes</strong><span>Consulta conectada con SQL Server.</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Nombre</th><th>Documento</th><th>Correo</th><th>Teléfono</th><th>Estado</th></tr></thead>
            <tbody>
              {applicants.map((item) => (
                <tr key={item.id}>
                  <td><strong className="table-primary">{item.nombreCompleto}</strong></td>
                  <td>{item.tipoDocumento} {item.numeroDocumento}</td>
                  <td>{item.correoElectronico || '—'}</td>
                  <td>{item.telefono || '—'}</td>
                  <td><span className="tag">{item.activo ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              ))}
              {!loading && applicants.length === 0 && <tr><td colSpan="5" className="empty-cell"><Users size={20} /> No hay solicitantes registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </article>

      {creating && <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setCreating(false)}>
        <form className="modal-card" onSubmit={createApplicant}>
          <div className="modal-head"><div><span className="eyebrow">DIRECTORIO</span><h2>Nuevo solicitante</h2></div><button type="button" className="icon-button" onClick={() => setCreating(false)} aria-label="Cerrar"><X /></button></div>
          <div className="form-grid">
            <label>Tipo de documento<select value={form.tipoDocumento} onChange={(event) => setForm({ ...form, tipoDocumento: event.target.value })}>{['NIT', 'CC', 'CE', 'TI'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Número de documento<input value={form.numeroDocumento} onChange={(event) => setForm({ ...form, numeroDocumento: event.target.value })} required /></label>
            <label className="full">Nombre o razón social<input value={form.nombreCompleto} onChange={(event) => setForm({ ...form, nombreCompleto: event.target.value })} required /></label>
            <label>Correo electrónico<input type="email" value={form.correoElectronico} onChange={(event) => setForm({ ...form, correoElectronico: event.target.value })} /></label>
            <label>Teléfono<input value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Crear solicitante'}</button></div>
        </form>
      </div>}
    </section>
  );
}
