import { authenticate, requirePermission } from '../auth.js';
import { writeAudit } from '../audit.js';
import { query, withTransaction } from '../db.js';

const filterSchema = {
  from: { type: 'string', format: 'date' },
  to: { type: 'string', format: 'date' },
  legalAreaId: { type: 'string', format: 'uuid' },
  assigneeId: { type: 'string', format: 'uuid' },
  status: { type: 'string', enum: ['open', 'in_progress', 'on_hold', 'closed', 'archived'] },
};

function expectedError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function buildCaseFilter(filters) {
  const conditions = [];
  const values = [];
  const add = (sql, value) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  if (filters.from) add('c.opened_date >= ?::date', filters.from);
  if (filters.to) add('c.opened_date <= ?::date', filters.to);
  if (filters.legalAreaId) add('c.legal_area_id = ?', filters.legalAreaId);
  if (filters.assigneeId) add('ca.user_id = ?', filters.assigneeId);
  if (filters.status) add('cs.code = ?', filters.status);

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
}

function validateDates({ from, to }) {
  if (from && to && from > to) throw expectedError('La fecha inicial no puede ser posterior a la fecha final.');
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  const headers = [
    'Número', 'Título', 'Cliente', 'Área jurídica', 'Prioridad', 'Estado', 'Responsable',
    'Fecha de apertura', 'Referencia externa', 'Autoridad', 'Tareas activas',
    'Tareas vencidas', 'Documentos vigentes', 'Actuaciones',
  ];
  const fields = [
    'caseNumber', 'title', 'client', 'legalArea', 'priority', 'status', 'assignee',
    'openedDate', 'externalReference', 'authority', 'activeTasks', 'overdueTasks',
    'currentDocuments', 'actions',
  ];
  return `\uFEFF${[headers, ...rows.map((row) => fields.map((field) => row[field]))]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')}\r\n`;
}

export async function reportRoutes(app) {
  app.get(
    '/options',
    { preHandler: [authenticate, requirePermission('reports.read')] },
    async () => {
      const [areasResult, statusesResult, assigneesResult] = await Promise.all([
        query('SELECT id, code, name FROM legal_areas WHERE active = TRUE ORDER BY sort_order, name'),
        query('SELECT code, name, color FROM case_statuses ORDER BY sort_order, name'),
        query(
          `SELECT DISTINCT u.id, u.full_name AS "fullName"
           FROM users u
           JOIN case_assignments ca ON ca.user_id = u.id AND ca.unassigned_at IS NULL
           WHERE u.active = TRUE
           ORDER BY u.full_name`,
        ),
      ]);
      return { legalAreas: areasResult.rows, statuses: statusesResult.rows, assignees: assigneesResult.rows };
    },
  );

  app.get(
    '/overview',
    {
      preHandler: [authenticate, requirePermission('reports.read')],
      schema: { querystring: { type: 'object', additionalProperties: false, properties: filterSchema } },
    },
    async (request) => {
      validateDates(request.query);
      const { where, values } = buildCaseFilter(request.query);
      const base = `
        FROM cases c
        JOIN case_statuses cs ON cs.id = c.status_id
        JOIN legal_areas la ON la.id = c.legal_area_id
        LEFT JOIN case_assignments ca ON ca.case_id = c.id AND ca.unassigned_at IS NULL
        LEFT JOIN users u ON u.id = ca.user_id
        ${where}`;

      const [summaryResult, requestResult] = await Promise.all([
        query(
          `WITH filtered_cases AS MATERIALIZED (
             SELECT c.id, cs.code AS status_code, cs.name AS status_name, cs.color AS status_color,
               cs.sort_order AS status_sort, la.id AS area_id, la.name AS area_name,
               la.sort_order AS area_sort, ca.user_id
             ${base}
           ),
           filtered_tasks AS MATERIALIZED (
             SELECT t.id, t.assignee_id, t.due_at, ts.code AS status_code,
               ts.name AS status_name, ts.color AS status_color, ts.sort_order AS status_sort, ts.terminal
             FROM tasks t
             JOIN task_statuses ts ON ts.id = t.status_id
             JOIN filtered_cases fc ON fc.id = t.case_id
           )
           SELECT
             json_build_object(
               'totalCases', (SELECT COUNT(*)::int FROM filtered_cases),
               'activeCases', (SELECT COUNT(*)::int FROM filtered_cases WHERE status_code NOT IN ('closed', 'archived')),
               'closedCases', (SELECT COUNT(*)::int FROM filtered_cases WHERE status_code IN ('closed', 'archived')),
               'activeTasks', (SELECT COUNT(*)::int FROM filtered_tasks WHERE NOT terminal),
               'overdueTasks', (SELECT COUNT(*)::int FROM filtered_tasks WHERE NOT terminal AND due_at < NOW()),
               'currentDocuments', (SELECT COUNT(*)::int FROM documents d JOIN filtered_cases fc ON fc.id = d.case_id WHERE d.is_current),
               'actions', (SELECT COUNT(*)::int FROM legal_actions a JOIN filtered_cases fc ON fc.id = a.case_id)
             ) AS totals,
             COALESCE((SELECT json_agg(row_data ORDER BY row_data."sortOrder") FROM (
               SELECT status_code AS code, status_name AS name, status_color AS color,
                 status_sort AS "sortOrder", COUNT(*)::int AS total
               FROM filtered_cases GROUP BY status_code, status_name, status_color, status_sort
             ) row_data), '[]') AS "casesByStatus",
             COALESCE((SELECT json_agg(row_data ORDER BY row_data.total DESC, row_data."sortOrder") FROM (
               SELECT area_id AS id, area_name AS name, area_sort AS "sortOrder", COUNT(*)::int AS total
               FROM filtered_cases GROUP BY area_id, area_name, area_sort
             ) row_data), '[]') AS "casesByArea",
             COALESCE((SELECT json_agg(row_data ORDER BY row_data."sortOrder") FROM (
               SELECT status_code AS code, status_name AS name, status_color AS color,
                 status_sort AS "sortOrder", COUNT(*)::int AS total
               FROM filtered_tasks GROUP BY status_code, status_name, status_color, status_sort
             ) row_data), '[]') AS "tasksByStatus",
             COALESCE((SELECT json_agg(row_data ORDER BY row_data.cases DESC, row_data."fullName") FROM (
               SELECT usr.id, usr.full_name AS "fullName", cl.cases,
                 COALESCE(tl.active_tasks, 0)::int AS "activeTasks",
                 COALESCE(tl.overdue_tasks, 0)::int AS "overdueTasks"
               FROM (SELECT user_id, COUNT(*)::int AS cases FROM filtered_cases WHERE user_id IS NOT NULL GROUP BY user_id) cl
               JOIN users usr ON usr.id = cl.user_id
               LEFT JOIN (
                 SELECT assignee_id,
                   COUNT(*) FILTER (WHERE NOT terminal)::int AS active_tasks,
                   COUNT(*) FILTER (WHERE NOT terminal AND due_at < NOW())::int AS overdue_tasks
                 FROM filtered_tasks GROUP BY assignee_id
               ) tl ON tl.assignee_id = usr.id
             ) row_data), '[]') AS workload`,
          values,
        ),
        (() => {
          const conditions = [];
          const requestValues = [];
          const add = (sql, value) => { requestValues.push(value); conditions.push(sql.replace('?', `$${requestValues.length}`)); };
          if (request.query.from) add('lr.received_date >= ?::date', request.query.from);
          if (request.query.to) add('lr.received_date <= ?::date', request.query.to);
          if (request.query.legalAreaId) add('lr.legal_area_id = ?', request.query.legalAreaId);
          const requestWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
          return query(`SELECT COUNT(*)::int AS total FROM legal_requests lr ${requestWhere}`, requestValues);
        })(),
      ]);

      return {
        generatedAt: new Date().toISOString(),
        totals: { ...summaryResult.rows[0].totals, requests: requestResult.rows[0].total },
        casesByStatus: summaryResult.rows[0].casesByStatus,
        casesByArea: summaryResult.rows[0].casesByArea,
        tasksByStatus: summaryResult.rows[0].tasksByStatus,
        workload: summaryResult.rows[0].workload,
      };
    },
  );

  app.get(
    '/cases.csv',
    {
      preHandler: [authenticate, requirePermission('reports.read')],
      schema: { querystring: { type: 'object', additionalProperties: false, properties: filterSchema } },
    },
    async (request, reply) => {
      validateDates(request.query);
      const { where, values } = buildCaseFilter(request.query);
      const rows = await withTransaction(async (client) => {
        const result = await client.query(
          `SELECT
             c.case_number AS "caseNumber", c.title, p.full_name AS client, la.name AS "legalArea",
             pr.name AS priority, cs.name AS status, COALESCE(u.full_name, 'Sin asignar') AS assignee,
             TO_CHAR(c.opened_date, 'YYYY-MM-DD') AS "openedDate", c.external_reference AS "externalReference", c.authority,
             COALESCE(tc.active_tasks, 0)::int AS "activeTasks",
             COALESCE(tc.overdue_tasks, 0)::int AS "overdueTasks",
             COALESCE(dc.current_documents, 0)::int AS "currentDocuments",
             COALESCE(ac.actions, 0)::int AS actions
           FROM cases c
           JOIN people p ON p.id = c.person_id
           JOIN legal_areas la ON la.id = c.legal_area_id
           JOIN priorities pr ON pr.id = c.priority_id
           JOIN case_statuses cs ON cs.id = c.status_id
           LEFT JOIN case_assignments ca ON ca.case_id = c.id AND ca.unassigned_at IS NULL
           LEFT JOIN users u ON u.id = ca.user_id
           LEFT JOIN LATERAL (
             SELECT COUNT(*) FILTER (WHERE NOT ts.terminal) AS active_tasks,
               COUNT(*) FILTER (WHERE NOT ts.terminal AND t.due_at < NOW()) AS overdue_tasks
             FROM tasks t JOIN task_statuses ts ON ts.id = t.status_id WHERE t.case_id = c.id
           ) tc ON TRUE
           LEFT JOIN LATERAL (
             SELECT COUNT(*) AS current_documents FROM documents d WHERE d.case_id = c.id AND d.is_current
           ) dc ON TRUE
           LEFT JOIN LATERAL (
             SELECT COUNT(*) AS actions FROM legal_actions a WHERE a.case_id = c.id
           ) ac ON TRUE
           ${where}
           ORDER BY c.opened_date DESC, c.case_number`,
          values,
        );
        await writeAudit(client, request, {
          action: 'report.export', entityType: 'report',
          details: { report: 'cases', filters: request.query, rows: result.rowCount },
        });
        return result.rows;
      });

      const date = new Date().toISOString().slice(0, 10);
      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="reporte-expedientes-${date}.csv"`)
        .send(toCsv(rows));
    },
  );
}
