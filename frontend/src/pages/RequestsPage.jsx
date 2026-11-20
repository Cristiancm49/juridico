import { FilePlus2, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusLabels = {
  Radicada: 'Radicada',
  PendienteInformacion: 'Pendiente de información',
  EnRevision: 'En revisión',
  Aprobada: 'Aprobada',
  Rechazada: 'Rechazada',
  Cancelada: 'Cancelada',
  Convertida: 'Convertida en caso',
};

const statusColors = {
  Radicada: '#2563eb',
  PendienteInformacion: '#d97706',
  EnRevision: '#7c3aed',
  Aprobada: '#15803d',
  Rechazada: '#b91c1c',
  Cancelada: '#64748b',
  Convertida: '#0f766e',
};

const transitionLabels = {
  IniciarRevision: 'Iniciar revisión',
  SolicitarInformacion: 'Solicitar información',
  Aprobar: 'Aprobar',
  Rechazar: 'Rechazar',
  Cancelar: 'Cancelar',
  ConvertirEnCaso: 'Convertir en caso',
};

const allowedTransitions = {
  Radicada: ['IniciarRevision', 'Cancelar'],
  PendienteInformacion: ['IniciarRevision', 'Cancelar'],
  EnRevision: ['SolicitarInformacion', 'Aprobar', 'Rechazar', 'Cancelar'],
  Aprobada: ['ConvertirEnCaso', 'Cancelar'],
};

const channels = ['Web', 'Presencial', 'Correo', 'Telefono', 'Otro'];

function initialForm() {
  return { solicitanteId: '', areaAsesoriaId: '', periodoAcademicoId: '', asunto: '', descripcionNecesidad: '', canalRecepcion: 'Web' };
}

export function RequestsPage() {
  const { can } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [solicitantes, setSolicitantes] = useState([]);
  const [form, setForm] = useState(initialForm());
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transitioningId, setTransitioningId] = useState(null);

  const loadSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      setSolicitudes(await apiFetch('/api/solicitudes'));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSolicitudes(); }, [loadSolicitudes]);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/catalogos/areas'),
      apiFetch('/api/catalogos/periodos'),
      apiFetch('/api/catalogos/solicitantes'),
    ]).then(([areaData, periodoData, solicitanteData]) => {
      setAreas(areaData.filter(({ activo }) => activo));
      setPeriodos(periodoData.filter(({ activo }) => activo));
      setSolicitantes(solicitanteData.filter(({ activo }) => activo));
    }).catch((error) => toast.error(error.message));
  }, []);

  const areaNames = useMemo(() => Object.fromEntries(areas.map((item) => [item.id, item.nombre])), [areas]);
  const applicantNames = useMemo(() => Object.fromEntries(solicitantes.map((item) => [item.id, item.nombreCompleto])), [solicitantes]);

  function openCreate() {
    if (!areas.length || !periodos.length || !solicitantes.length) {
      toast.error('No hay catálogos activos suficientes para registrar la solicitud.');
      return;
    }
    setForm({
      ...initialForm(),
      solicitanteId: solicitantes[0].id,
      areaAsesoriaId: areas[0].id,
      periodoAcademicoId: periodos[0].id,
    });
    setCreating(true);
  }

  async function createRequest(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/solicitudes', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Solicitud radicada correctamente.');
      setCreating(false);
      await loadSolicitudes();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function transition(item, transition) {
    if (!transition) return;
    if (!window.confirm(`¿Confirmas la acción “${transitionLabels[transition]}” para ${item.radicado}?`)) return;
    setTransitioningId(item.id);
    try {
      await apiFetch(`/api/solicitudes/${item.id}/transiciones`, {
        method: 'POST',
        body: JSON.stringify({ transicion: transition }),
      });
      toast.success('Estado actualizado correctamente.');
      await loadSolicitudes();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTransitioningId(null);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">ADMISIONES</span><h1>Solicitudes de asesoría</h1><p>Radica y gestiona las solicitudes contables recibidas.</p></div>
        <div className="row-actions">
          <button className="icon-button" onClick={loadSolicitudes} aria-label="Actualizar" title="Actualizar"><RefreshCw size={18} /></button>
          {can('requests.write') && <button className="primary-button" onClick={openCreate}><FilePlus2 size={18} /> Nueva solicitud</button>}
        </div>
      </div>

      <article className="panel table-panel">
        <div className="table-caption"><strong>{solicitudes.length} solicitudes</strong><span>Ordenadas desde la más reciente.</span></div>
        <div className="table-scroll">
          <table className="requests-table">
            <thead><tr><th>Radicado</th><th>Solicitante</th><th>Área</th><th>Estado</th><th>Registro</th><th>Acción</th></tr></thead>
            <tbody>
              {solicitudes.map((item) => (
                <tr key={item.id}>
                  <td><strong className="request-number">{item.radicado}</strong><span className="request-subject">{item.asunto}</span></td>
                  <td><strong className="table-primary">{applicantNames[item.solicitanteId] || 'Solicitante'}</strong></td>
                  <td><span className="tag">{areaNames[item.areaAsesoriaId] || 'Área contable'}</span></td>
                  <td><span className="request-status" style={{ color: statusColors[item.estado], backgroundColor: `${statusColors[item.estado]}14` }}>{statusLabels[item.estado]}</span></td>
                  <td>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(item.creadoEn))}</td>
                  <td>
                    {can('requests.transition') && allowedTransitions[item.estado]?.length ? (
                      <select aria-label={`Cambiar estado de ${item.radicado}`} defaultValue="" disabled={transitioningId === item.id} onChange={(event) => { const value = event.target.value; event.target.value = ''; transition(item, value); }}>
                        <option value="" disabled>{transitioningId === item.id ? 'Actualizando…' : 'Seleccionar'}</option>
                        {allowedTransitions[item.estado].map((value) => <option value={value} key={value}>{transitionLabels[value]}</option>)}
                      </select>
                    ) : <span className="table-secondary">Sin acciones</span>}
                  </td>
                </tr>
              ))}
              {!loading && solicitudes.length === 0 && <tr><td colSpan="6" className="empty-cell">Aún no hay solicitudes registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </article>

      {creating && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setCreating(false)}>
          <form className="modal-card request-modal" onSubmit={createRequest}>
            <div className="modal-head"><div><span className="eyebrow">NUEVA ADMISIÓN</span><h2>Radicar solicitud</h2></div><button type="button" className="icon-button" onClick={() => setCreating(false)} aria-label="Cerrar"><X /></button></div>
            <div className="form-grid">
              <label className="full">Solicitante<select value={form.solicitanteId} onChange={(event) => setForm({ ...form, solicitanteId: event.target.value })} required>{solicitantes.map((item) => <option value={item.id} key={item.id}>{item.nombreCompleto} · {item.tipoDocumento} {item.numeroDocumento}</option>)}</select></label>
              <label>Área de asesoría<select value={form.areaAsesoriaId} onChange={(event) => setForm({ ...form, areaAsesoriaId: event.target.value })} required>{areas.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></label>
              <label>Periodo académico<select value={form.periodoAcademicoId} onChange={(event) => setForm({ ...form, periodoAcademicoId: event.target.value })} required>{periodos.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></label>
              <label className="full">Asunto<input value={form.asunto} onChange={(event) => setForm({ ...form, asunto: event.target.value })} required minLength="5" maxLength="250" /></label>
              <label>Canal de recepción<select value={form.canalRecepcion} onChange={(event) => setForm({ ...form, canalRecepcion: event.target.value })}>{channels.map((channel) => <option value={channel} key={channel}>{channel === 'Telefono' ? 'Teléfono' : channel}</option>)}</select></label>
              <label className="full">Necesidad o consulta<textarea value={form.descripcionNecesidad} onChange={(event) => setForm({ ...form, descripcionNecesidad: event.target.value })} required minLength="10" maxLength="4000" rows="5" /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Radicando…' : 'Radicar solicitud'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

