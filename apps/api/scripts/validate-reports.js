import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const fixture = { userIds: [], tokens: {}, personId: null, requestId: null, caseId: null, taskId: null, documentId: null, actionId: null };
let app;

async function createFixtures() {
  const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  await withTransaction(async (client) => {
    const rolesResult = await client.query("SELECT id, code FROM roles WHERE code IN ('administrator', 'lawyer', 'intern')");
    const roles = Object.fromEntries(rolesResult.rows.map(({ id, code }) => [code, id]));
    for (const roleCode of ['administrator', 'lawyer', 'intern']) {
      const user = await client.query(
        `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
         VALUES ($1, $2, 'not-used', TRUE, FALSE) RETURNING id`,
        [`reports-${roleCode}-${suffix}@legaldesk.test`, `Reportes ${roleCode}`],
      );
      const userId = user.rows[0].id;
      fixture.userIds.push(userId);
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roles[roleCode]]);
      const token = createSessionToken();
      fixture.tokens[roleCode] = token;
      await client.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '20 minutes')", [userId, hashSessionToken(token)]);
    }

    const area = await client.query("SELECT id FROM legal_areas WHERE code = 'civil'");
    const priority = await client.query("SELECT id FROM priorities WHERE code = 'medium'");
    const caseStatus = await client.query("SELECT id FROM case_statuses WHERE code = 'open'");
    const requestStatus = await client.query("SELECT id FROM request_statuses WHERE code = 'received'");
    const taskStatus = await client.query("SELECT id FROM task_statuses WHERE code = 'pending'");
    const actionType = await client.query("SELECT id FROM action_types WHERE code = 'review'");
    const documentCategory = await client.query("SELECT id FROM document_categories WHERE code = 'evidence'");
    const actorId = fixture.userIds[0];
    const lawyerId = fixture.userIds[1];
    const person = await client.query(
      `INSERT INTO people (person_type, document_type, document_number, full_name, active, created_by, updated_by)
       VALUES ('natural', 'CC', $1, 'Cliente reportes', TRUE, $2, $2) RETURNING id`,
      [`REPORT-${suffix}`, actorId],
    );
    fixture.personId = person.rows[0].id;
    const legalRequest = await client.query(
      `INSERT INTO legal_requests (request_number, person_id, legal_area_id, priority_id, status_id, subject, description, source, received_date, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, 'Consulta para reporte', 'Solicitud incluida en la validación de indicadores.', 'email', CURRENT_DATE, $6, $6) RETURNING id`,
      [`SOL-REPORT-${suffix}`, fixture.personId, area.rows[0].id, priority.rows[0].id, requestStatus.rows[0].id, actorId],
    );
    fixture.requestId = legalRequest.rows[0].id;
    const legalCase = await client.query(
      `INSERT INTO cases (case_number, person_id, legal_area_id, priority_id, status_id, title, description, opened_date, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, '=SUM(A1:A2) Reporte seguro', 'Expediente para validar reportes y exportación segura.', CURRENT_DATE, $6, $6) RETURNING id`,
      [`EXP-REPORT-${suffix}`, fixture.personId, area.rows[0].id, priority.rows[0].id, caseStatus.rows[0].id, actorId],
    );
    fixture.caseId = legalCase.rows[0].id;
    await client.query('INSERT INTO case_assignments (case_id, user_id, assigned_by) VALUES ($1, $2, $3)', [fixture.caseId, lawyerId, actorId]);
    fixture.taskId = (await client.query(
      `INSERT INTO tasks (case_id, assignee_id, priority_id, status_id, title, due_at, created_by, updated_by)
       VALUES ($1, $2, $3, $4, 'Tarea vencida de reporte', NOW() - INTERVAL '1 day', $5, $5) RETURNING id`,
      [fixture.caseId, lawyerId, priority.rows[0].id, taskStatus.rows[0].id, actorId],
    )).rows[0].id;
    fixture.actionId = (await client.query(
      `INSERT INTO legal_actions (case_id, action_type_id, title, description, occurred_at, created_by, updated_by)
       VALUES ($1, $2, 'Revisión para reporte', 'Actuación incluida en la validación automática.', NOW(), $3, $3) RETURNING id`,
      [fixture.caseId, actionType.rows[0].id, actorId],
    )).rows[0].id;
    fixture.documentId = (await client.query(
      `INSERT INTO documents (case_id, category_id, original_name, storage_key, mime_type, extension, size_bytes, sha256, uploaded_by)
       VALUES ($1, $2, 'soporte.pdf', $3, 'application/pdf', 'pdf', 1, $4, $5) RETURNING id`,
      [fixture.caseId, documentCategory.rows[0].id, `reports/${suffix}.pdf`, 'a'.repeat(64), actorId],
    )).rows[0].id;
  });
}

function requestAs(role, method, url) {
  return app.inject({ method, url, headers: { cookie: `${SESSION_COOKIE}=${fixture.tokens[role]}` } });
}

async function validate() {
  const options = await requestAs('administrator', 'GET', '/api/v1/reports/options');
  assert.equal(options.statusCode, 200, options.body);
  assert.ok(options.json().assignees.some(({ id }) => id === fixture.userIds[1]));

  const overview = await requestAs('administrator', 'GET', `/api/v1/reports/overview?assigneeId=${fixture.userIds[1]}`);
  assert.equal(overview.statusCode, 200, overview.body);
  assert.equal(overview.json().totals.totalCases, 1);
  assert.equal(overview.json().totals.activeCases, 1);
  assert.equal(overview.json().totals.activeTasks, 1);
  assert.equal(overview.json().totals.overdueTasks, 1);
  assert.equal(overview.json().totals.currentDocuments, 1);
  assert.equal(overview.json().totals.actions, 1);
  assert.equal(overview.json().workload[0].fullName, 'Reportes lawyer');

  const invalidDates = await requestAs('administrator', 'GET', '/api/v1/reports/overview?from=2026-08-05&to=2026-01-01');
  assert.equal(invalidDates.statusCode, 400, invalidDates.body);

  const forbidden = await requestAs('intern', 'GET', '/api/v1/reports/overview');
  assert.equal(forbidden.statusCode, 403, forbidden.body);

  const csv = await requestAs('administrator', 'GET', `/api/v1/reports/cases.csv?assigneeId=${fixture.userIds[1]}`);
  assert.equal(csv.statusCode, 200, csv.body);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.match(csv.headers['content-disposition'], /reporte-expedientes/);
  assert.ok(csv.body.startsWith('\uFEFF'));
  assert.ok(csv.body.includes("\"'=SUM(A1:A2) Reporte seguro\""), 'El CSV debe neutralizar fórmulas.');
  const audit = await pool.query("SELECT details FROM audit_logs WHERE user_id = $1 AND action = 'report.export' ORDER BY created_at DESC LIMIT 1", [fixture.userIds[0]]);
  assert.equal(audit.rowCount, 1);
  assert.equal(audit.rows[0].details.rows, 1);
}

async function cleanup() {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM audit_logs WHERE user_id = ANY($1::uuid[]) AND action = 'report.export'", [fixture.userIds]);
    if (fixture.documentId) await client.query('DELETE FROM documents WHERE id = $1', [fixture.documentId]);
    if (fixture.actionId) await client.query('DELETE FROM legal_actions WHERE id = $1', [fixture.actionId]);
    if (fixture.taskId) await client.query('DELETE FROM tasks WHERE id = $1', [fixture.taskId]);
    if (fixture.caseId) await client.query('DELETE FROM cases WHERE id = $1', [fixture.caseId]);
    if (fixture.requestId) await client.query('DELETE FROM legal_requests WHERE id = $1', [fixture.requestId]);
    if (fixture.personId) await client.query('DELETE FROM people WHERE id = $1', [fixture.personId]);
    if (fixture.userIds.length) await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [fixture.userIds]);
  });
}

try {
  await createFixtures(); app = await buildApp({ logger: false }); await app.ready(); await validate();
  console.log('Validación de reportes completada correctamente.');
} finally {
  if (app) await app.close(); await cleanup(); await pool.end();
}
