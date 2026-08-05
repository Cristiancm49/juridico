import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const fixture = {
  userIds: [],
  actorId: null,
  readonlyId: null,
  lawyerId: null,
  internId: null,
  personId: null,
  caseId: null,
  legalAreaId: null,
  priorityId: null,
  tokens: {},
};
let app;

async function createFixtures() {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  await withTransaction(async (client) => {
    const rolesResult = await client.query(
      "SELECT id, code FROM roles WHERE code IN ('administrator', 'administrative', 'lawyer', 'intern')",
    );
    const roles = Object.fromEntries(rolesResult.rows.map(({ code, id }) => [code, id]));
    const areaResult = await client.query("SELECT id FROM legal_areas WHERE code = 'civil'");
    const priorityResult = await client.query("SELECT id FROM priorities WHERE code = 'medium'");
    fixture.legalAreaId = areaResult.rows[0].id;
    fixture.priorityId = priorityResult.rows[0].id;

    for (const roleCode of ['administrator', 'administrative', 'lawyer', 'intern']) {
      const userResult = await client.query(
        `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
         VALUES ($1, $2, 'not-used-by-this-test', TRUE, FALSE)
         RETURNING id`,
        [`tracking-${roleCode}-${suffix}@legaldesk.test`, `Seguimiento ${roleCode}`],
      );
      const userId = userResult.rows[0].id;
      fixture.userIds.push(userId);
      fixture[`${roleCode === 'administrator' ? 'actor' : roleCode === 'administrative' ? 'readonly' : roleCode}Id`] = userId;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roles[roleCode]]);
      if (['administrator', 'administrative'].includes(roleCode)) {
        const token = createSessionToken();
        fixture.tokens[roleCode] = token;
        await client.query(
          `INSERT INTO sessions (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
          [userId, hashSessionToken(token)],
        );
      }
    }

    const personResult = await client.query(
      `INSERT INTO people
        (person_type, document_type, document_number, full_name, active, created_by, updated_by)
       VALUES ('natural', 'CC', $1, 'Cliente seguimiento', TRUE, $2, $2)
       RETURNING id`,
      [`TRACK-${suffix}`, fixture.actorId],
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
  const statusCatalog = await requestAs('administrator', 'GET', '/api/v1/catalogs/case-statuses');
  assert.equal(statusCatalog.statusCode, 200);
  assert.deepEqual(
    statusCatalog.json().caseStatuses.map(({ code }) => code),
    ['open', 'in_progress', 'on_hold', 'closed', 'archived'],
  );

  const assignees = await requestAs('administrator', 'GET', '/api/v1/cases/assignees');
  assert.equal(assignees.statusCode, 200);
  const assigneeIds = assignees.json().assignees.map(({ id }) => id);
  assert.ok(assigneeIds.includes(fixture.lawyerId));
  assert.ok(assigneeIds.includes(fixture.internId));
  assert.ok(!assigneeIds.includes(fixture.readonlyId));

  const created = await requestAs('administrator', 'POST', '/api/v1/cases', {
    personId: fixture.personId,
    legalAreaId: fixture.legalAreaId,
    priorityId: fixture.priorityId,
    title: 'Expediente para seguimiento',
    description: 'Expediente creado para validar asignaciones y cambios de estado.',
    openedDate: new Date().toISOString().slice(0, 10),
  });
  assert.equal(created.statusCode, 201, created.body);
  fixture.caseId = created.json().case.id;
  assert.equal(created.json().case.assignee, null);

  const withoutAssignee = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/status`, {
    statusCode: 'in_progress',
  });
  assert.equal(withoutAssignee.statusCode, 400, withoutAssignee.body);

  const assigned = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/assign`, {
    userId: fixture.lawyerId,
    comment: 'Asignación principal.',
  });
  assert.equal(assigned.statusCode, 200, assigned.body);
  assert.equal(assigned.json().case.assignee.id, fixture.lawyerId);

  const repeated = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/assign`, {
    userId: fixture.lawyerId,
  });
  assert.equal(repeated.statusCode, 400, repeated.body);

  const reassigned = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/assign`, {
    userId: fixture.internId,
    comment: 'Apoyo bajo supervisión.',
  });
  assert.equal(reassigned.statusCode, 200, reassigned.body);
  assert.equal(reassigned.json().case.assignee.id, fixture.internId);

  const filtered = await requestAs('administrator', 'GET', `/api/v1/cases?assigneeId=${fixture.internId}&status=open`);
  assert.equal(filtered.statusCode, 200);
  assert.ok(filtered.json().cases.some(({ id }) => id === fixture.caseId));

  const progressing = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/status`, {
    statusCode: 'in_progress',
    comment: 'Se inicia el trabajo jurídico.',
  });
  assert.equal(progressing.statusCode, 200, progressing.body);
  assert.equal(progressing.json().case.status.code, 'in_progress');

  const paused = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/status`, {
    statusCode: 'on_hold',
    comment: 'Pendiente de información del cliente.',
  });
  assert.equal(paused.statusCode, 200, paused.body);
  assert.equal(paused.json().case.status.code, 'on_hold');

  const invalid = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/status`, {
    statusCode: 'archived',
  });
  assert.equal(invalid.statusCode, 400, invalid.body);

  const detail = await requestAs('administrator', 'GET', `/api/v1/cases/${fixture.caseId}`);
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().assignmentHistory.length, 2);
  assert.deepEqual(
    detail.json().statusHistory.map(({ toStatus }) => toStatus.code),
    ['on_hold', 'in_progress', 'open'],
  );

  const forbiddenAssign = await requestAs('administrative', 'POST', `/api/v1/cases/${fixture.caseId}/assign`, {
    userId: fixture.lawyerId,
  });
  assert.equal(forbiddenAssign.statusCode, 403);
  const forbiddenStatus = await requestAs('administrative', 'POST', `/api/v1/cases/${fixture.caseId}/status`, {
    statusCode: 'closed',
  });
  assert.equal(forbiddenStatus.statusCode, 403);
}

async function cleanup() {
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
  console.log('Asignaciones y estados de expedientes validados correctamente.');
} catch (error) {
  console.error('Falló la validación de seguimiento de expedientes:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
}
