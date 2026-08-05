import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { query, withTransaction } from '../db.js';

const caseProperties = {
  personId: { type: 'string', format: 'uuid' },
  legalAreaId: { type: 'string', format: 'uuid' },
  priorityId: { type: 'string', format: 'uuid' },
  title: { type: 'string', minLength: 5, maxLength: 180 },
  description: { type: 'string', minLength: 10, maxLength: 5000 },
  externalReference: { type: 'string', maxLength: 100 },
  authority: { type: 'string', maxLength: 180 },
  openedDate: { type: 'string', format: 'date' },
};

const caseFrom = `
  FROM cases c
  JOIN people p ON p.id = c.person_id
  JOIN legal_areas la ON la.id = c.legal_area_id
  JOIN priorities pr ON pr.id = c.priority_id
  JOIN case_statuses cs ON cs.id = c.status_id
  LEFT JOIN legal_requests lr ON lr.id = c.origin_request_id`;

const selectCase = `
  SELECT
    c.id,
    c.case_number AS "caseNumber",
    c.title,
    c.description,
    c.external_reference AS "externalReference",
    c.authority,
    c.opened_date AS "openedDate",
    c.created_at AS "createdAt",
    c.updated_at AS "updatedAt",
    json_build_object(
      'id', p.id,
      'fullName', p.full_name,
      'documentType', p.document_type,
      'documentNumber', p.document_number
    ) AS person,
    json_build_object('id', la.id, 'code', la.code, 'name', la.name) AS "legalArea",
    json_build_object('id', pr.id, 'code', pr.code, 'name', pr.name, 'level', pr.level, 'color', pr.color) AS priority,
    json_build_object('id', cs.id, 'code', cs.code, 'name', cs.name, 'color', cs.color, 'terminal', cs.terminal) AS status,
    CASE WHEN lr.id IS NULL THEN NULL ELSE json_build_object(
      'id', lr.id,
      'requestNumber', lr.request_number,
      'subject', lr.subject
    ) END AS "originRequest"
  ${caseFrom}`;

function expectedError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function validateReference(client, table, id, label) {
  const result = await client.query(`SELECT active FROM ${table} WHERE id = $1`, [id]);
  if (result.rowCount === 0 || !result.rows[0].active) {
    throw expectedError(`${label} no existe o está inactivo.`);
  }
}

async function nextCaseNumber(client) {
  const result = await client.query(
    "SELECT 'EXP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('case_number_seq')::TEXT, 6, '0') AS number",
  );
  return result.rows[0].number;
}

async function openStatusId(client) {
  const result = await client.query("SELECT id FROM case_statuses WHERE code = 'open'");
  return result.rows[0].id;
}

async function getCase(db, id) {
  const result = await db.query(`${selectCase} WHERE c.id = $1`, [id]);
  return result.rows[0] || null;
}

function cleanOptional(value) {
  if (value === undefined) return undefined;
  const cleaned = value.trim();
  return cleaned || null;
}

export async function caseRoutes(app) {
  app.get(
    '/',
    {
      preHandler: [authenticate, requirePermission('cases.read')],
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            search: { type: 'string', maxLength: 120 },
            legalAreaId: { type: 'string', format: 'uuid' },
            priorityId: { type: 'string', format: 'uuid' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 10, maximum: 100, default: 25 },
          },
        },
      },
    },
    async (request) => {
      const { search, legalAreaId, priorityId, page = 1, limit = 25 } = request.query;
      const conditions = [];
      const values = [];
      const add = (sql, value) => {
        values.push(value);
        conditions.push(sql.replace('?', `$${values.length}`));
      };
      if (search?.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(`(
          c.case_number ILIKE $${values.length}
          OR COALESCE(c.external_reference, '') ILIKE $${values.length}
          OR c.title ILIKE $${values.length}
          OR p.full_name ILIKE $${values.length}
          OR p.document_number ILIKE $${values.length}
        )`);
      }
      if (legalAreaId) add('c.legal_area_id = ?', legalAreaId);
      if (priorityId) add('c.priority_id = ?', priorityId);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const countValues = [...values];
      values.push(limit);
      const limitPosition = values.length;
      values.push((page - 1) * limit);
      const offsetPosition = values.length;
      const [itemsResult, countResult] = await Promise.all([
        query(
          `${selectCase} ${where}
           ORDER BY c.opened_date DESC, c.created_at DESC
           LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
          values,
        ),
        query(`SELECT COUNT(*)::int AS total ${caseFrom} ${where}`, countValues),
      ]);
      return {
        cases: itemsResult.rows,
        pagination: { page, limit, total: countResult.rows[0].total },
      };
    },
  );

  app.get(
    '/:id',
    {
      preHandler: [authenticate, requirePermission('cases.read')],
      schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } },
    },
    async (request, reply) => {
      const item = await getCase({ query }, request.params.id);
      if (!item) return reply.code(404).send({ message: 'Expediente no encontrado.' });
      return { case: item };
    },
  );

  app.post(
    '/',
    {
      preHandler: [authenticate, requirePermission('cases.write')],
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['personId', 'legalAreaId', 'priorityId', 'title', 'description', 'openedDate'],
          properties: caseProperties,
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const id = await withTransaction(async (client) => {
        await validateReference(client, 'people', body.personId, 'La persona');
        await validateReference(client, 'legal_areas', body.legalAreaId, 'El área jurídica');
        await validateReference(client, 'priorities', body.priorityId, 'La prioridad');
        const caseNumber = await nextCaseNumber(client);
        const statusId = await openStatusId(client);
        const result = await client.query(
          `INSERT INTO cases
            (case_number, person_id, legal_area_id, priority_id, status_id, title, description, external_reference, authority, opened_date, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
           RETURNING id`,
          [
            caseNumber,
            body.personId,
            body.legalAreaId,
            body.priorityId,
            statusId,
            body.title.trim(),
            body.description.trim(),
            cleanOptional(body.externalReference),
            cleanOptional(body.authority),
            body.openedDate,
            request.user.id,
          ],
        );
        await writeAudit(client, request, {
          action: 'case.create',
          entityType: 'case',
          entityId: result.rows[0].id,
          details: { source: 'manual', caseNumber },
        });
        return result.rows[0].id;
      });
      return reply.code(201).send({ case: await getCase({ query }, id) });
    },
  );

  app.post(
    '/from-request/:requestId',
    {
      preHandler: [
        authenticate,
        requirePermission('requests.write'),
        requirePermission('cases.write'),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['requestId'],
          properties: { requestId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: { openedDate: { type: 'string', format: 'date' } },
        },
      },
    },
    async (request, reply) => {
      const id = await withTransaction(async (client) => {
        const existingCase = await client.query(
          'SELECT id, case_number AS "caseNumber" FROM cases WHERE origin_request_id = $1',
          [request.params.requestId],
        );
        if (existingCase.rowCount) {
          throw expectedError(`La solicitud ya fue convertida en ${existingCase.rows[0].caseNumber}.`, 409);
        }
        const requestResult = await client.query(
          `SELECT
             lr.id,
             lr.person_id AS "personId",
             lr.legal_area_id AS "legalAreaId",
             lr.priority_id AS "priorityId",
             lr.status_id AS "statusId",
             lr.subject,
             lr.description,
             rs.code AS "statusCode"
           FROM legal_requests lr
           JOIN request_statuses rs ON rs.id = lr.status_id
           WHERE lr.id = $1
           FOR UPDATE`,
          [request.params.requestId],
        );
        if (requestResult.rowCount === 0) throw expectedError('Solicitud no encontrada.', 404);
        const origin = requestResult.rows[0];
        if (origin.statusCode !== 'approved') {
          throw expectedError('Solo una solicitud aprobada puede convertirse en expediente.');
        }

        const caseNumber = await nextCaseNumber(client);
        const statusId = await openStatusId(client);
        const convertedStatus = await client.query("SELECT id FROM request_statuses WHERE code = 'converted'");
        const caseResult = await client.query(
          `INSERT INTO cases
            (case_number, origin_request_id, person_id, legal_area_id, priority_id, status_id, title, description, opened_date, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
           RETURNING id`,
          [
            caseNumber,
            origin.id,
            origin.personId,
            origin.legalAreaId,
            origin.priorityId,
            statusId,
            origin.subject,
            origin.description,
            request.body?.openedDate || new Date().toISOString().slice(0, 10),
            request.user.id,
          ],
        );
        await client.query(
          'UPDATE legal_requests SET status_id = $1, updated_by = $2, updated_at = NOW() WHERE id = $3',
          [convertedStatus.rows[0].id, request.user.id, origin.id],
        );
        await client.query(
          `INSERT INTO legal_request_status_history
            (request_id, from_status_id, to_status_id, comment, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [origin.id, origin.statusId, convertedStatus.rows[0].id, `Convertida en ${caseNumber}.`, request.user.id],
        );
        await writeAudit(client, request, {
          action: 'case.create',
          entityType: 'case',
          entityId: caseResult.rows[0].id,
          details: { source: 'request', requestId: origin.id, caseNumber },
        });
        await writeAudit(client, request, {
          action: 'request.convert',
          entityType: 'legal_request',
          entityId: origin.id,
          details: { caseId: caseResult.rows[0].id, caseNumber },
        });
        await writeAudit(client, request, {
          action: 'request.status_change',
          entityType: 'legal_request',
          entityId: origin.id,
          details: { from: 'approved', to: 'converted' },
        });
        return caseResult.rows[0].id;
      });
      return reply.code(201).send({ case: await getCase({ query }, id) });
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [authenticate, requirePermission('cases.write')],
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: caseProperties,
        },
      },
    },
    async (request, reply) => {
      await withTransaction(async (client) => {
        const existingResult = await client.query(
          `SELECT id, person_id AS "personId", legal_area_id AS "legalAreaId", priority_id AS "priorityId"
           FROM cases WHERE id = $1 FOR UPDATE`,
          [request.params.id],
        );
        if (existingResult.rowCount === 0) throw expectedError('Expediente no encontrado.', 404);
        const existing = existingResult.rows[0];
        if (request.body.personId && request.body.personId !== existing.personId) {
          await validateReference(client, 'people', request.body.personId, 'La persona');
        }
        if (request.body.legalAreaId && request.body.legalAreaId !== existing.legalAreaId) {
          await validateReference(client, 'legal_areas', request.body.legalAreaId, 'El área jurídica');
        }
        if (request.body.priorityId && request.body.priorityId !== existing.priorityId) {
          await validateReference(client, 'priorities', request.body.priorityId, 'La prioridad');
        }

        const columns = {
          personId: 'person_id',
          legalAreaId: 'legal_area_id',
          priorityId: 'priority_id',
          title: 'title',
          description: 'description',
          externalReference: 'external_reference',
          authority: 'authority',
          openedDate: 'opened_date',
        };
        const values = [];
        const sets = [];
        for (const [key, column] of Object.entries(columns)) {
          if (request.body[key] === undefined) continue;
          const value = ['externalReference', 'authority'].includes(key)
            ? cleanOptional(request.body[key])
            : typeof request.body[key] === 'string' ? request.body[key].trim() : request.body[key];
          values.push(value);
          sets.push(`${column} = $${values.length}`);
        }
        values.push(request.user.id, request.params.id);
        await client.query(
          `UPDATE cases
           SET ${sets.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
           WHERE id = $${values.length}`,
          values,
        );
        await writeAudit(client, request, {
          action: 'case.update',
          entityType: 'case',
          entityId: request.params.id,
          details: { changedFields: Object.keys(request.body) },
        });
      });
      return reply.send({ case: await getCase({ query }, request.params.id) });
    },
  );
}
