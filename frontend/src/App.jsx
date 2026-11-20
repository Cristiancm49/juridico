import { useEffect } from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { ApplicantsPage } from './pages/ApplicantsPage.jsx';
import { AssistantPage } from './pages/AssistantPage.jsx';
import { CatalogsPage } from './pages/CatalogsPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PendingModulePage } from './pages/PendingModulePage.jsx';
import { RequestsPage } from './pages/RequestsPage.jsx';
import { navigate, usePathname } from './router.js';

function LoadingScreen() {
  return <div className="splash" aria-live="polite"><div className="brand-mark">CC</div><span>Preparando el consultorio…</span></div>;
}

const pages = {
  '/': <DashboardPage />,
  '/asistente': <AssistantPage />,
  '/solicitantes': <ApplicantsPage />,
  '/catalogos': <CatalogsPage />,
  '/solicitudes': <RequestsPage />,
  '/casos': <PendingModulePage eyebrow="ASESORÍAS" title="Casos de asesoría" description="Conversión, asignación y seguimiento de las solicitudes aprobadas." />,
  '/asignaciones': <PendingModulePage eyebrow="EQUIPO" title="Asignaciones" description="Vinculación de docentes y estudiantes responsables de cada caso." />,
  '/sesiones': <PendingModulePage eyebrow="SEGUIMIENTO" title="Sesiones y compromisos" description="Registro de reuniones, actividades, acuerdos y fechas de cumplimiento." />,
  '/documentos': <PendingModulePage eyebrow="ARCHIVO" title="Documentos" description="Carga, versionado y consulta de soportes asociados a los casos." />,
  '/notificaciones': <PendingModulePage eyebrow="COMUNICACIONES" title="Notificaciones" description="Alertas de asignaciones, compromisos y cambios relevantes del proceso." />,
  '/reportes': <PendingModulePage eyebrow="ANÁLISIS" title="Reportes" description="Indicadores operativos y resultados del consultorio por periodo y área." />,
  '/usuarios': <PendingModulePage eyebrow="ADMINISTRACIÓN" title="Usuarios y roles" description="Gestión de cuentas, perfiles y permisos del sistema." />,
  '/auditoria': <PendingModulePage eyebrow="CONTROL" title="Auditoría" description="Trazabilidad de accesos y operaciones sensibles realizadas en la plataforma." />,
};

export function App() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const knownPath = pathname === '/login' || Object.hasOwn(pages, pathname);
  const canUseAssistant = user?.roles?.some((role) => ['ADMIN', 'COORDINADORA', 'JEFE_PROGRAMA'].includes(role));

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') navigate('/login', { replace: true });
    if (user && (pathname === '/login' || !knownPath)) navigate('/', { replace: true });
    if (user && pathname === '/asistente' && !canUseAssistant) navigate('/', { replace: true });
  }, [canUseAssistant, knownPath, loading, pathname, user]);

  if (loading) return <LoadingScreen />;
  if (!user) return pathname === '/login' ? <LoginPage /> : null;

  return <AppLayout pathname={pathname}>{pages[pathname] || pages['/']}</AppLayout>;
}
