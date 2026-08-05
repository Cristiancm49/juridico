import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const fixture = {
  userId: null,
  personId: null,
  token: createSessionToken(),
};
let app;

async function createSession() {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  await withTransaction(async (client) => {
    const roleResult = await client.query("SELECT id FROM roles WHERE code = 'administrator'");
    assert.equal(roleResult.rowCount, 1, 'No existe el rol administrator.');
    const userResult = await client.query(
      `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
       VALUES ($1, 'Prueba admisiones', 'not-used-by-this-test', TRUE, FALSE)
       RETURNING id`,
      [`intake-${suffix}@legaldesk.test`],
    );
    fixture.userId = userResult.rows[0].id;
    await client.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
      [fixture.userId, roleResult.rows[0].id],
    );
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [fixture.userId, hashSessionToken(fixture.token)],
    );
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
  const areas = await request('GET', '/api/v1/catalogs/legal-areas');
  assert.equal(areas.statusCode, 200);
  assert.ok(areas.json().legalAreas.length >= 7, 'Faltan áreas jurídicas iniciales.');

  const priorities = await request('GET', '/api/v1/catalogs/priorities');
  assert.equal(priorities.statusCode, 200);
  assert.deepEqual(
    priorities.json().priorities.map(({ code }) => code),
    ['urgent', 'high', 'medium', 'low'],
  );

  const documentNumber = `TEST-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const payload = {
    personType: 'natural',
    documentType: 'CC',
    documentNumber,
    fullName: 'Persona de validación',
    email: 'PERSONA.PRUEBA@EXAMPLE.COM',
    phone: '300 000 0000',
    city: 'Bogotá',
  };
  const created = await request('POST', '/api/v1/people', payload);
  assert.equal(created.statusCode, 201, created.body);
  fixture.personId = created.json().person.id;
  assert.equal(created.json().person.email, 'persona.prueba@example.com');

  const duplicate = await request('POST', '/api/v1/people', payload);
  assert.equal(duplicate.statusCode, 409, duplicate.body);

  const found = await request('GET', `/api/v1/people?search=${encodeURIComponent(documentNumber)}`);
  assert.equal(found.statusCode, 200);
  assert.equal(found.json().pagination.total, 1);
  assert.equal(found.json().people[0].id, fixture.personId);

  const updated = await request('PATCH', `/api/v1/people/${fixture.personId}`, {
    city: 'Medellín',
    email: '',
    active: false,
  });
  assert.equal(updated.statusCode, 200, updated.body);
  assert.equal(updated.json().person.city, 'Medellín');
  assert.equal(updated.json().person.email, null);
  assert.equal(updated.json().person.active, false);

  const inactive = await request('GET', '/api/v1/people?active=false');
  assert.equal(inactive.statusCode, 200);
  assert.ok(inactive.json().people.some(({ id }) => id === fixture.personId));

  const auditResult = await pool.query(
    `SELECT action FROM audit_logs
     WHERE entity_type = 'person' AND entity_id = $1
     ORDER BY id`,
    [fixture.personId],
  );
  assert.deepEqual(auditResult.rows.map(({ action }) => action), ['person.create', 'person.update']);
}

async function cleanup() {
  if (fixture.personId) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'person' AND entity_id = $1", [fixture.personId]);
    await pool.query('DELETE FROM people WHERE id = $1', [fixture.personId]);
  }
  if (fixture.userId) await pool.query('DELETE FROM users WHERE id = $1', [fixture.userId]);
}

try {
  await createSession();
  app = await buildApp({ logger: false });
  await validate();
  console.log('Personas, áreas jurídicas y prioridades validadas correctamente.');
} catch (error) {
  console.error('Falló la validación de admisiones:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
}
