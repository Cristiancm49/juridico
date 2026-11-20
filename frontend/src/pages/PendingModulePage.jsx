import { Download, Filter, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiDownload, apiFetch } from '../api.js';

const stateOptions = (values) => values.map((value) => ({ value, label: value }));

const configurations = {
  'Casos de asesoría': {
    key: 'casos', action: 'Abrir caso', statusColumn: 4,
    fields: [
      { key: 'numero', label: 'Número del caso', placeholder: 'Se genera automáticamente', optional: true },
      { key: 'solicitanteId', label: 'Solicitante', type: 'applicants' },
      { key: 'areaAsesoriaId', label: 'Área de asesoría', type: 'areas' },
      { key: 'responsable', label: 'Responsable' },
      { key: 'estado', label: 'Estado', type: 'select', options: stateOptions(['Activo', 'En seguimiento', 'Pendiente']) },
    ],
  },
  Asignaciones: {
    key: 'asignaciones', action: 'Nueva asignación', statusColumn: 5,
    fields: [
      { key: 'caso', label: 'Caso', type: 'cases' },
      { key: 'area', label: 'Área' },
      { key: 'docente', label: 'Docente responsable' },
      { key: 'estudiante', label: 'Estudiante asignado' },
      { key: 'estado', label: 'Estado', type: 'select', options: stateOptions(['Asignado', 'Pendiente']) },
    ],
  },
  'Sesiones y compromisos': {
    key: 'sesiones', action: 'Registrar sesión', statusColumn: 5,
    fields: [
      { key: 'caso', label: 'Caso', type: 'cases' },
      { key: 'fecha', label: 'Fecha y hora', type: 'datetime-local' },
      { key: 'tipo', label: 'Tipo de sesión' },
      { key: 'responsable', label: 'Responsable' },
      { key: 'compromisos', label: 'Número de compromisos', type: 'number', min: 0 },
      { key: 'estado', label: 'Estado', type: 'select', options: stateOptions(['Programada', 'Realizada', 'Finalizada']) },
    ],
  },
  Documentos: {
    key: 'documentos', action: 'Cargar documento',
    fields: [
      { key: 'caso', label: 'Caso', type: 'cases' },
      { key: 'archivo', label: 'Archivo (máximo 10 MB)', type: 'file', full: true },
      { key: 'categoria', label: 'Categoría', type: 'select', options: stateOptions(['Diagnóstico', 'Hoja de trabajo', 'Entregable', 'Informe', 'Soporte']) },
      { key: 'version', label: 'Versión', placeholder: 'v1' },
      { key: 'responsable', label: 'Responsable' },
    ],
  },
  Notificaciones: {
    key: 'notificaciones', action: 'Nueva notificación', statusColumn: 5,
    fields: [
      { key: 'destinatario', label: 'Destinatario' },
      { key: 'tipo', label: 'Tipo', type: 'select', options: stateOptions(['Asignación', 'Solicitud', 'Compromiso', 'Documento', 'General']) },
      { key: 'asunto', label: 'Asunto', full: true },
      { key: 'canal', label: 'Canal', type: 'select', options: stateOptions(['Sistema', 'Correo', 'WhatsApp']) },
      { key: 'estado', label: 'Estado', type: 'select', options: stateOptions(['Enviada', 'No leída', 'Leída']) },
    ],
  },
  Reportes: { key: 'reportes', action: 'Exportar reporte', export: true },
  'Usuarios y roles': {
    key: 'usuarios', action: 'Crear usuario', statusColumn: 4,
    fields: [
      { key: 'nombreCompleto', label: 'Nombre completo', full: true },
      { key: 'email', label: 'Correo electrónico', type: 'email' },
      { key: 'rol', label: 'Rol', type: 'select', options: stateOptions(['ADMIN', 'JEFE_PROGRAMA', 'COORDINADORA', 'DOCENTE', 'ESTUDIANTE', 'SOLICITANTE']) },
      {
        key: 'password', label: 'Contraseña temporal', type: 'password', full: true,
        minLength: 8, pattern: '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}',
        title: 'Mínimo 8 caracteres, con mayúscula, minúscula y número.',
        help: 'Mínimo 8 caracteres, con mayúscula, minúscula y número. El símbolo especial es opcional.',
      },
    ],
  },
  Auditoría: { key: 'auditoria', action: 'Exportar registro', statusColumn: 4, export: true },
};

function optionsFor(field, resources) {
  if (field.type === 'applicants') return resources.applicants.map((item) => ({ value: item.id, label: item.nombreCompleto }));
  if (field.type === 'areas') return resources.areas.map((item) => ({ value: item.id, label: item.nombre }));
  if (field.type === 'cases') return resources.cases.map((item) => ({ value: item[0], label: `${item[0]} · ${item[1]}` }));
  return field.options || [];
}

function initialValue(field, resources) {
  const options = optionsFor(field, resources);
  if (options.length) return options[0].value;
  if (field.type === 'datetime-local') {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
  if (field.type === 'number') return '0';
  if (field.key === 'version') return 'v1';
  return '';
}

export function PendingModulePage({ eyebrow, title, description }) {
  const config = configurations[title];
  const [data, setData] = useState({ metrics: [], columns: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resources, setResources] = useState({ applicants: [], areas: [], cases: [] });
  const [form, setForm] = useState({});

  const loadModule = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch(`/api/modulos/${config.key}`));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [config.key]);

  useEffect(() => {
    setQuery('');
    setStatus('');
    setCreating(false);
    loadModule();
  }, [loadModule]);

  const statusOptions = useMemo(() => {
    if (config.statusColumn === undefined) return [];
    return [...new Set(data.rows.map((row) => row[config.statusColumn]).filter(Boolean))].sort();
  }, [config.statusColumn, data.rows]);

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return data.rows.filter((row) => {
      const matchesText = !normalized || row.join(' ').toLocaleLowerCase('es').includes(normalized);
      const matchesStatus = !status || row[config.statusColumn] === status;
      return matchesText && matchesStatus;
    });
  }, [config.statusColumn, data.rows, query, status]);

  function exportCsv() {
    const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const content = [data.columns, ...rows].map((row) => row.map(escape).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.key}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo CSV generado correctamente.');
  }

  async function openCreate() {
    if (config.export) {
      exportCsv();
      return;
    }
    try {
      const needsCatalogs = config.key === 'casos';
      const needsCases = ['asignaciones', 'sesiones', 'documentos'].includes(config.key);
      const [applicants, areas, caseData] = await Promise.all([
        needsCatalogs ? apiFetch('/api/catalogos/solicitantes') : [],
        needsCatalogs ? apiFetch('/api/catalogos/areas') : [],
        needsCases ? apiFetch('/api/modulos/casos') : null,
      ]);
      const nextResources = { applicants, areas, cases: caseData?.rows || [] };
      setResources(nextResources);
      setForm(Object.fromEntries(config.fields.map((field) => [field.key, initialValue(field, nextResources)])));
      setCreating(true);
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function createRecord(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await apiFetch(`/api/modulos/${config.key}`, { method: 'POST', body: JSON.stringify(form) });
      toast.success(result.message);
      setCreating(false);
      await loadModule();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">{eyebrow}</span><h1>{title} <span className="demo-badge">API · SQL</span></h1><p>{description}</p></div>
        <button className="primary-button" onClick={openCreate}>
          {config.export ? <Download size={18} /> : <Plus size={18} />} {config.action}
        </button>
      </div>

      <div className="module-metric-grid">
        {data.metrics.map(({ label, value }, index) => (
          <article className={`metric-card ${index === 0 ? 'accent' : ''}`} key={label}>
            <span>{label}</span><strong>{loading ? '—' : value}</strong><small>Calculado desde SQL Server</small>
          </article>
        ))}
      </div>

      <div className="panel module-toolbar">
        <label className="search-field"><Search size={18} /><input placeholder={`Buscar en ${title.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)} disabled={statusOptions.length === 0}>
          <option value="">Todos los estados</option>
          {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <button className="secondary-button" onClick={() => { setQuery(''); setStatus(''); }}><Filter size={17} /> Limpiar</button>
        <button className="icon-button" onClick={loadModule} aria-label="Actualizar" title="Actualizar" disabled={loading}><RefreshCw size={18} /></button>
      </div>

      <article className="panel table-panel">
        <div className="table-caption"><strong>{loading ? 'Consultando…' : `${rows.length} registros`}</strong><span>Información persistida y servida por la API.</span></div>
        <div className="table-scroll"><table><thead><tr>{data.columns.map((column) => <th key={column}>{column}</th>)}{config.key === 'documentos' && <th>Archivo</th>}</tr></thead><tbody>
          {rows.map((row, rowIndex) => <tr key={`${title}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cellIndex === 0 ? <strong className="table-primary">{cell}</strong> : cell}</td>)}{config.key === 'documentos' && <td><button className="secondary-button" disabled={!data.rowIds?.[rowIndex] || data.rowIds[rowIndex] === '00000000-0000-0000-0000-000000000000'} onClick={async () => { try { await apiDownload(`/api/modulos/documentos/${data.rowIds[rowIndex]}/contenido`, row[0]); } catch (error) { toast.error(error.message); } }}><Download size={15} /> Descargar</button></td>}</tr>)}
          {!loading && rows.length === 0 && <tr><td colSpan={Math.max(data.columns.length, 1)}>No hay registros que coincidan con la búsqueda.</td></tr>}
        </tbody></table></div>
      </article>

      {creating && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setCreating(false)}>
          <form className="modal-card" onSubmit={createRecord}>
            <div className="modal-head"><div><span className="eyebrow">NUEVO REGISTRO</span><h2>{config.action}</h2></div><button type="button" className="icon-button" onClick={() => setCreating(false)} aria-label="Cerrar"><X /></button></div>
            <div className="form-grid">
              {config.fields.map((field) => {
                const options = optionsFor(field, resources);
                const isSelect = ['select', 'applicants', 'areas', 'cases'].includes(field.type);
                return (
                  <label className={field.full ? 'full' : ''} key={field.key}>
                    {field.label}{field.optional && <span className="optional-label">opcional</span>}
                    {isSelect ? (
                      <select value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} required={!field.optional}>
                        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                    ) : field.type === 'file' ? (
                      <input
                        type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('El archivo supera el límite de 10 MB.');
                            event.target.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => setForm((current) => ({
                            ...current,
                            nombre: file.name,
                            mimeType: file.type || 'application/octet-stream',
                            contenidoBase64: String(reader.result).split(',')[1],
                          }));
                          reader.readAsDataURL(file);
                        }}
                      />
                    ) : (
                      <input
                        type={field.type || 'text'} value={form[field.key] || ''} placeholder={field.placeholder}
                        min={field.min} minLength={field.minLength} pattern={field.pattern} title={field.title}
                        autoComplete={field.type === 'password' ? 'new-password' : undefined} required={!field.optional}
                        onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                      />
                    )}
                    {field.help && <small className="field-help">{field.help}</small>}
                  </label>
                );
              })}
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
