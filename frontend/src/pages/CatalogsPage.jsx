import { Plus, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';

export function CatalogsPage() {
  const [areas, setAreas] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);
  const [saving, setSaving] = useState(false);
  const [areaForm, setAreaForm] = useState({ codigo: '', nombre: '', descripcion: '' });
  const [periodForm, setPeriodForm] = useState({ codigo: '', nombre: '', fechaInicio: '', fechaFin: '', activo: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [areaData, periodData] = await Promise.all([
        apiFetch('/api/catalogos/areas'),
        apiFetch('/api/catalogos/periodos'),
      ]);
      setAreas(areaData);
      setPeriods(periodData);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCatalog(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const isArea = creating === 'area';
      await apiFetch(`/api/catalogos/${isArea ? 'areas' : 'periodos'}`, {
        method: 'POST', body: JSON.stringify(isArea ? areaForm : periodForm),
      });
      toast.success(isArea ? 'Área creada correctamente.' : 'Periodo creado correctamente.');
      setCreating(null);
      if (isArea) setAreaForm({ codigo: '', nombre: '', descripcion: '' });
      else setPeriodForm({ codigo: '', nombre: '', fechaInicio: '', fechaFin: '', activo: false });
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
        <div><span className="eyebrow">CONFIGURACIÓN</span><h1>Catálogos</h1><p>Áreas de asesoría y periodos académicos disponibles.</p></div>
        <div className="row-actions"><button className="icon-button" onClick={load} aria-label="Actualizar catálogos" title="Actualizar"><RefreshCw size={18} /></button><button className="secondary-button" onClick={() => setCreating('period')}><Plus size={17} /> Periodo</button><button className="primary-button" onClick={() => setCreating('area')}><Plus size={18} /> Área</button></div>
      </div>

      <div className="metric-grid">
        <article className="metric-card accent"><span>Áreas de asesoría</span><strong>{loading ? '—' : areas.length}</strong><small>{areas.filter(({ activo }) => activo).length} activas</small></article>
        <article className="metric-card"><span>Periodos académicos</span><strong>{loading ? '—' : periods.length}</strong><small>{periods.filter(({ activo }) => activo).length} activo</small></article>
      </div>

      <article className="panel table-panel">
        <div className="table-caption"><strong>Áreas de asesoría</strong><span>Orden institucional.</span></div>
        <div className="table-scroll"><table><thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th></tr></thead><tbody>{areas.map((item) => <tr key={item.id}><td><strong>{item.codigo}</strong></td><td>{item.nombre}</td><td>{item.descripcion || '—'}</td><td><span className="tag">{item.activo ? 'Activa' : 'Inactiva'}</span></td></tr>)}</tbody></table></div>
      </article>

      <article className="panel table-panel" style={{ marginTop: '1rem' }}>
        <div className="table-caption"><strong>Periodos académicos</strong><span>Vigencia para la radicación.</span></div>
        <div className="table-scroll"><table><thead><tr><th>Código</th><th>Nombre</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead><tbody>{periods.map((item) => <tr key={item.id}><td><strong>{item.codigo}</strong></td><td>{item.nombre}</td><td>{item.fechaInicio}</td><td>{item.fechaFin}</td><td><span className="tag">{item.activo ? 'Activo' : 'Inactivo'}</span></td></tr>)}</tbody></table></div>
      </article>

      {creating && <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setCreating(null)}>
        <form className="modal-card" onSubmit={createCatalog}>
          <div className="modal-head"><div><span className="eyebrow">CONFIGURACIÓN</span><h2>{creating === 'area' ? 'Nueva área de asesoría' : 'Nuevo periodo académico'}</h2></div><button type="button" className="icon-button" onClick={() => setCreating(null)} aria-label="Cerrar"><X /></button></div>
          {creating === 'area' ? <div className="form-grid">
            <label>Código<input value={areaForm.codigo} onChange={(event) => setAreaForm({ ...areaForm, codigo: event.target.value })} required /></label>
            <label>Nombre<input value={areaForm.nombre} onChange={(event) => setAreaForm({ ...areaForm, nombre: event.target.value })} required /></label>
            <label className="full">Descripción<input value={areaForm.descripcion} onChange={(event) => setAreaForm({ ...areaForm, descripcion: event.target.value })} /></label>
          </div> : <div className="form-grid">
            <label>Código<input value={periodForm.codigo} onChange={(event) => setPeriodForm({ ...periodForm, codigo: event.target.value })} required /></label>
            <label>Nombre<input value={periodForm.nombre} onChange={(event) => setPeriodForm({ ...periodForm, nombre: event.target.value })} required /></label>
            <label>Fecha de inicio<input type="date" value={periodForm.fechaInicio} onChange={(event) => setPeriodForm({ ...periodForm, fechaInicio: event.target.value })} required /></label>
            <label>Fecha final<input type="date" value={periodForm.fechaFin} onChange={(event) => setPeriodForm({ ...periodForm, fechaFin: event.target.value })} required /></label>
          </div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreating(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
        </form>
      </div>}
    </section>
  );
}
