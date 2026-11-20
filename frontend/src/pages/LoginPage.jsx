import { ArrowRight, Calculator, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext.jsx';
import { navigate } from '../router.js';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  if (!loading && user) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Bienvenido al Consultorio Contable');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="story-content">
          <div className="brand-lockup brand-light"><div className="brand-mark">CC</div><strong>Consultorio Contable</strong></div>
          <div className="story-heading">
            <span className="eyebrow light">UNIVERSIDAD DE LA AMAZONIA</span>
            <h1>Asesoría contable organizada para empresas y comunidad universitaria.</h1>
            <p>Radicación, revisión y seguimiento de solicitudes en un solo espacio.</p>
          </div>
          <ul className="story-points">
            <li><CheckCircle2 size={18} /> Acceso controlado por roles</li>
            <li><CheckCircle2 size={18} /> Seguimiento claro de cada solicitud</li>
            <li><CheckCircle2 size={18} /> Información contable protegida</li>
          </ul>
        </div>
        <Calculator className="story-watermark" aria-hidden="true" />
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="mobile-brand"><div className="brand-mark">CC</div><strong>Consultorio Contable</strong></div>
          <span className="eyebrow">ACCESO AL SISTEMA</span>
          <h2>Bienvenido de nuevo</h2>
          <p className="muted">Ingresa con las credenciales asignadas por el administrador.</p>

          <label>
            Correo electrónico
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="admin@consultorio.local" />
          </label>
          <label>
            Contraseña
            <span className="password-field">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Tu contraseña" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button className="primary-button login-submit" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar'} <ArrowRight size={18} />
          </button>
          <small>Si no puedes ingresar, solicita al administrador que revise tu cuenta.</small>
        </form>
      </section>
    </main>
  );
}

