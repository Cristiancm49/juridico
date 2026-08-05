import { Check, ChevronDown, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';

function RoleCard({ role, allPermissions, onSaved }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || '');
  const [selected, setSelected] = useState(role.permissions.map((permission) => permission.code));
  const [saving, setSaving] = useState(false);
  const grouped = useMemo(
    () => allPermissions.reduce((groups, permission) => {
      groups[permission.module] ||= [];
      groups[permission.module].push(permission);
      return groups;
    }, {}),
    [allPermissions],
  );

  function toggle(code) {
    setSelected((value) => value.includes(code) ? value.filter((item) => item !== code) : [...value, code]);
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/roles/${role.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description, permissionCodes: selected }),
      });
      toast.success(`Permisos de ${name} actualizados.`);
      await onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`role-card ${open ? 'expanded' : ''}`}>
      <button className="role-summary" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="role-icon"><ShieldCheck size={21} /></span>
        <span><strong>{role.name}</strong><small>{role.description}</small></span>
        <span className="permission-count">{role.permissions.length} permisos</span>
        <ChevronDown className="chevron" size={20} />
      </button>
      {open && (
        <div className="role-editor">
          <div className="form-grid">
            <label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          </div>
          <div className="permission-groups">
            {Object.entries(grouped).map(([module, permissions]) => (
              <fieldset key={module}>
                <legend>{module}</legend>
                {permissions.map((permission) => (
                  <label className="permission-row" key={permission.code}>
                    <input type="checkbox" checked={selected.includes(permission.code)} onChange={() => toggle(permission.code)} />
                    <span className="fake-checkbox"><Check size={14} /></span>
                    <span><strong>{permission.name}</strong><small>{permission.code}</small></span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="role-actions"><button className="primary-button" onClick={save} disabled={saving}><Save size={17} /> {saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
        </div>
      )}
    </article>
  );
}

export function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleData, permissionData] = await Promise.all([
        apiFetch('/api/v1/roles'),
        apiFetch('/api/v1/roles/permissions'),
      ]);
      setRoles(roleData.roles);
      setPermissions(permissionData.permissions);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section>
      <div className="page-heading"><div><span className="eyebrow">CONTROL DE ACCESO</span><h1>Roles y permisos</h1><p>Define con precisión qué puede hacer cada perfil dentro de LegalDesk.</p></div></div>
      <div className="info-banner"><ShieldCheck size={21} /><div><strong>La autorización siempre se comprueba en el servidor.</strong><span>Los cambios se aplican en la siguiente solicitud de cada usuario.</span></div></div>
      <div className="roles-list">
        {roles.map((role) => <RoleCard key={role.id} role={role} allPermissions={permissions} onSaved={load} />)}
        {loading && <div className="panel empty-cell">Cargando roles…</div>}
      </div>
    </section>
  );
}
