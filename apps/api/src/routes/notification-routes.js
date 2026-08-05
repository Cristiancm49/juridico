import { authenticate, requirePermission } from '../auth.js';
import { query } from '../db.js';

export async function notificationRoutes(app) {
  app.get(
    '/',
    {
      preHandler: [authenticate, requirePermission('tasks.read')],
      schema: { querystring: { type: 'object', additionalProperties: false, properties: { limit: { type: 'integer', minimum: 10, maximum: 50, default: 20 } } } },
    },
    async (request) => {
      const limit = request.query.limit || 20;
      const [itemsResult, countResult] = await Promise.all([
        query(
          `SELECT n.id, n.alert_code AS "alertCode", n.title, n.message, n.read_at AS "readAt", n.created_at AS "createdAt",
                  json_build_object('id', t.id, 'title', t.title, 'dueAt', t.due_at) AS task,
                  json_build_object('id', c.id, 'caseNumber', c.case_number) AS case
           FROM notifications n
           JOIN tasks t ON t.id = n.task_id
           JOIN cases c ON c.id = t.case_id
           WHERE n.user_id = $1
           ORDER BY n.read_at NULLS FIRST, n.created_at DESC
           LIMIT $2`,
          [request.user.id, limit],
        ),
        query('SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1 AND read_at IS NULL', [request.user.id]),
      ]);
      return { notifications: itemsResult.rows, unread: countResult.rows[0].total };
    },
  );

  app.patch(
    '/:id/read',
    {
      preHandler: [authenticate, requirePermission('tasks.read')],
      schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } },
    },
    async (request, reply) => {
      const result = await query(
        'UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = $1 AND user_id = $2 RETURNING id',
        [request.params.id, request.user.id],
      );
      if (result.rowCount === 0) return reply.code(404).send({ message: 'Notificación no encontrada.' });
      return reply.send({ message: 'Notificación marcada como leída.' });
    },
  );

  app.post(
    '/read-all',
    { preHandler: [authenticate, requirePermission('tasks.read')] },
    async (request) => {
      const result = await query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [request.user.id]);
      return { updated: result.rowCount };
    },
  );
}
