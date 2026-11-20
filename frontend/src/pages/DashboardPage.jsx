import { BarChart3, Bell, BookUser, BriefcaseBusiness, CalendarClock, CircleCheck, ClipboardList, Clock3, FileText, ListTree, SearchCheck, UserCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';
import { navigate } from '../router.js';

const modules = [
  ['Solicitantes', '/solicitantes', BookUser, 'Conectado'],
  ['Solicitudes', '/solicitudes', ClipboardList, 'Conectado'],
  ['Casos de asesoría', '/casos', BriefcaseBusiness, 'Conectado'],
  ['Asignaciones', '/asignaciones', UserCheck, 'Conectado'],
  ['Sesiones', '/sesiones', ListTree, 'Conectado'],
  ['Documentos', '/documentos', FileText, 'Conectado'],
  ['Notificaciones', '/notificaciones', Bell, 'Conectado'],
  ['Reportes', '/reportes', BarChart3, 'Conectado'],
  ['Catálogos', '/catalogos', ListTree, 'Conectado'],
  ['Usuarios y roles', '/usuarios', Users, 'Conectado'],
];

export function DashboardPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  useEffect(() => {
    apiFetch('/api/solicitudes')
      .then(setSolicitudes)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    total: solicitudes.length,
    radicadas: solicitudes.filter(({ estado }) => estado === 'Radicada').length,
    revision: solicitudes.filter(({ estado }) => ['EnRevision', 'PendienteInformacion'].includes(estado)).length,
    cerradas: solicitudes.filter(({ estado }) => ['Aprobada', 'Rechazada', 'Cancelada', 'Convertida'].includes(estado)).length,
  }), [solicitudes]);

  const value = (number) => (loading ? '—' : number);

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">RESUMEN</span><h1>Consultorio Contable</h1><p>Panel operativo del sistema de asesoría y apoyo contable.</p></div>
        <div className="date-chip"><CalendarClock size={18} /> {today}</div>
      </div>

      <div className="module-launcher">
        <div className="section-heading"><div><span className="eyebrow">MÓDULOS</span><h2>Accesos de trabajo</h2></div><span>10 módulos disponibles</span></div>
        <div className="module-grid">
          {modules.map(([label, path, Icon, status]) => (
            <button className="module-card" key={path} onClick={() => navigate(path)}>
              <span className="module-icon"><Icon size={21} /></span>
              <span><strong>{label}</strong><small>{status}</small></span>
              <i className={status === 'Conectado' ? 'connected' : ''} />
            </button>
          ))}
        </div>
      </div>

      <div className="section-heading"><div><span className="eyebrow">INDICADORES</span><h2>Solicitudes</h2></div></div>
      <div className="metric-grid">
        <article className="metric-card accent"><div className="metric-icon"><ClipboardList /></div><span>Total de solicitudes</span><strong>{value(totals.total)}</strong><small>Radicadas en el sistema</small></article>
        <article className="metric-card"><div className="metric-icon blue"><Clock3 /></div><span>Por revisar</span><strong>{value(totals.radicadas)}</strong><small>Pendientes de iniciar revisión</small></article>
        <article className="metric-card"><div className="metric-icon amber"><SearchCheck /></div><span>En seguimiento</span><strong>{value(totals.revision)}</strong><small>En revisión o esperando información</small></article>
        <article className="metric-card"><div className="metric-icon green"><CircleCheck /></div><span>Con decisión</span><strong>{value(totals.cerradas)}</strong><small>Aprobadas, rechazadas o finalizadas</small></article>
      </div>
    </section>
  );
}
