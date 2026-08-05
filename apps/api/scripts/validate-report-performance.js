import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const fixture = { userId: null, personId: null, caseIds: [], token: null, suffix: crypto.randomBytes(5).toString('hex') };
let app;

async function setup() {
  await withTransaction(async (client) => {
    const roleId = (await client.query("SELECT id FROM roles WHERE code = 'administrator'")).rows[0].id;
    const user = await client.query("INSERT INTO users (email, full_name, password_hash, active, must_change_password) VALUES ($1, 'Rendimiento Reportes', 'not-used', TRUE, FALSE) RETURNING id", [`performance-${fixture.suffix}@legaldesk.test`]);
    fixture.userId = user.rows[0].id;
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [fixture.userId, roleId]);
    fixture.token = createSessionToken();
    await client.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '20 minutes')", [fixture.userId, hashSessionToken(fixture.token)]);
    const person = await client.query("INSERT INTO people (person_type, document_type, document_number, full_name, active, created_by, updated_by) VALUES ('natural', 'CC', $1, 'Cliente rendimiento', TRUE, $2, $2) RETURNING id", [`PERF-${fixture.suffix}`, fixture.userId]);
    fixture.personId = person.rows[0].id;
    const result = await client.query(
      `INSERT INTO cases (case_number, person_id, legal_area_id, priority_id, status_id, title, description, opened_date, created_by, updated_by)
       SELECT $1 || '-' || n, $2, la.id, p.id, cs.id, 'Expediente de rendimiento ' || n,
         'Registro generado para medir consultas agregadas de reportes.', CURRENT_DATE, $3, $3
       FROM generate_series(1, 1000) n
       CROSS JOIN (SELECT id FROM legal_areas WHERE code = 'civil') la
       CROSS JOIN (SELECT id FROM priorities WHERE code = 'medium') p
       CROSS JOIN (SELECT id FROM case_statuses WHERE code = 'open') cs
       RETURNING id`,
      [`PERF-${fixture.suffix}`, fixture.personId, fixture.userId],
    );
    fixture.caseIds = result.rows.map(({ id }) => id);
    await client.query('INSERT INTO case_assignments (case_id, user_id, assigned_by) SELECT unnest($1::uuid[]), $2, $2', [fixture.caseIds, fixture.userId]);
    await client.query(
      `INSERT INTO tasks (case_id, assignee_id, priority_id, status_id, title, due_at, created_by, updated_by)
       SELECT c.id, $2, p.id, ts.id, 'Tarea de rendimiento ' || n, NOW() + (n || ' days')::interval, $2, $2
       FROM unnest($1::uuid[]) c(id) CROSS JOIN generate_series(1, 2) n
       CROSS JOIN (SELECT id FROM priorities WHERE code = 'medium') p
       CROSS JOIN (SELECT id FROM task_statuses WHERE code = 'pending') ts`,
      [fixture.caseIds, fixture.userId],
    );
  });
}

async function timed(url) {
  const started = performance.now();
  const response = await app.inject({ method: 'GET', url, headers: { cookie: `${SESSION_COOKIE}=${fixture.token}` } });
  const elapsed = Math.round(performance.now() - started);
  assert.equal(response.statusCode, 200, response.body);
  assert.ok(elapsed < 3000, `${url} tomó ${elapsed} ms; el máximo es 3000 ms.`);
  return elapsed;
}

async function cleanup() {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM audit_logs WHERE user_id = $1 AND action = 'report.export'", [fixture.userId]);
    if (fixture.caseIds.length) {
      await client.query('DELETE FROM tasks WHERE case_id = ANY($1::uuid[])', [fixture.caseIds]);
      await client.query('DELETE FROM cases WHERE id = ANY($1::uuid[])', [fixture.caseIds]);
    }
    if (fixture.personId) await client.query('DELETE FROM people WHERE id = $1', [fixture.personId]);
    if (fixture.userId) await client.query('DELETE FROM users WHERE id = $1', [fixture.userId]);
  });
}

try {
  await setup(); app = await buildApp({ logger: false }); await app.ready();
  const overviewMs = await timed(`/api/v1/reports/overview?assigneeId=${fixture.userId}`);
  const csvMs = await timed(`/api/v1/reports/cases.csv?assigneeId=${fixture.userId}`);
  console.log(`Rendimiento validado con 1.000 expedientes y 2.000 tareas: resumen ${overviewMs} ms, CSV ${csvMs} ms.`);
} finally {
  if (app) await app.close(); await cleanup(); await pool.end();
}
