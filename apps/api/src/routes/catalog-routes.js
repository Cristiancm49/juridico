import { authenticate, requirePermission } from '../auth.js';
import { query } from '../db.js';

export async function catalogRoutes(app) {
  app.get(
    '/legal-areas',
    { preHandler: [authenticate, requirePermission('requests.read')] },
    async () => {
      const result = await query(
        `SELECT id, code, name, description, active, sort_order AS "sortOrder"
         FROM legal_areas
         ORDER BY active DESC, sort_order, name`,
      );
      return { legalAreas: result.rows };
    },
  );

  app.get(
    '/priorities',
    { preHandler: [authenticate, requirePermission('requests.read')] },
    async () => {
      const result = await query(
        `SELECT id, code, name, level, color, active
         FROM priorities
         ORDER BY active DESC, level`,
      );
      return { priorities: result.rows };
    },
  );

  app.get(
    '/request-statuses',
    { preHandler: [authenticate, requirePermission('requests.read')] },
    async () => {
      const result = await query(
        `SELECT id, code, name, description, color, sort_order AS "sortOrder", terminal
         FROM request_statuses
         ORDER BY sort_order, name`,
      );
      return { requestStatuses: result.rows };
    },
  );
}
