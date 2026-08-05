import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';

const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmation: '',
};

export function ChangePasswordModal({ open, onClose, onChanged, required = false }) {
  const [form, setForm] = useState(emptyForm);
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setShowPasswords(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.newPassword.length < 10) {
      toast.error('La nueva contraseña debe contener al menos 10 caracteres.');
      return;
    }
    if (form.newPassword !== form.confirmation) {
      toast.error('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      toast.success('Contraseña actualizada. Las otras sesiones fueron cerradas.');
      await onChanged?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !required && onClose()}
    >
      <form className="modal-card password-modal" onSubmit={handleSubmit}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{required ? 'ACCIÓN REQUERIDA' : 'SEGURIDAD DE LA CUENTA'}</span>
            <h2>{required ? 'Crea tu contraseña personal' : 'Cambiar contraseña'}</h2>
          </div>
          {!required && (
            <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
              <X />
            </button>
          )}
        </div>

        <div className="security-note">
          <KeyRound size={20} />
          <p>
            {required
              ? 'La contraseña que recibiste es temporal. Debes reemplazarla para continuar usando LegalDesk.'
              : 'Usa al menos 10 caracteres. Al guardar se cerrarán tus demás sesiones abiertas.'}
          </p>
        </div>

        <label className="field-label">
          Contraseña actual
          <span className="password-field">
            <input
              type={showPasswords ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
              autoComplete="current-password"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPasswords((value) => !value)}
              aria-label={showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
            >
              {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        <div className="form-grid password-grid">
          <label>
            Nueva contraseña
            <input
              type={showPasswords ? 'text' : 'password'}
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
              autoComplete="new-password"
              minLength="10"
              required
            />
          </label>
          <label>
            Confirmar contraseña
            <input
              type={showPasswords ? 'text' : 'password'}
              value={form.confirmation}
              onChange={(event) => setForm({ ...form, confirmation: event.target.value })}
              autoComplete="new-password"
              minLength="10"
              required
            />
          </label>
        </div>

        <div className="modal-actions">
          {!required && <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>}
          <button className="primary-button" disabled={saving}>
            <KeyRound size={17} /> {saving ? 'Actualizando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}
