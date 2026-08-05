import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { query, withTransaction } from '../db.js';
import { normalizeEmail } from '../security.js';

const personProperties = {
  personType: { type: 'string', enum: ['natural', 'legal'] },
  documentType: { type: 'string', enum: ['CC', 'CE', 'NIT', 'PASSPORT', 'TI'] },
  documentNumber: { type: 'string', minLength: 3, maxLength: 40 },
  fullName: { type: 'string', minLength: 3, maxLength: 180 },
  email: {
    anyOf: [
      { type: 'string', format: 'email', maxLength: 254 },
      { type: 'string', maxLength: 0 },
    ],
  },
  phone: { type: 'string', maxLength: 30 },
  address: { type: 'string', maxLength: 240 },
  city: { type: 'string', maxLength: 100 },
  notes: { type: 'string', maxLength: 1200 },
};

const selectPerson = `
  SELECT
    p.id,
    p.person_type AS "personType",
    p.document_type AS "documentType",
    p.document_number AS "documentNumber",
    p.full_name AS "fullName",
    p.email,
    p.phone,
    p.address,
    p.city,
    p.notes,
    p.active,
    p.created_at AS "createdAt",
    p.updated_at AS "updatedAt"
  FROM people p`;

function cleanOptional(value, transform = (item) => item) {
  if (value === undefined) return undefined;
  const cleaned = String(value).trim();
  return cleaned ? transform(cleaned) : null;
}

function normalizePerson(input) {
  const person = {};
  if (input.personType !== undefined) person.personType = input.personType;
  if (input.documentType !== undefined) person.documentType = input.documentType;
  if (input.documentNumber !== undefined) person.documentNumber = input.documentNumber.trim().toUpperCase();
  if (input.fullName !== undefined) person.fullName = input.fullName.trim();
  if (input.email !== undefined) person.email = cleanOptional(input.email, normalizeEmail);
  if (input.phone !== undefined) person.phone = cleanOptional(input.phone);
  if (input.address !== undefined) person.address = cleanOptional(input.address);
  if (input.city !== undefined) person.city = cleanOptional(input.city);
  if (input.notes !== undefined) person.notes = cleanOptional(input.notes);
  if (input.active !== undefined) person.active = input.active;
  return person;
}

export async function peopleRoutes(app) {
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
            active: { type: 'boolean' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 10, maximum: 100, default: 25 },
          },
        },
      },
    },
    async (request) => {
      const { search, active, page = 1, limit = 25 } = request.query;
      const conditions = [];
      const values = [];

      if (search?.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(`(
          p.full_name ILIKE $${values.length}
          OR p.document_number ILIKE $${values.length}
          OR COALESCE(p.email, '') ILIKE $${values.length}
          OR COALESCE(p.phone, '') ILIKE $${values.length}
        )`);
      }
      if (active !== undefined) {
        values.push(active);
        conditions.push(`p.active = $${values.length}`);
      }

      values.push(limit);
      const limitPosition = values.length;
      values.push((page - 1) * limit);
      const offsetPosition = values.length;
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await query(
        `${selectPerson}
         ${where}
         ORDER BY p.active DESC, p.full_name ASC
         LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
        values,
      );
      const countValues = values.slice(0, values.length - 2);
      const countResult = await query(`SELECT COUNT(*)::int AS total FROM people p ${where}`, countValues);

      return {
        people: result.rows,
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
      const result = await query(`${selectPerson} WHERE p.id = $1`, [request.params.id]);
      if (result.rowCount === 0) return reply.code(404).send({ message: 'Persona no encontrada.' });
      return { person: result.rows[0] };
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
          required: ['personType', 'documentType', 'documentNumber', 'fullName'],
          properties: personProperties,
        },
      },
    },
    async (request, reply) => {
      const person = normalizePerson(request.body);
      const created = await withTransaction(async (client) => {
        const result = await client.query(
          `INSERT INTO people
            (person_type, document_type, document_number, full_name, email, phone, address, city, notes, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
           RETURNING id`,
          [
            person.personType,
            person.documentType,
            person.documentNumber,
            person.fullName,
            person.email ?? null,
            person.phone ?? null,
            person.address ?? null,
            person.city ?? null,
            person.notes ?? null,
            request.user.id,
          ],
        );
        await writeAudit(client, request, {
          action: 'person.create',
          entityType: 'person',
          entityId: result.rows[0].id,
          details: { documentType: person.documentType, documentNumber: person.documentNumber },
        });
        return result.rows[0].id;
      });
      const result = await query(`${selectPerson} WHERE p.id = $1`, [created]);
      return reply.code(201).send({ person: result.rows[0] });
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
          properties: { ...personProperties, active: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      const person = normalizePerson(request.body);
      const columns = {
        personType: 'person_type',
        documentType: 'document_type',
        documentNumber: 'document_number',
        fullName: 'full_name',
        email: 'email',
        phone: 'phone',
        address: 'address',
        city: 'city',
        notes: 'notes',
        active: 'active',
      };

      const updated = await withTransaction(async (client) => {
        const existing = await client.query('SELECT id FROM people WHERE id = $1', [request.params.id]);
        if (existing.rowCount === 0) {
          const error = new Error('Persona no encontrada.');
          error.statusCode = 404;
          throw error;
        }

        const values = [];
        const sets = Object.entries(person).map(([key, value]) => {
          values.push(value);
          return `${columns[key]} = $${values.length}`;
        });
        values.push(request.user.id, request.params.id);
        await client.query(
          `UPDATE people
           SET ${sets.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
           WHERE id = $${values.length}`,
          values,
        );
        await writeAudit(client, request, {
          action: 'person.update',
          entityType: 'person',
          entityId: request.params.id,
          details: { changedFields: Object.keys(person) },
        });
        return request.params.id;
      });
      const result = await query(`${selectPerson} WHERE p.id = $1`, [updated]);
      return reply.send({ person: result.rows[0] });
    },
  );
}
