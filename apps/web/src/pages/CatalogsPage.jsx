import { AlertCircle, BookOpenText, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';

export function CatalogsPage() {
  const [areas, setAreas] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/v1/catalogs/legal-areas'),
      apiFetch('/api/v1/catalogs/priorities'),
      apiFetch('/api/v1/catalogs/request-statuses'),
    ])
      .then(([areaData, priorityData, statusData]) => {
        setAreas(areaData.legalAreas);
        setPriorities(priorityData.priorities);
        setStatuses(statusData.requestStatuses);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="page-heading"><div><span className="eyebrow">CONFIGURACIÓN DE SOLICITUDES</span><h1>Catálogos de solicitudes</h1><p>Áreas, prioridades y estados utilizados durante la admisión jurídica.</p></div></div>
      <div className="catalog-grid">
        <article className="panel catalog-panel">
          <div className="catalog-heading"><span className="catalog-icon"><BookOpenText size={20} /></span><div><h2>Áreas jurídicas</h2><p>{areas.length} áreas disponibles</p></div></div>
          <div className="catalog-list">{areas.map((area) => <div className="catalog-row" key={area.id}><div><strong>{area.name}</strong><span>{area.description}</span></div><span className={`state ${area.active ? 'active' : 'inactive'}`}>{area.active ? 'Activa' : 'Inactiva'}</span></div>)}{loading && <div className="empty-cell">Cargando áreas…</div>}</div>
        </article>
        <article className="panel catalog-panel">
          <div className="catalog-heading"><span className="catalog-icon priority-icon"><AlertCircle size={20} /></span><div><h2>Prioridades</h2><p>Ordenadas por nivel de atención</p></div></div>
          <div className="catalog-list">{priorities.map((priority) => <div className="catalog-row priority-row" key={priority.id}><span className="priority-dot" style={{ backgroundColor: priority.color }} /><div><strong>{priority.name}</strong><span>Nivel {priority.level}</span></div><span className={`state ${priority.active ? 'active' : 'inactive'}`}>{priority.active ? 'Activa' : 'Inactiva'}</span></div>)}{loading && <div className="empty-cell">Cargando prioridades…</div>}</div>
        </article>
        <article className="panel catalog-panel catalog-wide">
          <div className="catalog-heading"><span className="catalog-icon status-icon"><Workflow size={20} /></span><div><h2>Estados de solicitud</h2><p>Flujo controlado desde la recepción hasta la decisión</p></div></div>
          <div className="status-catalog">{statuses.map((status) => <div className="status-catalog-item" key={status.id}><span style={{ backgroundColor: status.color }} /><div><strong>{status.name}</strong><small>{status.description}</small></div></div>)}{loading && <div className="empty-cell">Cargando estados…</div>}</div>
        </article>
      </div>
      <div className="info-banner catalog-note"><AlertCircle size={21} /><div><strong>Catálogo inicial controlado</strong><span>Las áreas, prioridades y transiciones se mantendrán controladas hasta su validación funcional definitiva.</span></div></div>
    </section>
  );
}
