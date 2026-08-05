import { AlertCircle, BookOpenText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';

export function CatalogsPage() {
  const [areas, setAreas] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/v1/catalogs/legal-areas'),
      apiFetch('/api/v1/catalogs/priorities'),
    ])
      .then(([areaData, priorityData]) => {
        setAreas(areaData.legalAreas);
        setPriorities(priorityData.priorities);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="page-heading"><div><span className="eyebrow">CONFIGURACIÓN DE SOLICITUDES</span><h1>Áreas y prioridades</h1><p>Clasificaciones iniciales que se usarán al registrar solicitudes de asesoría.</p></div></div>
      <div className="catalog-grid">
        <article className="panel catalog-panel">
          <div className="catalog-heading"><span className="catalog-icon"><BookOpenText size={20} /></span><div><h2>Áreas jurídicas</h2><p>{areas.length} áreas disponibles</p></div></div>
          <div className="catalog-list">{areas.map((area) => <div className="catalog-row" key={area.id}><div><strong>{area.name}</strong><span>{area.description}</span></div><span className={`state ${area.active ? 'active' : 'inactive'}`}>{area.active ? 'Activa' : 'Inactiva'}</span></div>)}{loading && <div className="empty-cell">Cargando áreas…</div>}</div>
        </article>
        <article className="panel catalog-panel">
          <div className="catalog-heading"><span className="catalog-icon priority-icon"><AlertCircle size={20} /></span><div><h2>Prioridades</h2><p>Ordenadas por nivel de atención</p></div></div>
          <div className="catalog-list">{priorities.map((priority) => <div className="catalog-row priority-row" key={priority.id}><span className="priority-dot" style={{ backgroundColor: priority.color }} /><div><strong>{priority.name}</strong><span>Nivel {priority.level}</span></div><span className={`state ${priority.active ? 'active' : 'inactive'}`}>{priority.active ? 'Activa' : 'Inactiva'}</span></div>)}{loading && <div className="empty-cell">Cargando prioridades…</div>}</div>
        </article>
      </div>
      <div className="info-banner catalog-note"><AlertCircle size={21} /><div><strong>Catálogo inicial controlado</strong><span>La edición administrativa se habilitará cuando el equipo confirme las áreas y niveles definitivos.</span></div></div>
    </section>
  );
}
