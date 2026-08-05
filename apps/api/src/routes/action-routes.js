import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { query, withTransaction } from '../db.js';

const actionProperties = {
  actionTypeId: { type: 'string', format: 'uuid' },
  title: { type: 'string', minLength: 5, maxLength: 180 },
  description: { type: 'string', minLength: 10, maxLength: 5000 },
  result: { type: 'string', maxLength: 2000 },
  occurredAt: { type: 'string', format: 'date-time' },
};

const selectAction = `
  SELECT
    a.id,
    a.title,
    a.description,
    a.result,
    a.occurred_at AS "occurredAt",
    a.created_at AS "createdAt",
    a.updated_at AS "updatedAt",
    json_build_object('id', at.id, 'code', at.code, 'name', at.name, 'color', at.color) AS "actionType",
    CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) END AS author
  FROM legal_actions a
  JOIN action_types at ON at.id = a.action_type_id
  LEFT JOIN users u ON u.id = a.created_by`;

function expectedError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanOptional(value) {
  if (value === undefined) return undefined;
  const cleaned = value.trim();
  return cleaned || null;
}

function cleanRequired(value, minimum, label) {
  const cleaned = value.trim();
  if (cleaned.length < minimum) throw expectedError(`${label} no tiene la longitud mínima requerida.`);
  return cleaned;
}

async function ensureEditableCase(client, caseId) {
  const result = await client.query(
    `SELECT cs.code AS "statusCode"
     FROM cases c
     JOIN case_statuses cs ON cs.id = c.status_id
     WHERE c.id = $1
     FOR UPDATE`,
    [caseId],
  );
  if (result.rowCount === 0) throw expectedError('Expediente no encontrado.', 404);
  if (result.rows[0].statusCode === 'archived') {
    throw expectedError('No se pueden modificar actuaciones de un expediente archivado.');
  }
}

export async function actionRoutes(app) {
  app.get(
    '/:caseId/actions',
    {
      preHandler: [authenticate, requirePermission('cases.read')],
      schema: {
        params: { type: 'object', required: ['caseId'], properties: { caseId: { type: 'string', format: 'uuid' } } },
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 10, maximum: 100, default: 50 },
            typeCode: { type: 'string', maxLength: 40 },
          },
        },
      },
    },
    async (request, reply) => {
      const caseResult = await query('SELECT id FROM cases WHERE id = $1', [request.params.caseId]);
      if (caseResult.rowCount === 0) return reply.code(404).send({ message: 'Expediente no encontrado.' });
      const { page = 1, limit = 50, typeCode } = request.query;
      const values = [request.params.caseId];
      let typeCondition = '';
      if (typeCode) {
        values.push(typeCode);
        typeCondition = `AND at.code = $${values.length}`;
      }
      const countValues = [...values];
      values.push(limit, (page - 1) * limit);
      const [itemsResult, countResult] = await Promise.all([
        query(
          `${selectAction}
           WHERE a.case_id = $1 ${typeCondition}
           ORDER BY a.occurred_at DESC, a.created_at DESC
           LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        ),
        query(
          `SELECT COUNT(*)::int AS total
           FROM legal_actions a
           JOIN action_types at ON at.id = a.action_type_id
           WHERE a.case_id = $1 ${typeCondition}`,
          countValues,
        ),
      ]);
      return {
        actions: itemsResult.rows,
        pagination: { page, limit, total: countResult.rows[0].total },
      };
    },
  );

  app.post(
    '/:caseId/actions',
    {
      preHandler: [authenticate, requirePermission('actions.write')],
      schema: {
        params: { type: 'object', required: ['caseId'], properties: { caseId: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['actionTypeId', 'title', 'description', 'occurredAt'],
          properties: actionProperties,
        },
      },
    },
    async (request, reply) => {
      const title = cleanRequired(request.body.title, 5, 'El título');
      const description = cleanRequired(request.body.description, 10, 'La descripción');
      const id = await withTransaction(async (client) => {
        await ensureEditableCase(client, request.params.caseId);
        const typeResult = await client.query('SELECT id FROM action_types WHERE id = $1 AND active = TRUE', [request.body.actionTypeId]);
        if (typeResult.rowCount === 0) throw expectedError('El tipo de actuación no existe o está inactivo.');
        const result = await client.query(
          `INSERT INTO legal_actions
            (case_id, action_type_id, title, description, result, occurred_at, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
           RETURNING id`,
          [
            request.params.caseId,
            request.body.actionTypeId,
            title,
            description,
            cleanOptional(request.body.result) ?? null,
            request.body.occurredAt,
            request.user.id,
          ],
        );
        await writeAudit(client, request, {
          action: 'legal_action.create',
          entityType: 'legal_action',
          entityId: result.rows[0].id,
          details: { caseId: request.params.caseId, actionTypeId: request.body.actionTypeId },
        });
        return result.rows[0].id;
      });
      const result = await query(`${selectAction} WHERE a.id = $1`, [id]);
      return reply.code(201).send({ action: result.rows[0] });
    },
  );

  app.patch(
    '/:caseId/actions/:actionId',
    {
      preHandler: [authenticate, requirePermission('actions.write')],
      schema: {
        params: {
          type: 'object',
          required: ['caseId', 'actionId'],
          properties: {
            caseId: { type: 'string', format: 'uuid' },
            actionId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: actionProperties,
        },
      },
    },
    async (request, reply) => {
      if (request.body.title !== undefined) cleanRequired(request.body.title, 5, 'El título');
      if (request.body.description !== undefined) cleanRequired(request.body.description, 10, 'La descripción');
      await withTransaction(async (client) => {
        await ensureEditableCase(client, request.params.caseId);
        const existing = await client.query(
          'SELECT id FROM legal_actions WHERE id = $1 AND case_id = $2 FOR UPDATE',
          [request.params.actionId, request.params.caseId],
        );
        if (existing.rowCount === 0) throw expectedError('Actuación no encontrada.', 404);
        if (request.body.actionTypeId) {
          const typeResult = await client.query('SELECT id FROM action_types WHERE id = $1 AND active = TRUE', [request.body.actionTypeId]);
          if (typeResult.rowCount === 0) throw expectedError('El tipo de actuación no existe o está inactivo.');
        }
        const columns = {
          actionTypeId: 'action_type_id',
          title: 'title',
          description: 'description',
          result: 'result',
          occurredAt: 'occurred_at',
        };
        const values = [];
        const sets = [];
        for (const [key, column] of Object.entries(columns)) {
          if (request.body[key] === undefined) continue;
          const value = key === 'result'
            ? cleanOptional(request.body[key])
            : typeof request.body[key] === 'string' ? request.body[key].trim() : request.body[key];
          values.push(value);
          sets.push(`${column} = $${values.length}`);
        }
        values.push(request.user.id, request.params.actionId);
        await client.query(
          `UPDATE legal_actions
           SET ${sets.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
           WHERE id = $${values.length}`,
          values,
        );
        await writeAudit(client, request, {
          action: 'legal_action.update',
          entityType: 'legal_action',
          entityId: request.params.actionId,
          details: { caseId: request.params.caseId, changedFields: Object.keys(request.body) },
        });
      });
      const result = await query(`${selectAction} WHERE a.id = $1`, [request.params.actionId]);
      return reply.send({ action: result.rows[0] });
    },
  );
}
