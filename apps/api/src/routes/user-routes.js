import argon2 from 'argon2';
import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { query, withTransaction } from '../db.js';
import { isStrongEnoughPassword, normalizeEmail } from '../security.js';

const userBody = {
  type: 'object',
  additionalProperties: false,
  required: ['fullName', 'email', 'password', 'roleIds'],
  properties: {
    fullName: { type: 'string', minLength: 3, maxLength: 150 },
    email: { type: 'string', format: 'email', maxLength: 254 },
    password: { type: 'string', minLength: 10, maxLength: 200 },
    roleIds: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', format: 'uuid' } },
  },
};

export async function userRoutes(app) {
  app.get(
    '/',
    { preHandler: [authenticate, requirePermission('users.read')] },
    async () => {
      const result = await query(`
        SELECT
          u.id,
          u.email,
          u.full_name AS "fullName",
          u.active,
          u.must_change_password AS "mustChangePassword",
          u.last_login_at AS "lastLoginAt",
          u.created_at AS "createdAt",
          COALESCE(
            json_agg(json_build_object('id', r.id, 'code', r.code, 'name', r.name))
              FILTER (WHERE r.id IS NOT NULL),
            '[]'
          ) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        GROUP BY u.id
        ORDER BY u.active DESC, u.full_name ASC
      `);
      return { users: result.rows };
    },
  );

  app.post(
    '/',
    {
      preHandler: [authenticate, requirePermission('users.manage')],
      schema: { body: userBody },
    },
    async (request, reply) => {
      const { fullName, password, roleIds } = request.body;
      if (!isStrongEnoughPassword(password)) {
        return reply.code(400).send({ message: 'La contraseña debe contener al menos 10 caracteres.' });
      }
      const email = normalizeEmail(request.body.email);
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

      const created = await withTransaction(async (client) => {
        const roles = await client.query('SELECT id FROM roles WHERE id = ANY($1::uuid[])', [roleIds]);
        if (roles.rowCount !== roleIds.length) {
          const error = new Error('Uno o más roles no existen.');
          error.statusCode = 400;
          throw error;
        }

        const userResult = await client.query(
          `INSERT INTO users (email, full_name, password_hash, must_change_password)
           VALUES ($1, $2, $3, TRUE)
           RETURNING id, email, full_name AS "fullName", active, created_at AS "createdAt"`,
          [email, fullName.trim(), passwordHash],
        );
        const user = userResult.rows[0];
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           SELECT $1, UNNEST($2::uuid[])`,
          [user.id, roleIds],
        );
        await writeAudit(client, request, {
          action: 'user.create',
          entityType: 'user',
          entityId: user.id,
          details: { email, roleIds },
        });
        return user;
      });

      return reply.code(201).send({ user: created });
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [authenticate, requirePermission('users.manage')],
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            fullName: { type: 'string', minLength: 3, maxLength: 150 },
            email: { type: 'string', format: 'email', maxLength: 254 },
            password: { type: 'string', minLength: 10, maxLength: 200 },
            active: { type: 'boolean' },
            roleIds: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', format: 'uuid' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const changes = request.body;
      if (id === request.user.id && (changes.active === false || changes.roleIds)) {
        return reply.code(400).send({
          message: 'No puedes desactivar tu propia cuenta ni cambiar tus propios roles.',
        });
      }
      const updated = await withTransaction(async (client) => {
        const existing = await client.query('SELECT id FROM users WHERE id = $1', [id]);
        if (existing.rowCount === 0) {
          const error = new Error('Usuario no encontrado.');
          error.statusCode = 404;
          throw error;
        }

        const sets = [];
        const values = [];
        const add = (sql, value) => {
          values.push(value);
          sets.push(`${sql} = $${values.length}`);
        };
        if (changes.fullName !== undefined) add('full_name', changes.fullName.trim());
        if (changes.email !== undefined) add('email', normalizeEmail(changes.email));
        if (changes.active !== undefined) add('active', changes.active);
        if (changes.password !== undefined) {
          add('password_hash', await argon2.hash(changes.password, { type: argon2.argon2id }));
          sets.push('must_change_password = TRUE');
        }
        if (sets.length) {
          values.push(id);
          await client.query(
            `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
            values,
          );
        }

        if (changes.roleIds) {
          const roles = await client.query('SELECT id FROM roles WHERE id = ANY($1::uuid[])', [changes.roleIds]);
          if (roles.rowCount !== changes.roleIds.length) {
            const error = new Error('Uno o más roles no existen.');
            error.statusCode = 400;
            throw error;
          }
          await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
          await client.query(
            `INSERT INTO user_roles (user_id, role_id)
             SELECT $1, UNNEST($2::uuid[])`,
            [id, changes.roleIds],
          );
        }

        if (changes.active === false) {
          await client.query('DELETE FROM sessions WHERE user_id = $1', [id]);
        }

        await writeAudit(client, request, {
          action: 'user.update',
          entityType: 'user',
          entityId: id,
          details: { changedFields: Object.keys(changes).filter((key) => key !== 'password') },
        });
        if (changes.password !== undefined) {
          await writeAudit(client, request, {
            action: 'user.password_reset',
            entityType: 'user',
            entityId: id,
          });
        }

        const result = await client.query(
          `SELECT id, email, full_name AS "fullName", active, updated_at AS "updatedAt"
           FROM users WHERE id = $1`,
          [id],
        );
        return result.rows[0];
      });

      return reply.send({ user: updated });
    },
  );
}
