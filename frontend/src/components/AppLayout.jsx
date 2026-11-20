import { BarChart3, Bell, BookUser, Bot, BriefcaseBusiness, ClipboardList, FileText, LayoutDashboard, ListTree, LogOut, Menu, ScrollText, UserCheck, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext.jsx';
import { navigate } from '../router.js';

export function AppLayout({ children, pathname }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeMenu = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', closeMenu);
    return () => window.removeEventListener('keydown', closeMenu);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.message);
    }
  }

  const canUseAssistant = user.roles.some((role) => ['ADMIN', 'COORDINADORA', 'JEFE_PROGRAMA'].includes(role));
  const nav = [
    { to: '/', label: 'Resumen', icon: LayoutDashboard },
    ...(canUseAssistant ? [{ to: '/asistente', label: 'Asistente de casos', icon: Bot }] : []),
    { to: '/solicitantes', label: 'Solicitantes', icon: BookUser },
    { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardList },
    { to: '/casos', label: 'Casos de asesoría', icon: BriefcaseBusiness },
    { to: '/asignaciones', label: 'Asignaciones', icon: UserCheck },
    { to: '/sesiones', label: 'Sesiones y compromisos', icon: ListTree },
    { to: '/documentos', label: 'Documentos', icon: FileText },
    { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
    { to: '/reportes', label: 'Reportes', icon: BarChart3 },
    { to: '/catalogos', label: 'Catálogos', icon: ListTree },
    { to: '/usuarios', label: 'Usuarios y roles', icon: Users },
    { to: '/auditoria', label: 'Auditoría', icon: ScrollText },
  ];

  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button>
      {open && <button className="backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head">
          <div className="brand-lockup">
            <div className="brand-mark">CC</div>
            <div><strong>Consultorio Contable</strong><span>Universidad de la Amazonia</span></div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>

        <nav className="primary-nav" aria-label="Navegación principal">
          {nav.map(({ to, label, icon: Icon }) => (
            <a key={to} href={to} className={pathname === to ? 'active' : ''} onClick={(event) => { event.preventDefault(); navigate(to); setOpen(false); }}>
              <Icon size={19} /> <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{user.fullName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
          <div className="user-copy"><strong>{user.fullName}</strong><span>{user.roles.join(' · ')}</span></div>
          <button className="icon-button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><span className="eyebrow">ASESORÍA Y APOYO CONTABLE</span><strong>Gestión integral del consultorio</strong></div>
          <div className="topbar-actions">
            <div className="topbar-user"><strong>{user.fullName}</strong><span>{user.roles.join(' · ')}</span></div>
            <button className="logout-button" onClick={handleLogout} aria-label="Cerrar sesión"><LogOut size={17} /><span>Cerrar sesión</span></button>
          </div>
        </header>
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}
