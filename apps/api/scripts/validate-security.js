import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import argon2 from 'argon2';
import { buildApp } from '../src/app.js';
import { pool, withTransaction } from '../src/db.js';

const fixture = { userId: null, email: null, password: `Segura-${crypto.randomBytes(8).toString('hex')}!` };
let app;

async function setup() {
  fixture.email = `security-${Date.now()}@legaldesk.test`;
  const passwordHash = await argon2.hash(fixture.password, { type: argon2.argon2id });
  await withTransaction(async (client) => {
    const roleId = (await client.query("SELECT id FROM roles WHERE code = 'administrator'")).rows[0].id;
    fixture.userId = (await client.query(
      `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
       VALUES ($1, 'Validación Seguridad', $2, TRUE, FALSE) RETURNING id`,
      [fixture.email, passwordHash],
    )).rows[0].id;
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [fixture.userId, roleId]);
  });
}

async function validateHeadersAndSession() {
  app = await buildApp({ logger: false });
  await app.ready();
  const anonymous = await app.inject({ method: 'GET', url: '/api/v1/reports/overview' });
  assert.equal(anonymous.statusCode, 401, anonymous.body);
  assert.equal(anonymous.headers['x-content-type-options'], 'nosniff');
  assert.equal(anonymous.headers['x-frame-options'], 'SAMEORIGIN');

  const malformed = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'correo-no-valido', password: fixture.password } });
  assert.equal(malformed.statusCode, 400, malformed.body);

  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: fixture.email, password: fixture.password } });
  assert.equal(login.statusCode, 200, login.body);
  const cookie = login.headers['set-cookie'];
  assert.match(cookie, /legaldesk_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.ok(!cookie.includes(fixture.password));
  await app.close();
  app = null;
}

async function validateLoginThrottle() {
  app = await buildApp({ logger: false });
  await app.ready();
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: fixture.email, password: 'incorrecta-segura' } });
    assert.equal(response.statusCode, attempt <= 5 ? 401 : 429, `Intento ${attempt}: ${response.body}`);
  }
}

function validateProductionGuardrails() {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', "import './src/config.js'"], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', COOKIE_SECURE: 'false', WEB_ORIGIN: 'http://inseguro.local' },
  });
  assert.notEqual(result.status, 0, 'La configuración insegura de producción debe impedir el arranque.');
  assert.match(`${result.stderr}${result.stdout}`, /COOKIE_SECURE|producción/);
}

async function cleanup() {
  if (!fixture.userId) return;
  await withTransaction(async (client) => {
    await client.query('DELETE FROM audit_logs WHERE user_id = $1', [fixture.userId]);
    await client.query('DELETE FROM users WHERE id = $1', [fixture.userId]);
  });
}

try {
  await setup(); await validateHeadersAndSession(); await validateLoginThrottle(); validateProductionGuardrails();
  console.log('Sesión, cabeceras, validación y limitación de acceso verificadas correctamente.');
} finally {
  if (app) await app.close(); await cleanup(); await pool.end();
}
