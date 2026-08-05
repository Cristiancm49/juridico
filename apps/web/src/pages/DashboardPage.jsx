import { AlertTriangle, ArrowUpRight, CalendarClock, CircleCheck, ListTodo } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

export function DashboardPage() {
  const { user, can } = useAuth();
  const firstName = user.fullName.split(' ')[0];
  const [tasks, setTasks] = useState({ active: 0, overdue: 0, today: 0, week: 0 });
  const canReadTasks = can('tasks.read');

  useEffect(() => {
    if (canReadTasks) apiFetch('/api/v1/tasks/summary').then(({ summary }) => setTasks(summary)).catch(() => {});
  }, [canReadTasks]);

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">RESUMEN</span><h1>Buenos días, {firstName}</h1><p>Este es el punto de partida de LegalDesk.</p></div>
        <div className="date-chip"><CalendarClock size={18} /> Fase 6 · Reportes</div>
      </div>

      <div className="metric-grid">
        <article className="metric-card accent"><div className="metric-icon"><ListTodo /></div><span>Mis tareas activas</span><strong>{tasks.active}</strong><small>Compromisos pendientes o en curso</small></article>
        <article className="metric-card"><div className="metric-icon amber"><AlertTriangle /></div><span>Tareas vencidas</span><strong>{tasks.overdue}</strong><small>Requieren atención inmediata</small></article>
        <article className="metric-card"><div className="metric-icon blue"><CalendarClock /></div><span>Vencen hoy</span><strong>{tasks.today}</strong><small>Agenda jurídica del día</small></article>
        <article className="metric-card"><div className="metric-icon green"><CircleCheck /></div><span>Próximos 7 días</span><strong>{tasks.week}</strong><small>Vencimientos cercanos</small></article>
      </div>

      <div className="content-grid">
        <article className="panel progress-panel">
          <div className="panel-head"><div><span className="eyebrow">IMPLEMENTACIÓN</span><h2>Ruta de LegalDesk</h2></div><span className="status-pill">En construcción</span></div>
          {[
            ['Usuarios, autenticación, roles y permisos', 'Completado'],
            ['Personas, solicitudes y expedientes', 'Completado'],
            ['Asignaciones, estados y actuaciones', 'Completado'],
            ['Documentos privados y versiones', 'Completado'],
            ['Tareas, vencimientos y alertas', 'Completado'],
            ['Reportes y exportación', 'Siguiente'],
          ].map(([label, status], index) => (
            <div className={`roadmap-row ${index === 5 ? 'current' : ''}`} key={label}>
              <span className="roadmap-number">{index + 1}</span><strong>{label}</strong><span>{status}</span>
            </div>
          ))}
        </article>
        <article className="panel focus-panel">
          <span className="eyebrow light">OBJETIVO ACTUAL</span>
          <h2>Indicadores claros para decidir.</h2>
          <p>El siguiente paso resumirá expedientes, cargas de trabajo y resultados con exportación sencilla.</p>
          <div className="focus-link">Sprint 6 listo para iniciar <ArrowUpRight size={18} /></div>
        </article>
      </div>
    </section>
  );
}
