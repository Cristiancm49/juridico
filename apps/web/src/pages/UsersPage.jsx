import { Edit3, KeyRound, Plus, RefreshCw, Search, UserCheck, UserX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { fullName: '', email: '', password: '', roleIds: [] };

export function UsersPage() {
  const { can, user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        apiFetch('/api/v1/users'),
        apiFetch('/api/v1/roles'),
      ]);
      setUsers(usersData.users);
      setRoles(rolesData.roles);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      `${user.fullName} ${user.email} ${user.roles.map((role) => role.name).join(' ')}`
        .toLowerCase()
        .includes(term),
    );
  }, [search, users]);

  const editingSelf = modalMode === 'edit' && editingUser?.id === currentUser.id;

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setModalMode('create');
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      roleIds: user.roles.map((role) => role.id),
    });
    setModalMode('edit');
  }

  function closeModal() {
    if (saving) return;
    setModalMode(null);
    setEditingUser(null);
    setForm(emptyForm);
  }

  function toggleRole(roleId) {
    if (editingSelf) return;
    setForm((value) => ({
      ...value,
      roleIds: value.roleIds.includes(roleId)
        ? value.roleIds.filter((id) => id !== roleId)
        : [...value.roleIds, roleId],
    }));
  }

  async function saveUser(event) {
    event.preventDefault();
    if (!editingSelf && form.roleIds.length === 0) {
      toast.error('Selecciona al menos un rol.');
      return;
    }
    if (modalMode === 'create' && form.password.length < 10) {
      toast.error('La contraseña temporal debe contener al menos 10 caracteres.');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await apiFetch('/api/v1/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Usuario creado correctamente.');
      } else {
        const payload = {
          fullName: form.fullName,
          email: form.email,
        };
        if (!editingSelf) payload.roleIds = form.roleIds;
        if (!editingSelf && form.password) payload.password = form.password;

        await apiFetch(`/api/v1/users/${editingUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (editingSelf) await refreshUser();
        toast.success('Usuario actualizado correctamente.');
      }

      setModalMode(null);
      setEditingUser(null);
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(user, active) {
    const action = active ? 'activar' : 'desactivar';
    if (!window.confirm(`¿Deseas ${action} a ${user.fullName}?`)) return;
    try {
      await apiFetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      toast.success(`Usuario ${active ? 'activado' : 'desactivado'}.`);
      await loadData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEGURIDAD</span>
          <h1>Usuarios</h1>
          <p>Controla quién puede ingresar y qué rol tiene asignado.</p>
        </div>
        {can('users.manage') && (
          <button className="primary-button" onClick={openCreate}>
            <Plus size={18} /> Nuevo usuario
          </button>
        )}
      </div>

      <article className="panel table-panel">
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo o rol"
            />
          </label>
          <button className="secondary-button" onClick={loadData} disabled={loading}>
            <RefreshCw size={17} /> Actualizar
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuario</th><th>Roles</th><th>Estado</th><th>Último acceso</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="person-cell">
                      <div className="avatar small">{user.fullName.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <strong>{user.fullName}{user.id === currentUser.id && <small className="self-label">Tú</small>}</strong>
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="tag-list">
                      {user.roles.map((role) => <span className="tag" key={role.id}>{role.name}</span>)}
                    </div>
                  </td>
                  <td>
                    <div className="user-statuses">
                      <span className={`state ${user.active ? 'active' : 'inactive'}`}>{user.active ? 'Activo' : 'Inactivo'}</span>
                      {user.mustChangePassword && <span className="password-pending">Clave temporal</span>}
                    </div>
                  </td>
                  <td>
                    {user.lastLoginAt
                      ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(user.lastLoginAt))
                      : 'Sin ingreso'}
                  </td>
                  <td className="actions-cell">
                    {can('users.manage') && (
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => openEdit(user)} title="Editar usuario" aria-label={`Editar a ${user.fullName}`}>
                          <Edit3 size={18} />
                        </button>
                        {user.id !== currentUser.id && (
                          <button className="icon-button" onClick={() => setActive(user, !user.active)} title={user.active ? 'Desactivar' : 'Activar'} aria-label={user.active ? 'Desactivar usuario' : 'Activar usuario'}>
                            {user.active ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="5" className="empty-cell">No hay usuarios que coincidan con la búsqueda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {modalMode && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <form className="modal-card" onSubmit={saveUser}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">{modalMode === 'create' ? 'NUEVA CUENTA' : 'GESTIÓN DE USUARIO'}</span>
                <h2>{modalMode === 'create' ? 'Crear usuario' : 'Editar usuario'}</h2>
              </div>
              <button type="button" className="icon-button" onClick={closeModal} aria-label="Cerrar"><X /></button>
            </div>

            <div className="form-grid">
              <label className="full">
                Nombre completo
                <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required minLength="3" autoFocus />
              </label>
              <label>
                Correo
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              </label>
              {modalMode === 'create' ? (
                <label>
                  Contraseña temporal
                  <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength="10" autoComplete="new-password" />
                </label>
              ) : !editingSelf ? (
                <label>
                  Nueva contraseña <small className="optional-label">Opcional</small>
                  <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength="10" autoComplete="new-password" placeholder="Dejar vacía para conservarla" />
                </label>
              ) : (
                <div className="inline-note">
                  <KeyRound size={18} />
                  <span>Tu contraseña se cambia desde el botón de llave junto a tu perfil.</span>
                </div>
              )}
            </div>

            <fieldset>
              <legend>Roles</legend>
              {editingSelf && <p className="fieldset-help">Por seguridad no puedes modificar tus propios roles.</p>}
              <div className="role-options">
                {roles.map((role) => (
                  <label className={`check-card ${editingSelf ? 'disabled' : ''}`} key={role.id}>
                    <input
                      type="checkbox"
                      checked={form.roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      disabled={editingSelf}
                    />
                    <span><strong>{role.name}</strong><small>{role.description}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button>
              <button className="primary-button" disabled={saving}>
                {saving ? 'Guardando…' : modalMode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
