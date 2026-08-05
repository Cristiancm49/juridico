import argon2 from 'argon2';
import { config, SESSION_COOKIE } from '../config.js';
import { authenticate } from '../auth.js';
import { query, withTransaction } from '../db.js';
import { writeAudit } from '../audit.js';
import {
  createSessionToken,
  hashSessionToken,
  isStrongEnoughPassword,
  normalizeEmail,
} from '../security.js';

const loginSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      password: { type: 'string', minLength: 1, maxLength: 200 },
    },
  },
};

export async function authRoutes(app) {
  app.post('/login', {
    schema: loginSchema,
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const email = normalizeEmail(request.body.email);
    const result = await query(
      `SELECT id, email, full_name AS "fullName", password_hash AS "passwordHash"
       FROM users
       WHERE LOWER(email) = $1 AND active = TRUE`,
      [email],
    );

    const user = result.rows[0];
    const valid = user ? await argon2.verify(user.passwordHash, request.body.password) : false;
    if (!valid) {
      return reply.code(401).send({ message: 'Correo o contraseña incorrectos.' });
    }

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + config.sessionHours * 60 * 60 * 1000);

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO sessions
          (user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, tokenHash, expiresAt, request.ip, request.headers['user-agent'] || null],
      );
      await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      await writeAudit(client, request, {
        userId: user.id,
        action: 'auth.login',
        entityType: 'user',
        entityId: user.id,
      });
    });

    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      expires: expiresAt,
    });

    return { user: { id: user.id, email: user.email, fullName: user.fullName } };
  });

  app.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const rawToken = request.cookies[SESSION_COOKIE];
    await withTransaction(async (client) => {
      await client.query('DELETE FROM sessions WHERE token_hash = $1', [hashSessionToken(rawToken)]);
      await writeAudit(client, request, {
        action: 'auth.logout',
        entityType: 'user',
        entityId: request.user.id,
      });
    });
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.post(
    '/change-password',
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 1, maxLength: 200 },
            newPassword: { type: 'string', minLength: 10, maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body;
      if (!isStrongEnoughPassword(newPassword)) {
        return reply.code(400).send({
          message: 'La nueva contraseña debe contener al menos 10 caracteres.',
        });
      }
      if (currentPassword === newPassword) {
        return reply.code(400).send({
          message: 'La nueva contraseña debe ser diferente de la actual.',
        });
      }

      const result = await query(
        'SELECT password_hash AS "passwordHash" FROM users WHERE id = $1 AND active = TRUE',
        [request.user.id],
      );
      const valid = result.rows[0]
        ? await argon2.verify(result.rows[0].passwordHash, currentPassword)
        : false;
      if (!valid) {
        return reply.code(400).send({ message: 'La contraseña actual no es correcta.' });
      }

      const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
      const currentTokenHash = hashSessionToken(request.cookies[SESSION_COOKIE]);
      await withTransaction(async (client) => {
        await client.query(
        `UPDATE users
         SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
         WHERE id = $2`,
          [passwordHash, request.user.id],
        );
        await client.query(
          'DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2',
          [request.user.id, currentTokenHash],
        );
        await writeAudit(client, request, {
          action: 'auth.password_change',
          entityType: 'user',
          entityId: request.user.id,
        });
      });

      return { ok: true };
    },
  );

  app.get('/me', { preHandler: [authenticate] }, async (request) => ({ user: request.user }));

}
