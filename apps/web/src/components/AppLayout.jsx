import { BarChart3, Bell, BookUser, BriefcaseBusiness, ClipboardList, KeyRound, LayoutDashboard, ListTodo, ListTree, LogOut, Menu, ScrollText, ShieldCheck, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { navigate } from '../router.js';
import { ChangePasswordModal } from './ChangePasswordModal.jsx';

export function AppLayout({ children, pathname }) {
  const { user, logout, refreshUser, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const canReadTasks = can('tasks.read');

  useEffect(() => {
    if (user.mustChangePassword) setPasswordOpen(true);
  }, [user.mustChangePassword]);

  useEffect(() => {
    if (!canReadTasks) return undefined;
    let active = true;
    async function load() {
      try {
        const data = await apiFetch('/api/v1/notifications?limit=20');
        if (active) {
          setNotifications(data.notifications);
          setUnread(data.unread);
        }
      } catch {
        // La siguiente consulta periódica reintenta sin interrumpir el trabajo del usuario.
      }
    }
    load();
    const timer = window.setInterval(load, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [canReadTasks, user.id]);

  async function refreshNotifications() {
    const data = await apiFetch('/api/v1/notifications?limit=20');
    setNotifications(data.notifications);
    setUnread(data.unread);
  }

  async function openNotification(notification) {
    try {
      if (!notification.readAt) await apiFetch(`/api/v1/notifications/${notification.id}/read`, { method: 'PATCH' });
      await refreshNotifications();
      setNotificationOpen(false);
      navigate('/tareas');
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function markAllRead() {
    try {
      await apiFetch('/api/v1/notifications/read-all', { method: 'POST' });
      await refreshNotifications();
    } catch (error) {
      toast.error(error.message);
    }
  }

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
    { to: '/personas', label: 'Personas y clientes', icon: BookUser, show: can('requests.read') },
    { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardList, show: can('requests.read') },
    { to: '/expedientes', label: 'Expedientes', icon: BriefcaseBusiness, show: can('cases.read') },
    { to: '/tareas', label: 'Tareas y vencimientos', icon: ListTodo, show: can('tasks.read') },
    { to: '/catalogos', label: 'Catálogos', icon: ListTree, show: can('requests.read') },
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
          <span className="nav-disabled"><BarChart3 size={19} /> Reportes</span>
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
          {canReadTasks && <div className="notification-wrap">
            <button className="notification-button" aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`} aria-expanded={notificationOpen} onClick={() => setNotificationOpen((value) => !value)}>
              <Bell size={20} />
              {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
            </button>
            {notificationOpen && <section className="notification-popover" aria-label="Centro de notificaciones">
              <div className="notification-head"><div><strong>Alertas</strong><span>{unread ? `${unread} sin leer` : 'Todo al día'}</span></div>{unread > 0 && <button type="button" onClick={markAllRead}>Marcar todas</button>}</div>
              <div className="notification-list">
                {notifications.map((notification) => <button type="button" className={`notification-item ${notification.readAt ? 'read' : ''}`} key={notification.id} onClick={() => openNotification(notification)}><i /><span><strong>{notification.title}</strong><small>{notification.message}</small><time>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt))}</time></span></button>)}
                {!notifications.length && <div className="notification-empty"><Bell size={22} /><span>No tienes alertas pendientes.</span></div>}
              </div>
            </section>}
          </div>}
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
