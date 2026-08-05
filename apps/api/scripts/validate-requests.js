import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const fixture = {
  userId: null,
  personId: null,
  requestId: null,
  legalAreaId: null,
  priorityId: null,
  token: createSessionToken(),
};
let app;

async function createFixtures() {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  await withTransaction(async (client) => {
    const roleResult = await client.query("SELECT id FROM roles WHERE code = 'administrator'");
    const areaResult = await client.query("SELECT id FROM legal_areas WHERE code = 'civil'");
    const priorityResult = await client.query("SELECT id FROM priorities WHERE code = 'high'");
    assert.equal(roleResult.rowCount, 1);
    assert.equal(areaResult.rowCount, 1);
    assert.equal(priorityResult.rowCount, 1);
    fixture.legalAreaId = areaResult.rows[0].id;
    fixture.priorityId = priorityResult.rows[0].id;

    const userResult = await client.query(
      `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
       VALUES ($1, 'Prueba solicitudes', 'not-used-by-this-test', TRUE, FALSE)
       RETURNING id`,
      [`requests-${suffix}@legaldesk.test`],
    );
    fixture.userId = userResult.rows[0].id;
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [fixture.userId, roleResult.rows[0].id]);
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [fixture.userId, hashSessionToken(fixture.token)],
    );

    const personResult = await client.query(
      `INSERT INTO people
        (person_type, document_type, document_number, full_name, active, created_by, updated_by)
       VALUES ('natural', 'CC', $1, 'Cliente prueba solicitudes', TRUE, $2, $2)
       RETURNING id`,
      [`REQ-${suffix}`, fixture.userId],
    );
    fixture.personId = personResult.rows[0].id;
  });
}

function request(method, url, payload) {
  return app.inject({
    method,
    url,
    payload,
    headers: { cookie: `${SESSION_COOKIE}=${fixture.token}` },
  });
}

async function validate() {
  const statuses = await request('GET', '/api/v1/catalogs/request-statuses');
  assert.equal(statuses.statusCode, 200);
  assert.deepEqual(
    statuses.json().requestStatuses.map(({ code }) => code),
    ['received', 'in_review', 'approved', 'rejected', 'converted'],
  );

  const created = await request('POST', '/api/v1/requests', {
    personId: fixture.personId,
    legalAreaId: fixture.legalAreaId,
    priorityId: fixture.priorityId,
    subject: 'Validación de contrato de arrendamiento',
    description: 'El cliente solicita revisar las obligaciones incluidas en el contrato.',
    source: 'email',
    receivedDate: new Date().toISOString().slice(0, 10),
  });
  assert.equal(created.statusCode, 201, created.body);
  fixture.requestId = created.json().request.id;
  assert.match(created.json().request.requestNumber, /^SOL-\d{4}-\d{6}$/);
  assert.equal(created.json().request.status.code, 'received');

  const found = await request('GET', `/api/v1/requests?search=${created.json().request.requestNumber}`);
  assert.equal(found.statusCode, 200);
  assert.equal(found.json().pagination.total, 1);

  const reviewing = await request('PATCH', `/api/v1/requests/${fixture.requestId}`, {
    statusCode: 'in_review',
    changeComment: 'Se inició la revisión jurídica.',
  });
  assert.equal(reviewing.statusCode, 200, reviewing.body);
  assert.equal(reviewing.json().request.status.code, 'in_review');

  const approved = await request('PATCH', `/api/v1/requests/${fixture.requestId}`, {
    statusCode: 'approved',
    changeComment: 'La solicitud cumple los criterios de admisión.',
  });
  assert.equal(approved.statusCode, 200, approved.body);
  assert.equal(approved.json().request.status.code, 'approved');

  const invalid = await request('PATCH', `/api/v1/requests/${fixture.requestId}`, {
    statusCode: 'rejected',
  });
  assert.equal(invalid.statusCode, 400, invalid.body);

  const detail = await request('GET', `/api/v1/requests/${fixture.requestId}`);
  assert.equal(detail.statusCode, 200);
  assert.deepEqual(
    detail.json().statusHistory.map(({ toStatus }) => toStatus.code),
    ['approved', 'in_review', 'received'],
  );

  const filtered = await request('GET', '/api/v1/requests?status=approved');
  assert.equal(filtered.statusCode, 200);
  assert.ok(filtered.json().requests.some(({ id }) => id === fixture.requestId));

  const auditResult = await pool.query(
    `SELECT action FROM audit_logs
     WHERE entity_type = 'legal_request' AND entity_id = $1
     ORDER BY id`,
    [fixture.requestId],
  );
  assert.deepEqual(auditResult.rows.map(({ action }) => action), [
    'request.create',
    'request.status_change',
    'request.update',
    'request.status_change',
    'request.update',
  ]);
}

async function cleanup() {
  if (fixture.requestId) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'legal_request' AND entity_id = $1", [fixture.requestId]);
    await pool.query('DELETE FROM legal_requests WHERE id = $1', [fixture.requestId]);
  }
  if (fixture.personId) await pool.query('DELETE FROM people WHERE id = $1', [fixture.personId]);
  if (fixture.userId) await pool.query('DELETE FROM users WHERE id = $1', [fixture.userId]);
}

try {
  await createFixtures();
  app = await buildApp({ logger: false });
  await validate();
  console.log('Registro, consulta y estados de solicitudes validados correctamente.');
} catch (error) {
  console.error('Falló la validación de solicitudes:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
}
