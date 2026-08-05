import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const fixture = {
  userIds: [],
  personId: null,
  requestId: null,
  caseIds: [],
  legalAreaId: null,
  priorityId: null,
  tokens: {},
};
let app;

async function createFixtures() {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  await withTransaction(async (client) => {
    const rolesResult = await client.query(
      "SELECT id, code FROM roles WHERE code IN ('administrator', 'administrative')",
    );
    const roles = Object.fromEntries(rolesResult.rows.map(({ code, id }) => [code, id]));
    assert.ok(roles.administrator && roles.administrative);
    const areaResult = await client.query("SELECT id FROM legal_areas WHERE code = 'civil'");
    const priorityResult = await client.query("SELECT id FROM priorities WHERE code = 'high'");
    const approvedResult = await client.query("SELECT id FROM request_statuses WHERE code = 'approved'");
    fixture.legalAreaId = areaResult.rows[0].id;
    fixture.priorityId = priorityResult.rows[0].id;

    for (const roleCode of ['administrator', 'administrative']) {
      const userResult = await client.query(
        `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
         VALUES ($1, $2, 'not-used-by-this-test', TRUE, FALSE)
         RETURNING id`,
        [`cases-${roleCode}-${suffix}@legaldesk.test`, `Prueba ${roleCode}`],
      );
      const userId = userResult.rows[0].id;
      fixture.userIds.push(userId);
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roles[roleCode]]);
      const token = createSessionToken();
      fixture.tokens[roleCode] = token;
      await client.query(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
        [userId, hashSessionToken(token)],
      );
    }

    const personResult = await client.query(
      `INSERT INTO people
        (person_type, document_type, document_number, full_name, active, created_by, updated_by)
       VALUES ('natural', 'CC', $1, 'Cliente prueba expedientes', TRUE, $2, $2)
       RETURNING id`,
      [`CASE-${suffix}`, fixture.userIds[0]],
    );
    fixture.personId = personResult.rows[0].id;

    const requestResult = await client.query(
      `INSERT INTO legal_requests
        (request_number, person_id, legal_area_id, priority_id, status_id, subject, description, source, received_date, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, 'Proceso contractual de prueba', 'Descripción suficiente para convertir la solicitud.', 'email', CURRENT_DATE, $6, $6)
       RETURNING id`,
      [`CASE-REQ-${suffix}`, fixture.personId, fixture.legalAreaId, fixture.priorityId, approvedResult.rows[0].id, fixture.userIds[0]],
    );
    fixture.requestId = requestResult.rows[0].id;
  });
}

function requestAs(roleCode, method, url, payload) {
  return app.inject({
    method,
    url,
    payload,
    headers: { cookie: `${SESSION_COOKIE}=${fixture.tokens[roleCode]}` },
  });
}

async function validate() {
  const converted = await requestAs('administrator', 'POST', `/api/v1/cases/from-request/${fixture.requestId}`, {
    openedDate: new Date().toISOString().slice(0, 10),
  });
  assert.equal(converted.statusCode, 201, converted.body);
  const convertedCase = converted.json().case;
  fixture.caseIds.push(convertedCase.id);
  assert.match(convertedCase.caseNumber, /^EXP-\d{4}-\d{6}$/);
  assert.equal(convertedCase.originRequest.id, fixture.requestId);
  assert.equal(convertedCase.person.id, fixture.personId);
  assert.equal(convertedCase.title, 'Proceso contractual de prueba');

  const duplicate = await requestAs('administrator', 'POST', `/api/v1/cases/from-request/${fixture.requestId}`, {});
  assert.equal(duplicate.statusCode, 409, duplicate.body);

  const originResult = await pool.query(
    `SELECT rs.code
     FROM legal_requests lr
     JOIN request_statuses rs ON rs.id = lr.status_id
     WHERE lr.id = $1`,
    [fixture.requestId],
  );
  assert.equal(originResult.rows[0].code, 'converted');

  const manual = await requestAs('administrator', 'POST', '/api/v1/cases', {
    personId: fixture.personId,
    legalAreaId: fixture.legalAreaId,
    priorityId: fixture.priorityId,
    title: 'Expediente manual de validación',
    description: 'Expediente creado directamente para comprobar el flujo manual.',
    externalReference: 'RAD-VALIDACION-001',
    authority: 'Juzgado de validación',
    openedDate: new Date().toISOString().slice(0, 10),
  });
  assert.equal(manual.statusCode, 201, manual.body);
  fixture.caseIds.push(manual.json().case.id);
  assert.equal(manual.json().case.originRequest, null);

  const updated = await requestAs('administrator', 'PATCH', `/api/v1/cases/${manual.json().case.id}`, {
    authority: 'Juzgado Primero de validación',
  });
  assert.equal(updated.statusCode, 200, updated.body);
  assert.equal(updated.json().case.authority, 'Juzgado Primero de validación');

  const found = await requestAs('administrator', 'GET', '/api/v1/cases?search=RAD-VALIDACION-001');
  assert.equal(found.statusCode, 200);
  assert.equal(found.json().pagination.total, 1);

  const readOnly = await requestAs('administrative', 'GET', '/api/v1/cases');
  assert.equal(readOnly.statusCode, 200);
  const forbiddenCreate = await requestAs('administrative', 'POST', '/api/v1/cases', {
    personId: fixture.personId,
    legalAreaId: fixture.legalAreaId,
    priorityId: fixture.priorityId,
    title: 'No debe crearse',
    description: 'Esta operación debe ser rechazada por permisos.',
    openedDate: new Date().toISOString().slice(0, 10),
  });
  assert.equal(forbiddenCreate.statusCode, 403);
  const forbiddenConversion = await requestAs('administrative', 'POST', `/api/v1/cases/from-request/${fixture.requestId}`, {});
  assert.equal(forbiddenConversion.statusCode, 403);

  const historyResult = await pool.query(
    `SELECT ts.code
     FROM legal_request_status_history h
     JOIN request_statuses ts ON ts.id = h.to_status_id
     WHERE h.request_id = $1
     ORDER BY h.id DESC
     LIMIT 1`,
    [fixture.requestId],
  );
  assert.equal(historyResult.rows[0].code, 'converted');
}

async function cleanup() {
  if (fixture.caseIds.length) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'case' AND entity_id = ANY($1::text[])", [fixture.caseIds]);
  }
  if (fixture.requestId) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'legal_request' AND entity_id = $1", [fixture.requestId]);
  }
  if (fixture.caseIds.length) await pool.query('DELETE FROM cases WHERE id = ANY($1::uuid[])', [fixture.caseIds]);
  if (fixture.requestId) await pool.query('DELETE FROM legal_requests WHERE id = $1', [fixture.requestId]);
  if (fixture.personId) await pool.query('DELETE FROM people WHERE id = $1', [fixture.personId]);
  if (fixture.userIds.length) await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [fixture.userIds]);
}

try {
  await createFixtures();
  app = await buildApp({ logger: false });
  await validate();
  console.log('Expedientes y conversión de solicitudes validados correctamente.');
} catch (error) {
  console.error('Falló la validación de expedientes:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
}
