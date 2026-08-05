import { authenticate, requirePermission } from '../auth.js';
import { query } from '../db.js';

export async function auditRoutes(app) {
  app.get(
    '/',
    {
      preHandler: [authenticate, requirePermission('audit.read')],
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 10, maximum: 100, default: 25 },
            action: { type: 'string', maxLength: 100 },
            search: { type: 'string', maxLength: 120 },
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request) => {
      const { page = 1, limit = 25, action, search, from, to } = request.query;
      const conditions = [];
      const values = [];
      const addCondition = (sql, value) => {
        values.push(value);
        conditions.push(sql.replace('?', `$${values.length}`));
      };

      if (action) addCondition('a.action = ?', action);
      if (search) {
        values.push(`%${search.trim()}%`);
        conditions.push(`(
          u.full_name ILIKE $${values.length}
          OR u.email ILIKE $${values.length}
          OR a.action ILIKE $${values.length}
          OR a.entity_id ILIKE $${values.length}
        )`);
      }
      if (from) addCondition('a.created_at >= ?::date', from);
      if (to) addCondition("a.created_at < (?::date + INTERVAL '1 day')", to);

      values.push(limit);
      const limitPosition = values.length;
      values.push((page - 1) * limit);
      const offsetPosition = values.length;
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [logsResult, actionsResult] = await Promise.all([
        query(
          `SELECT
             a.id,
             a.action,
             a.entity_type AS "entityType",
             a.entity_id AS "entityId",
             a.details,
             a.ip_address::text AS "ipAddress",
             a.user_agent AS "userAgent",
             a.created_at AS "createdAt",
             CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object(
               'id', u.id,
               'fullName', u.full_name,
               'email', u.email
             ) END AS actor,
             COUNT(*) OVER()::int AS total
           FROM audit_logs a
           LEFT JOIN users u ON u.id = a.user_id
           ${where}
           ORDER BY a.created_at DESC, a.id DESC
           LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
          values,
        ),
        query('SELECT DISTINCT action FROM audit_logs ORDER BY action'),
      ]);

      return {
        logs: logsResult.rows.map(({ total, ...log }) => log),
        pagination: {
          page,
          limit,
          total: logsResult.rows[0]?.total || 0,
        },
        actions: actionsResult.rows.map((row) => row.action),
      };
    },
  );
}

