import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { query, withTransaction } from '../db.js';

const sources = ['in_person', 'phone', 'email', 'referral', 'other'];
const statusCodes = ['received', 'in_review', 'approved', 'rejected', 'converted'];
const allowedTransitions = {
  received: ['in_review', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved: ['in_review'],
  rejected: [],
  converted: [],
};

const requestProperties = {
  personId: { type: 'string', format: 'uuid' },
  legalAreaId: { type: 'string', format: 'uuid' },
  priorityId: { type: 'string', format: 'uuid' },
  subject: { type: 'string', minLength: 5, maxLength: 180 },
  description: { type: 'string', minLength: 10, maxLength: 5000 },
  source: { type: 'string', enum: sources },
  receivedDate: { type: 'string', format: 'date' },
};

const requestFrom = `
  FROM legal_requests lr
  JOIN people p ON p.id = lr.person_id
  JOIN legal_areas la ON la.id = lr.legal_area_id
  JOIN priorities pr ON pr.id = lr.priority_id
  JOIN request_statuses rs ON rs.id = lr.status_id`;

const selectRequest = `
  SELECT
    lr.id,
    lr.request_number AS "requestNumber",
    lr.subject,
    lr.description,
    lr.source,
    TO_CHAR(lr.received_date, 'YYYY-MM-DD') AS "receivedDate",
    lr.created_at AS "createdAt",
    lr.updated_at AS "updatedAt",
    json_build_object(
      'id', p.id,
      'fullName', p.full_name,
      'documentType', p.document_type,
      'documentNumber', p.document_number
    ) AS person,
    json_build_object('id', la.id, 'code', la.code, 'name', la.name) AS "legalArea",
    json_build_object('id', pr.id, 'code', pr.code, 'name', pr.name, 'level', pr.level, 'color', pr.color) AS priority,
    json_build_object('id', rs.id, 'code', rs.code, 'name', rs.name, 'color', rs.color, 'terminal', rs.terminal) AS status
  ${requestFrom}`;

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function validateReference(client, table, id, label) {
  const result = await client.query(`SELECT active FROM ${table} WHERE id = $1`, [id]);
  if (result.rowCount === 0 || !result.rows[0].active) {
    throw badRequest(`${label} no existe o está inactivo.`);
  }
}

async function getRequest(client, id) {
  const result = await client.query(`${selectRequest} WHERE lr.id = $1`, [id]);
  return result.rows[0] || null;
}

export async function requestRoutes(app) {
  app.get(
    '/',
    {
      preHandler: [authenticate, requirePermission('requests.read')],
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            search: { type: 'string', maxLength: 120 },
            status: { type: 'string', maxLength: 40 },
            legalAreaId: { type: 'string', format: 'uuid' },
            priorityId: { type: 'string', format: 'uuid' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 10, maximum: 100, default: 25 },
          },
        },
      },
    },
    async (request) => {
      const { search, status, legalAreaId, priorityId, page = 1, limit = 25 } = request.query;
      const conditions = [];
      const values = [];
      const add = (sql, value) => {
        values.push(value);
        conditions.push(sql.replace('?', `$${values.length}`));
      };

      if (search?.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(`(
          lr.request_number ILIKE $${values.length}
          OR lr.subject ILIKE $${values.length}
          OR p.full_name ILIKE $${values.length}
          OR p.document_number ILIKE $${values.length}
        )`);
      }
      if (status) add('rs.code = ?', status);
      if (legalAreaId) add('lr.legal_area_id = ?', legalAreaId);
      if (priorityId) add('lr.priority_id = ?', priorityId);

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const countValues = [...values];
      values.push(limit);
      const limitPosition = values.length;
      values.push((page - 1) * limit);
      const offsetPosition = values.length;
      const [itemsResult, countResult] = await Promise.all([
        query(
          `${selectRequest}
           ${where}
           ORDER BY lr.received_date DESC, lr.created_at DESC
           LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
          values,
        ),
        query(`SELECT COUNT(*)::int AS total ${requestFrom} ${where}`, countValues),
      ]);

      return {
        requests: itemsResult.rows,
        pagination: { page, limit, total: countResult.rows[0].total },
      };
    },
  );

  app.get(
    '/:id',
    {
      preHandler: [authenticate, requirePermission('requests.read')],
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      },
    },
    async (request, reply) => {
      const item = await getRequest({ query }, request.params.id);
      if (!item) return reply.code(404).send({ message: 'Solicitud no encontrada.' });
      const history = await query(
        `SELECT
           h.id,
           h.comment,
           h.created_at AS "createdAt",
           json_build_object('code', fs.code, 'name', fs.name) AS "fromStatus",
           json_build_object('code', ts.code, 'name', ts.name, 'color', ts.color) AS "toStatus",
           CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id', u.id, 'fullName', u.full_name) END AS actor
         FROM legal_request_status_history h
         LEFT JOIN request_statuses fs ON fs.id = h.from_status_id
         JOIN request_statuses ts ON ts.id = h.to_status_id
         LEFT JOIN users u ON u.id = h.changed_by
         WHERE h.request_id = $1
         ORDER BY h.created_at DESC, h.id DESC`,
        [request.params.id],
      );
      return { request: item, statusHistory: history.rows };
    },
  );

  app.post(
    '/',
    {
      preHandler: [authenticate, requirePermission('requests.write')],
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['personId', 'legalAreaId', 'priorityId', 'subject', 'description', 'source', 'receivedDate'],
          properties: requestProperties,
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const id = await withTransaction(async (client) => {
        await validateReference(client, 'people', body.personId, 'La persona');
        await validateReference(client, 'legal_areas', body.legalAreaId, 'El área jurídica');
        await validateReference(client, 'priorities', body.priorityId, 'La prioridad');
        const statusResult = await client.query("SELECT id FROM request_statuses WHERE code = 'received'");
        const numberResult = await client.query(
          "SELECT 'SOL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('legal_request_number_seq')::TEXT, 6, '0') AS number",
        );
        const result = await client.query(
          `INSERT INTO legal_requests
            (request_number, person_id, legal_area_id, priority_id, status_id, subject, description, source, received_date, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
           RETURNING id`,
          [
            numberResult.rows[0].number,
            body.personId,
            body.legalAreaId,
            body.priorityId,
            statusResult.rows[0].id,
            body.subject.trim(),
            body.description.trim(),
            body.source,
            body.receivedDate,
            request.user.id,
          ],
        );
        await client.query(
          `INSERT INTO legal_request_status_history (request_id, to_status_id, comment, changed_by)
           VALUES ($1, $2, 'Registro inicial de la solicitud.', $3)`,
          [result.rows[0].id, statusResult.rows[0].id, request.user.id],
        );
        await writeAudit(client, request, {
          action: 'request.create',
          entityType: 'legal_request',
          entityId: result.rows[0].id,
          details: { personId: body.personId, legalAreaId: body.legalAreaId, priorityId: body.priorityId },
        });
        return result.rows[0].id;
      });
      const item = await getRequest({ query }, id);
      return reply.code(201).send({ request: item });
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [authenticate, requirePermission('requests.write')],
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            ...requestProperties,
            statusCode: { type: 'string', enum: statusCodes },
            changeComment: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      await withTransaction(async (client) => {
        const existingResult = await client.query(
          `SELECT
             lr.id,
             lr.person_id AS "personId",
             lr.legal_area_id AS "legalAreaId",
             lr.priority_id AS "priorityId",
             lr.status_id AS "statusId",
             rs.code AS "statusCode"
           FROM legal_requests lr
           JOIN request_statuses rs ON rs.id = lr.status_id
           WHERE lr.id = $1
           FOR UPDATE`,
          [request.params.id],
        );
        if (existingResult.rowCount === 0) {
          const error = new Error('Solicitud no encontrada.');
          error.statusCode = 404;
          throw error;
        }

        const existing = existingResult.rows[0];
        if (body.personId && body.personId !== existing.personId) {
          await validateReference(client, 'people', body.personId, 'La persona');
        }
        if (body.legalAreaId && body.legalAreaId !== existing.legalAreaId) {
          await validateReference(client, 'legal_areas', body.legalAreaId, 'El área jurídica');
        }
        if (body.priorityId && body.priorityId !== existing.priorityId) {
          await validateReference(client, 'priorities', body.priorityId, 'La prioridad');
        }
        const values = [];
        const sets = [];
        const columns = {
          personId: 'person_id',
          legalAreaId: 'legal_area_id',
          priorityId: 'priority_id',
          subject: 'subject',
          description: 'description',
          source: 'source',
          receivedDate: 'received_date',
        };
        for (const [key, column] of Object.entries(columns)) {
          if (body[key] === undefined) continue;
          const value = typeof body[key] === 'string' ? body[key].trim() : body[key];
          values.push(value);
          sets.push(`${column} = $${values.length}`);
        }

        let nextStatus = null;
        if (body.statusCode && body.statusCode !== existing.statusCode) {
          if (!allowedTransitions[existing.statusCode]?.includes(body.statusCode)) {
            throw badRequest(`No se permite cambiar de ${existing.statusCode} a ${body.statusCode}.`);
          }
          const statusResult = await client.query(
            'SELECT id, code, name FROM request_statuses WHERE code = $1',
            [body.statusCode],
          );
          nextStatus = statusResult.rows[0];
          values.push(nextStatus.id);
          sets.push(`status_id = $${values.length}`);
        }

        if (sets.length === 0) throw badRequest('No hay cambios válidos para guardar.');
        values.push(request.user.id, request.params.id);
        await client.query(
          `UPDATE legal_requests
           SET ${sets.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
           WHERE id = $${values.length}`,
          values,
        );

        if (nextStatus) {
          const comment = body.changeComment?.trim() || null;
          await client.query(
            `INSERT INTO legal_request_status_history
              (request_id, from_status_id, to_status_id, comment, changed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [request.params.id, existing.statusId, nextStatus.id, comment, request.user.id],
          );
          await writeAudit(client, request, {
            action: 'request.status_change',
            entityType: 'legal_request',
            entityId: request.params.id,
            details: { from: existing.statusCode, to: nextStatus.code },
          });
        }
        await writeAudit(client, request, {
          action: 'request.update',
          entityType: 'legal_request',
          entityId: request.params.id,
          details: { changedFields: Object.keys(body).filter((key) => key !== 'changeComment') },
        });
      });
      const item = await getRequest({ query }, request.params.id);
      return reply.send({ request: item });
    },
  );
}
