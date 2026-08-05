import { Bell, BriefcaseBusiness, FileText, KeyRound, LayoutDashboard, LogOut, Menu, ScrollText, ShieldCheck, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext.jsx';
import { navigate } from '../router.js';
import { ChangePasswordModal } from './ChangePasswordModal.jsx';

export function AppLayout({ children, pathname }) {
  const { user, logout, refreshUser, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (user.mustChangePassword) setPasswordOpen(true);
  }, [user.mustChangePassword]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.message);
    }
  }

  const nav = [
    { to: '/', label: 'Resumen', icon: LayoutDashboard, show: true, end: true },
    { to: '/usuarios', label: 'Usuarios', icon: Users, show: can('users.read') },
    { to: '/roles', label: 'Roles y permisos', icon: ShieldCheck, show: can('roles.manage') },
    { to: '/auditoria', label: 'Auditoría', icon: ScrollText, show: can('audit.read') },
  ];

  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menú">
        <Menu size={22} />
      </button>
      {open && <button className="backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head">
          <div className="brand-lockup">
            <div className="brand-mark">LD</div>
            <div><strong>LegalDesk</strong><span>Gestión jurídica</span></div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Navegación principal">
          {nav.filter((item) => item.show).map(({ to, label, icon: Icon, end }) => (
            <a
              key={to}
              href={to}
              className={pathname === to ? 'active' : ''}
              onClick={(event) => { event.preventDefault(); navigate(to); setOpen(false); }}
            >
              <Icon size={19} /> <span>{label}</span>
            </a>
          ))}
          <div className="nav-divider">Próximamente</div>
          <span className="nav-disabled"><BriefcaseBusiness size={19} /> Expedientes</span>
          <span className="nav-disabled"><FileText size={19} /> Documentos</span>
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{user.fullName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
          <div className="user-copy"><strong>{user.fullName}</strong><span>{user.email}</span></div>
          <button className="icon-button" onClick={() => setPasswordOpen(true)} aria-label="Cambiar contraseña" title="Cambiar contraseña"><KeyRound size={18} /></button>
          <button className="icon-button" onClick={handleLogout} aria-label="Cerrar sesión"><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">KAFA Y ASOCIADOS</span>
            <strong>Centro de gestión jurídica</strong>
          </div>
          <button className="notification-button" aria-label="Notificaciones" title="Las alertas se habilitarán en el sprint 5">
            <Bell size={20} />
            <span className="notification-dot" />
          </button>
        </header>
        <div className="page-container">{children}</div>
      </main>
      <ChangePasswordModal
        open={passwordOpen}
        required={user.mustChangePassword}
        onChanged={refreshUser}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
