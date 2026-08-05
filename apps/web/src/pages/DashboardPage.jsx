import { AlertTriangle, ArrowUpRight, BriefcaseBusiness, CalendarClock, CircleCheck, FolderOpen, ListTodo, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

export function DashboardPage() {
  const { user, can } = useAuth();
  const firstName = user.fullName.split(' ')[0];
  const [tasks, setTasks] = useState({ active: 0, overdue: 0, today: 0, week: 0 });
  const [reports, setReports] = useState(null);
  const canReadTasks = can('tasks.read');
  const canReadReports = can('reports.read');

  useEffect(() => {
    if (canReadTasks) apiFetch('/api/v1/tasks/summary').then(({ summary }) => setTasks(summary)).catch(() => {});
  }, [canReadTasks]);

  useEffect(() => {
    if (canReadReports) apiFetch('/api/v1/reports/overview').then(({ totals }) => setReports(totals)).catch(() => {});
  }, [canReadReports]);

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">RESUMEN</span><h1>Buenos días, {firstName}</h1><p>Este es el punto de partida de LegalDesk.</p></div>
        <div className="date-chip"><CalendarClock size={18} /> Fase 7 · Estabilización</div>
      </div>

      <div className="metric-grid">
        {canReadReports ? <>
          <article className="metric-card accent"><div className="metric-icon"><BriefcaseBusiness /></div><span>Expedientes activos</span><strong>{reports?.activeCases ?? '—'}</strong><small>Abiertos, en trámite o suspendidos</small></article>
          <article className="metric-card"><div className="metric-icon amber"><AlertTriangle /></div><span>Tareas vencidas</span><strong>{reports?.overdueTasks ?? '—'}</strong><small>Requieren atención inmediata</small></article>
          <article className="metric-card"><div className="metric-icon blue"><Scale /></div><span>Solicitudes registradas</span><strong>{reports?.requests ?? '—'}</strong><small>Histórico de asuntos recibidos</small></article>
          <article className="metric-card"><div className="metric-icon green"><FolderOpen /></div><span>Documentos vigentes</span><strong>{reports?.currentDocuments ?? '—'}</strong><small>Versiones actuales protegidas</small></article>
        </> : <>
          <article className="metric-card accent"><div className="metric-icon"><ListTodo /></div><span>Mis tareas activas</span><strong>{tasks.active}</strong><small>Compromisos pendientes o en curso</small></article>
          <article className="metric-card"><div className="metric-icon amber"><AlertTriangle /></div><span>Tareas vencidas</span><strong>{tasks.overdue}</strong><small>Requieren atención inmediata</small></article>
          <article className="metric-card"><div className="metric-icon blue"><CalendarClock /></div><span>Vencen hoy</span><strong>{tasks.today}</strong><small>Agenda jurídica del día</small></article>
          <article className="metric-card"><div className="metric-icon green"><CircleCheck /></div><span>Próximos 7 días</span><strong>{tasks.week}</strong><small>Vencimientos cercanos</small></article>
        </>}
      </div>

      <div className="content-grid">
        <article className="panel progress-panel">
          <div className="panel-head"><div><span className="eyebrow">IMPLEMENTACIÓN</span><h2>Ruta de LegalDesk</h2></div><span className="status-pill">Cierre técnico</span></div>
          {[
            ['Usuarios, autenticación, roles y permisos', 'Completado'],
            ['Personas, solicitudes y expedientes', 'Completado'],
            ['Asignaciones, estados y actuaciones', 'Completado'],
            ['Documentos privados y versiones', 'Completado'],
            ['Tareas, vencimientos y alertas', 'Completado'],
            ['Reportes y exportación', 'Completado'],
            ['Seguridad, respaldos y manuales', 'Siguiente'],
          ].map(([label, status], index) => (
            <div className={`roadmap-row ${index === 6 ? 'current' : ''}`} key={label}>
              <span className="roadmap-number">{index + 1}</span><strong>{label}</strong><span>{status}</span>
            </div>
          ))}
        </article>
        <article className="panel focus-panel">
          <span className="eyebrow light">OBJETIVO ACTUAL</span>
          <h2>Preparar una entrega confiable.</h2>
          <p>El siguiente paso consolidará respaldos, endurecimiento de seguridad, manuales y criterios de aceptación.</p>
          <div className="focus-link">Sprint 7 listo para iniciar <ArrowUpRight size={18} /></div>
        </article>
      </div>
    </section>
  );
}
