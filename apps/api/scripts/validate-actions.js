import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const fixture = {
  userIds: [],
  actorId: null,
  internId: null,
  readonlyId: null,
  personId: null,
  caseId: null,
  actionId: null,
  legalAreaId: null,
  priorityId: null,
  tokens: {},
};
let app;

async function createFixtures() {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  await withTransaction(async (client) => {
    const rolesResult = await client.query(
      "SELECT id, code FROM roles WHERE code IN ('administrator', 'administrative', 'intern')",
    );
    const roles = Object.fromEntries(rolesResult.rows.map(({ code, id }) => [code, id]));
    const areaResult = await client.query("SELECT id FROM legal_areas WHERE code = 'civil'");
    const priorityResult = await client.query("SELECT id FROM priorities WHERE code = 'medium'");
    fixture.legalAreaId = areaResult.rows[0].id;
    fixture.priorityId = priorityResult.rows[0].id;

    for (const roleCode of ['administrator', 'intern', 'administrative']) {
      const userResult = await client.query(
        `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
         VALUES ($1, $2, 'not-used-by-this-test', TRUE, FALSE)
         RETURNING id`,
        [`actions-${roleCode}-${suffix}@legaldesk.test`, `Actuaciones ${roleCode}`],
      );
      const userId = userResult.rows[0].id;
      fixture.userIds.push(userId);
      if (roleCode === 'administrator') fixture.actorId = userId;
      if (roleCode === 'intern') fixture.internId = userId;
      if (roleCode === 'administrative') fixture.readonlyId = userId;
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
       VALUES ('natural', 'CC', $1, 'Cliente actuaciones', TRUE, $2, $2)
       RETURNING id`,
      [`ACTION-${suffix}`, fixture.actorId],
    );
    fixture.personId = personResult.rows[0].id;
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
  const catalog = await requestAs('administrator', 'GET', '/api/v1/catalogs/action-types');
  assert.equal(catalog.statusCode, 200, catalog.body);
  assert.equal(catalog.json().actionTypes.length, 8);
  const reviewType = catalog.json().actionTypes.find(({ code }) => code === 'review');
  assert.ok(reviewType);

  const createdCase = await requestAs('administrator', 'POST', '/api/v1/cases', {
    personId: fixture.personId,
    legalAreaId: fixture.legalAreaId,
    priorityId: fixture.priorityId,
    title: 'Expediente con actuaciones',
    description: 'Expediente creado para validar su línea de tiempo jurídica.',
    openedDate: new Date().toISOString().slice(0, 10),
  });
  assert.equal(createdCase.statusCode, 201, createdCase.body);
  fixture.caseId = createdCase.json().case.id;

  const occurredAt = new Date().toISOString();
  const created = await requestAs('intern', 'POST', `/api/v1/cases/${fixture.caseId}/actions`, {
    actionTypeId: reviewType.id,
    title: 'Revisión inicial del expediente',
    description: 'Se revisaron los antecedentes y documentos iniciales del asunto.',
    occurredAt,
  });
  assert.equal(created.statusCode, 201, created.body);
  fixture.actionId = created.json().action.id;
  assert.equal(created.json().action.actionType.code, 'review');
  assert.equal(created.json().action.author.id, fixture.internId);

  const invalidText = await requestAs('intern', 'POST', `/api/v1/cases/${fixture.caseId}/actions`, {
    actionTypeId: reviewType.id,
    title: '     ',
    description: '          ',
    occurredAt,
  });
  assert.equal(invalidText.statusCode, 400, invalidText.body);

  const readOnlyList = await requestAs('administrative', 'GET', `/api/v1/cases/${fixture.caseId}/actions?typeCode=review`);
  assert.equal(readOnlyList.statusCode, 200, readOnlyList.body);
  assert.equal(readOnlyList.json().pagination.total, 1);
  assert.equal(readOnlyList.json().actions[0].id, fixture.actionId);

  const updated = await requestAs('intern', 'PATCH', `/api/v1/cases/${fixture.caseId}/actions/${fixture.actionId}`, {
    result: 'Se identificaron los documentos faltantes para continuar.',
  });
  assert.equal(updated.statusCode, 200, updated.body);
  assert.equal(updated.json().action.result, 'Se identificaron los documentos faltantes para continuar.');

  const forbiddenCreate = await requestAs('administrative', 'POST', `/api/v1/cases/${fixture.caseId}/actions`, {
    actionTypeId: reviewType.id,
    title: 'Actuación no permitida',
    description: 'Este usuario solo puede consultar el historial del expediente.',
    occurredAt,
  });
  assert.equal(forbiddenCreate.statusCode, 403);
  const forbiddenUpdate = await requestAs('administrative', 'PATCH', `/api/v1/cases/${fixture.caseId}/actions/${fixture.actionId}`, {
    result: 'Cambio no permitido.',
  });
  assert.equal(forbiddenUpdate.statusCode, 403);

  const auditResult = await pool.query(
    `SELECT action FROM audit_logs
     WHERE entity_type = 'legal_action' AND entity_id = $1
     ORDER BY created_at`,
    [fixture.actionId],
  );
  assert.deepEqual(auditResult.rows.map(({ action }) => action), ['legal_action.create', 'legal_action.update']);
}

async function cleanup() {
  if (fixture.actionId) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'legal_action' AND entity_id = $1", [fixture.actionId]);
  }
  if (fixture.caseId) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'case' AND entity_id = $1", [fixture.caseId]);
    await pool.query('DELETE FROM cases WHERE id = $1', [fixture.caseId]);
  }
  if (fixture.personId) await pool.query('DELETE FROM people WHERE id = $1', [fixture.personId]);
  if (fixture.userIds.length) await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [fixture.userIds]);
}

try {
  await createFixtures();
  app = await buildApp({ logger: false });
  await validate();
  console.log('Actuaciones jurídicas validadas correctamente.');
} catch (error) {
  console.error('Falló la validación de actuaciones jurídicas:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
}
