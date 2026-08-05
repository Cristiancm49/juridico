import { AlertTriangle, ArrowUpRight, BriefcaseBusiness, CalendarClock, CircleCheck, FileStack } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user.fullName.split(' ')[0];

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">RESUMEN</span><h1>Buenos días, {firstName}</h1><p>Este es el punto de partida de LegalDesk.</p></div>
        <div className="date-chip"><CalendarClock size={18} /> Fase 2 · Admisiones</div>
      </div>

      <div className="metric-grid">
        <article className="metric-card accent"><div className="metric-icon"><BriefcaseBusiness /></div><span>Expedientes activos</span><strong>—</strong><small>Disponible en el sprint 2</small></article>
        <article className="metric-card"><div className="metric-icon amber"><AlertTriangle /></div><span>Próximos vencimientos</span><strong>—</strong><small>Disponible en el sprint 5</small></article>
        <article className="metric-card"><div className="metric-icon blue"><FileStack /></div><span>Solicitudes nuevas</span><strong>—</strong><small>Disponible en el sprint 2</small></article>
        <article className="metric-card"><div className="metric-icon green"><CircleCheck /></div><span>Base de acceso</span><strong>Lista</strong><small>Usuarios, roles y sesiones</small></article>
      </div>

      <div className="content-grid">
        <article className="panel progress-panel">
          <div className="panel-head"><div><span className="eyebrow">IMPLEMENTACIÓN</span><h2>Ruta de LegalDesk</h2></div><span className="status-pill">En construcción</span></div>
          {[
            ['Usuarios, autenticación, roles y permisos', 'Completado'],
            ['Personas, solicitudes y expedientes', 'Actual'],
            ['Asignaciones, estados y actuaciones', 'Pendiente'],
            ['Documentos, tareas y alertas', 'Pendiente'],
          ].map(([label, status], index) => (
            <div className={`roadmap-row ${index === 1 ? 'current' : ''}`} key={label}>
              <span className="roadmap-number">{index + 1}</span><strong>{label}</strong><span>{status}</span>
            </div>
          ))}
        </article>
        <article className="panel focus-panel">
          <span className="eyebrow light">OBJETIVO ACTUAL</span>
          <h2>Una ficha única para cada cliente.</h2>
          <p>El segundo bloque conecta personas, solicitudes y expedientes sin duplicar información.</p>
          <div className="focus-link">Admisión con trazabilidad <ArrowUpRight size={18} /></div>
        </article>
      </div>
    </section>
  );
}
