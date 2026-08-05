import { generateTaskNotifications } from '../alerts.js';
import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { query, withTransaction } from '../db.js';

const taskProperties = {
  caseId: { type: 'string', format: 'uuid' },
  assigneeId: { type: 'string', format: 'uuid' },
  priorityId: { type: 'string', format: 'uuid' },
  title: { type: 'string', minLength: 5, maxLength: 180 },
  description: { type: 'string', maxLength: 3000 },
  dueAt: { type: 'string', format: 'date-time' },
  statusCode: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
  comment: { type: 'string', maxLength: 500 },
};

const allowedTransitions = {
  pending: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['pending', 'completed', 'cancelled'],
  completed: ['in_progress'],
  cancelled: ['pending'],
};

const selectTask = `
  SELECT
    t.id,
    t.title,
    t.description,
    t.due_at AS "dueAt",
    t.alert_days AS "alertDays",
    t.completed_at AS "completedAt",
    t.created_at AS "createdAt",
    t.updated_at AS "updatedAt",
    json_build_object('id', c.id, 'caseNumber', c.case_number, 'title', c.title) AS case,
    json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) AS assignee,
    json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'level', p.level, 'color', p.color) AS priority,
    json_build_object('id', ts.id, 'code', ts.code, 'name', ts.name, 'color', ts.color, 'terminal', ts.terminal) AS status,
    CASE
      WHEN ts.terminal THEN 'finished'
      WHEN (t.due_at AT TIME ZONE 'America/Bogota')::date < (NOW() AT TIME ZONE 'America/Bogota')::date THEN 'overdue'
      WHEN (t.due_at AT TIME ZONE 'America/Bogota')::date = (NOW() AT TIME ZONE 'America/Bogota')::date THEN 'today'
      WHEN (t.due_at AT TIME ZONE 'America/Bogota')::date <= (NOW() AT TIME ZONE 'America/Bogota')::date + 7 THEN 'week'
      ELSE 'later'
    END AS "dueState"
  FROM tasks t
  JOIN cases c ON c.id = t.case_id
  JOIN users u ON u.id = t.assignee_id
  JOIN priorities p ON p.id = t.priority_id
  JOIN task_statuses ts ON ts.id = t.status_id`;

function expectedError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanRequired(value, minimum, label) {
  const cleaned = value.trim();
  if (cleaned.length < minimum) throw expectedError(`${label} no tiene la longitud mínima requerida.`);
  return cleaned;
}

function cleanOptional(value) {
  if (value === undefined) return undefined;
  return value.trim() || null;
}

async function validateCase(client, caseId) {
  const result = await client.query(
    `SELECT cs.code AS "statusCode" FROM cases c JOIN case_statuses cs ON cs.id = c.status_id WHERE c.id = $1 FOR UPDATE OF c`,
    [caseId],
  );
  if (result.rowCount === 0) throw expectedError('Expediente no encontrado.', 404);
  if (result.rows[0].statusCode === 'archived') throw expectedError('No se pueden gestionar tareas en un expediente archivado.');
}

async function validateAssignee(client, userId) {
  const result = await client.query(
    `SELECT u.id
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = $1 AND u.active = TRUE AND p.code = 'tasks.write'
     LIMIT 1`,
    [userId],
  );
  if (result.rowCount === 0) throw expectedError('El responsable no está activo o no puede gestionar tareas.');
}

async function validatePriority(client, priorityId) {
  const result = await client.query('SELECT id FROM priorities WHERE id = $1 AND active = TRUE', [priorityId]);
  if (result.rowCount === 0) throw expectedError('La prioridad no existe o está inactiva.');
}

async function getTask(db, id) {
  const result = await db.query(`${selectTask} WHERE t.id = $1`, [id]);
  return result.rows[0] || null;
}

export async function taskRoutes(app) {
  app.get(
    '/options',
    { preHandler: [authenticate, requirePermission('tasks.read')] },
    async () => {
      const [casesResult, assigneesResult, prioritiesResult, statusesResult] = await Promise.all([
        query(
          `SELECT c.id, c.case_number AS "caseNumber", c.title
           FROM cases c JOIN case_statuses cs ON cs.id = c.status_id
           WHERE cs.code <> 'archived' ORDER BY c.opened_date DESC, c.case_number LIMIT 200`,
        ),
        query(
          `SELECT DISTINCT u.id, u.full_name AS "fullName", u.email
           FROM users u
           JOIN user_roles ur ON ur.user_id = u.id
           JOIN role_permissions rp ON rp.role_id = ur.role_id
           JOIN permissions p ON p.id = rp.permission_id
           WHERE u.active = TRUE AND p.code = 'tasks.write'
           ORDER BY u.full_name`,
        ),
        query('SELECT id, code, name, level, color FROM priorities WHERE active = TRUE ORDER BY level'),
        query('SELECT id, code, name, color, sort_order AS "sortOrder", terminal FROM task_statuses ORDER BY sort_order'),
      ]);
      return {
        cases: casesResult.rows,
        assignees: assigneesResult.rows,
        priorities: prioritiesResult.rows,
        statuses: statusesResult.rows,
      };
    },
  );

  app.get(
    '/summary',
    {
      preHandler: [authenticate, requirePermission('tasks.read')],
      schema: { querystring: { type: 'object', additionalProperties: false, properties: { scope: { type: 'string', enum: ['mine', 'all'], default: 'mine' } } } },
    },
    async (request) => {
      const mineCondition = (request.query.scope || 'mine') === 'mine' ? 'AND t.assignee_id = $1' : '';
      const values = mineCondition ? [request.user.id] : [];
      const result = await query(
        `SELECT
           COUNT(*) FILTER (WHERE NOT ts.terminal)::int AS active,
           COUNT(*) FILTER (WHERE NOT ts.terminal AND (t.due_at AT TIME ZONE 'America/Bogota')::date < (NOW() AT TIME ZONE 'America/Bogota')::date)::int AS overdue,
           COUNT(*) FILTER (WHERE NOT ts.terminal AND (t.due_at AT TIME ZONE 'America/Bogota')::date = (NOW() AT TIME ZONE 'America/Bogota')::date)::int AS today,
           COUNT(*) FILTER (WHERE NOT ts.terminal AND (t.due_at AT TIME ZONE 'America/Bogota')::date > (NOW() AT TIME ZONE 'America/Bogota')::date AND (t.due_at AT TIME ZONE 'America/Bogota')::date <= (NOW() AT TIME ZONE 'America/Bogota')::date + 7)::int AS week
         FROM tasks t JOIN task_statuses ts ON ts.id = t.status_id
         WHERE TRUE ${mineCondition}`,
        values,
      );
      return { summary: result.rows[0] };
    },
  );

  app.get(
    '/',
    {
      preHandler: [authenticate, requirePermission('tasks.read')],
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            search: { type: 'string', maxLength: 120 },
            caseId: { type: 'string', format: 'uuid' },
            assigneeId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            dueState: { type: 'string', enum: ['overdue', 'today', 'week'] },
            mine: { type: 'boolean' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 10, maximum: 100, default: 25 },
          },
        },
      },
    },
    async (request) => {
      const { search, caseId, assigneeId, status, dueState, mine, page = 1, limit = 25 } = request.query;
      const conditions = [];
      const values = [];
      const add = (sql, value) => {
        values.push(value);
        conditions.push(sql.replace('?', `$${values.length}`));
      };
      if (search?.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(`(t.title ILIKE $${values.length} OR COALESCE(t.description, '') ILIKE $${values.length} OR c.case_number ILIKE $${values.length} OR c.title ILIKE $${values.length})`);
      }
      if (caseId) add('t.case_id = ?', caseId);
      if (assigneeId) add('t.assignee_id = ?', assigneeId);
      if (mine === true) add('t.assignee_id = ?', request.user.id);
      if (status) add('ts.code = ?', status);
      if (dueState === 'overdue') conditions.push("NOT ts.terminal AND (t.due_at AT TIME ZONE 'America/Bogota')::date < (NOW() AT TIME ZONE 'America/Bogota')::date");
      if (dueState === 'today') conditions.push("NOT ts.terminal AND (t.due_at AT TIME ZONE 'America/Bogota')::date = (NOW() AT TIME ZONE 'America/Bogota')::date");
      if (dueState === 'week') conditions.push("NOT ts.terminal AND (t.due_at AT TIME ZONE 'America/Bogota')::date > (NOW() AT TIME ZONE 'America/Bogota')::date AND (t.due_at AT TIME ZONE 'America/Bogota')::date <= (NOW() AT TIME ZONE 'America/Bogota')::date + 7");
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const countValues = [...values];
      values.push(limit, (page - 1) * limit);
      const [itemsResult, countResult] = await Promise.all([
        query(`${selectTask} ${where} ORDER BY ts.terminal, t.due_at, p.level DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values),
        query(`SELECT COUNT(*)::int AS total FROM tasks t JOIN cases c ON c.id = t.case_id JOIN task_statuses ts ON ts.id = t.status_id WHERE TRUE ${conditions.length ? `AND ${conditions.join(' AND ')}` : ''}`, countValues),
      ]);
      return { tasks: itemsResult.rows, pagination: { page, limit, total: countResult.rows[0].total } };
    },
  );

  app.get(
    '/:id',
    {
      preHandler: [authenticate, requirePermission('tasks.read')],
      schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } },
    },
    async (request, reply) => {
      const task = await getTask({ query }, request.params.id);
      if (!task) return reply.code(404).send({ message: 'Tarea no encontrada.' });
      const history = await query(
        `SELECT
           h.id, h.comment, h.created_at AS "createdAt",
           CASE WHEN fs.id IS NULL THEN NULL ELSE json_build_object('code', fs.code, 'name', fs.name, 'color', fs.color) END AS "fromStatus",
           json_build_object('code', ts.code, 'name', ts.name, 'color', ts.color) AS "toStatus",
           CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id', u.id, 'fullName', u.full_name) END AS actor
         FROM task_status_history h
         LEFT JOIN task_statuses fs ON fs.id = h.from_status_id
         JOIN task_statuses ts ON ts.id = h.to_status_id
         LEFT JOIN users u ON u.id = h.changed_by
         WHERE h.task_id = $1 ORDER BY h.created_at DESC, h.id DESC`,
        [request.params.id],
      );
      return { task, history: history.rows };
    },
  );

  app.post(
    '/',
    {
      preHandler: [authenticate, requirePermission('tasks.write')],
      schema: {
        body: {
          type: 'object', additionalProperties: false,
          required: ['caseId', 'assigneeId', 'priorityId', 'title', 'dueAt'],
          properties: taskProperties,
        },
      },
    },
    async (request, reply) => {
      const title = cleanRequired(request.body.title, 5, 'El título');
      const id = await withTransaction(async (client) => {
        await validateCase(client, request.body.caseId);
        await validateAssignee(client, request.body.assigneeId);
        await validatePriority(client, request.body.priorityId);
        const statusResult = await client.query("SELECT id FROM task_statuses WHERE code = 'pending'");
        const result = await client.query(
          `INSERT INTO tasks
            (case_id, assignee_id, priority_id, status_id, title, description, due_at, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id`,
          [request.body.caseId, request.body.assigneeId, request.body.priorityId, statusResult.rows[0].id,
            title, cleanOptional(request.body.description) ?? null, request.body.dueAt, request.user.id],
        );
        await client.query(
          `INSERT INTO task_status_history (task_id, to_status_id, comment, changed_by) VALUES ($1, $2, 'Tarea creada.', $3)`,
          [result.rows[0].id, statusResult.rows[0].id, request.user.id],
        );
        await writeAudit(client, request, {
          action: 'task.create', entityType: 'task', entityId: result.rows[0].id,
          details: { caseId: request.body.caseId, assigneeId: request.body.assigneeId, dueAt: request.body.dueAt },
        });
        await generateTaskNotifications(new Date(), client);
        return result.rows[0].id;
      });
      return reply.code(201).send({ task: await getTask({ query }, id) });
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [authenticate, requirePermission('tasks.write')],
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
        body: { type: 'object', additionalProperties: false, minProperties: 1, properties: taskProperties },
      },
    },
    async (request, reply) => {
      await withTransaction(async (client) => {
        const currentResult = await client.query(
          `SELECT t.*, ts.code AS "statusCode" FROM tasks t JOIN task_statuses ts ON ts.id = t.status_id WHERE t.id = $1 FOR UPDATE OF t`,
          [request.params.id],
        );
        if (currentResult.rowCount === 0) throw expectedError('Tarea no encontrada.', 404);
        const current = currentResult.rows[0];
        await validateCase(client, request.body.caseId || current.case_id);
        if (request.body.assigneeId) await validateAssignee(client, request.body.assigneeId);
        if (request.body.priorityId) await validatePriority(client, request.body.priorityId);

        let nextStatusId = current.status_id;
        if (request.body.statusCode && request.body.statusCode !== current.statusCode) {
          if (!allowedTransitions[current.statusCode].includes(request.body.statusCode)) {
            throw expectedError(`No se permite cambiar de ${current.statusCode} a ${request.body.statusCode}.`);
          }
          const statusResult = await client.query('SELECT id FROM task_statuses WHERE code = $1', [request.body.statusCode]);
          nextStatusId = statusResult.rows[0].id;
          await client.query(
            `INSERT INTO task_status_history (task_id, from_status_id, to_status_id, comment, changed_by) VALUES ($1, $2, $3, $4, $5)`,
            [request.params.id, current.status_id, nextStatusId, cleanOptional(request.body.comment) ?? null, request.user.id],
          );
        }

        const nextTitle = request.body.title === undefined ? current.title : cleanRequired(request.body.title, 5, 'El título');
        const nextDescription = request.body.description === undefined ? current.description : cleanOptional(request.body.description);
        const nextDueAt = request.body.dueAt || current.due_at;
        const nextAssignee = request.body.assigneeId || current.assignee_id;
        const nextPriority = request.body.priorityId || current.priority_id;
        const statusCode = request.body.statusCode || current.statusCode;
        const dueChanged = request.body.dueAt !== undefined
          && new Date(request.body.dueAt).getTime() !== new Date(current.due_at).getTime();
        const assigneeChanged = request.body.assigneeId !== undefined && request.body.assigneeId !== current.assignee_id;
        const statusChanged = request.body.statusCode !== undefined && request.body.statusCode !== current.statusCode;
        await client.query(
          `UPDATE tasks SET
             case_id = $1, assignee_id = $2, priority_id = $3, status_id = $4,
             title = $5, description = $6, due_at = $7,
             completed_at = CASE WHEN $8 = 'completed' THEN COALESCE(completed_at, NOW()) ELSE NULL END,
             updated_by = $9, updated_at = NOW()
           WHERE id = $10`,
          [request.body.caseId || current.case_id, nextAssignee, nextPriority, nextStatusId,
            nextTitle, nextDescription, nextDueAt, statusCode, request.user.id, request.params.id],
        );
        if (dueChanged || assigneeChanged || statusChanged) {
          await client.query('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE task_id = $1', [request.params.id]);
        }
        await writeAudit(client, request, {
          action: request.body.statusCode && request.body.statusCode !== current.statusCode ? 'task.status_change' : 'task.update',
          entityType: 'task', entityId: request.params.id,
          details: { changedFields: Object.keys(request.body).filter((key) => key !== 'comment') },
        });
        await generateTaskNotifications(new Date(), client);
      });
      return reply.send({ task: await getTask({ query }, request.params.id) });
    },
  );
}
