import { query } from './db.js';
import { SESSION_COOKIE } from './config.js';
import { hashSessionToken } from './security.js';

export async function authenticate(request, reply) {
  const rawToken = request.cookies[SESSION_COOKIE];
  if (!rawToken) {
    return reply.code(401).send({ message: 'Debes iniciar sesión.' });
  }

  const tokenHash = hashSessionToken(rawToken);
  const result = await query(
    `SELECT
       u.id,
       u.email,
       u.full_name AS "fullName",
       u.must_change_password AS "mustChangePassword",
       COALESCE(array_remove(array_agg(DISTINCT p.code), NULL), '{}') AS permissions
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN role_permissions rp ON rp.role_id = ur.role_id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND u.active = TRUE
     GROUP BY u.id, u.email, u.full_name, u.must_change_password`,
    [tokenHash],
  );

  if (result.rowCount === 0) {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.code(401).send({ message: 'La sesión terminó. Ingresa nuevamente.' });
  }

  request.user = result.rows[0];
  if (request.user.mustChangePassword) {
    const path = request.raw.url.split('?')[0];
    const allowed = new Set([
      '/api/v1/auth/me',
      '/api/v1/auth/logout',
      '/api/v1/auth/change-password',
    ]);
    if (!allowed.has(path)) {
      return reply.code(403).send({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Debes cambiar la contraseña temporal antes de continuar.',
      });
    }
  }
}

export function requirePermission(permission) {
  return async function checkPermission(request, reply) {
    if (!request.user?.permissions?.includes(permission)) {
      return reply.code(403).send({ message: 'No tienes permiso para realizar esta acción.' });
    }
  };
}
