import { useEffect } from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { AuditPage } from './pages/AuditPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RolesPage } from './pages/RolesPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { navigate, usePathname } from './router.js';

function LoadingScreen() {
  return (
    <div className="splash" aria-live="polite">
      <div className="brand-mark">LD</div>
      <span>Preparando tu escritorio…</span>
    </div>
  );
}

export function App() {
  const { user, loading, can } = useAuth();
  const pathname = usePathname();

  const routePermissions = {
    '/usuarios': 'users.read',
    '/roles': 'roles.manage',
    '/auditoria': 'audit.read',
  };
  const requiredPermission = routePermissions[pathname];
  const accessDenied = Boolean(requiredPermission && !can(requiredPermission));

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') navigate('/login', { replace: true });
    if (user && pathname === '/login') navigate('/', { replace: true });
    if (user && accessDenied) navigate('/', { replace: true });
  }, [accessDenied, loading, pathname, user]);

  if (loading) return <LoadingScreen />;
  if (!user) return pathname === '/login' ? <LoginPage /> : null;

  const pages = {
    '/': <DashboardPage />,
    '/usuarios': <UsersPage />,
    '/roles': <RolesPage />,
    '/auditoria': <AuditPage />,
  };
  return (
    <AppLayout pathname={accessDenied ? '/' : pathname}>
      {accessDenied ? pages['/'] : pages[pathname] || pages['/']}
    </AppLayout>
  );
}
