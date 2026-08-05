import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { query, withTransaction } from '../db.js';

export async function roleRoutes(app) {
  app.get('/', { preHandler: [authenticate] }, async () => {
    const result = await query(`
      SELECT
        r.id,
        r.code,
        r.name,
        r.description,
        r.system_role AS "systemRole",
        COALESCE(
          json_agg(json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'module', p.module))
            FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id
      ORDER BY r.name
    `);
    return { roles: result.rows };
  });

  app.get(
    '/permissions',
    { preHandler: [authenticate, requirePermission('roles.manage')] },
    async () => {
      const result = await query('SELECT id, code, name, module FROM permissions ORDER BY module, name');
      return { permissions: result.rows };
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [authenticate, requirePermission('roles.manage')],
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'description', 'permissionCodes'],
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 80 },
            description: { type: 'string', maxLength: 240 },
            permissionCodes: {
              type: 'array',
              uniqueItems: true,
              items: { type: 'string', minLength: 3, maxLength: 80 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, description, permissionCodes } = request.body;
      const role = await withTransaction(async (client) => {
        const existing = await client.query('SELECT id, code FROM roles WHERE id = $1', [id]);
        if (existing.rowCount === 0) {
          const error = new Error('Rol no encontrado.');
          error.statusCode = 404;
          throw error;
        }
        if (
          existing.rows[0].code === 'administrator' &&
          (!permissionCodes.includes('users.manage') || !permissionCodes.includes('roles.manage'))
        ) {
          const error = new Error('El rol Administrador debe conservar la gestión de usuarios y roles.');
          error.statusCode = 400;
          throw error;
        }
        const permissions = await client.query(
          'SELECT id, code FROM permissions WHERE code = ANY($1::text[])',
          [permissionCodes],
        );
        if (permissions.rowCount !== permissionCodes.length) {
          const error = new Error('Uno o más permisos no existen.');
          error.statusCode = 400;
          throw error;
        }

        await client.query(
          'UPDATE roles SET name = $1, description = $2, updated_at = NOW() WHERE id = $3',
          [name.trim(), description.trim(), id],
        );
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
        if (permissionCodes.length) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             SELECT $1, id FROM permissions WHERE code = ANY($2::text[])`,
            [id, permissionCodes],
          );
        }
        await writeAudit(client, request, {
          action: 'role.update',
          entityType: 'role',
          entityId: id,
          details: { permissionCodes },
        });
        return { id, code: existing.rows[0].code, name, description, permissionCodes };
      });
      return reply.send({ role });
    },
  );
}
