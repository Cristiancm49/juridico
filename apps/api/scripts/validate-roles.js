import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const expectedPermissions = {
  administrator: [
    'actions.write',
    'audit.read',
    'cases.assign',
    'cases.read',
    'cases.write',
    'documents.read',
    'documents.write',
    'reports.read',
    'requests.assign',
    'requests.read',
    'requests.write',
    'roles.manage',
    'tasks.read',
    'tasks.write',
    'users.manage',
    'users.read',
  ],
  lawyer: [
    'actions.write',
    'cases.assign',
    'cases.read',
    'cases.write',
    'documents.read',
    'documents.write',
    'reports.read',
    'requests.assign',
    'requests.read',
    'requests.write',
    'tasks.read',
    'tasks.write',
  ],
  intern: [
    'actions.write',
    'cases.read',
    'documents.read',
    'documents.write',
    'requests.read',
    'requests.write',
    'tasks.read',
    'tasks.write',
  ],
  administrative: [
    'cases.read',
    'documents.read',
    'documents.write',
    'reports.read',
    'requests.read',
    'requests.write',
    'tasks.read',
    'users.read',
  ],
};

const routeExpectations = {
  administrator: { users: 200, roles: 200, permissions: 200, audit: 200 },
  lawyer: { users: 403, roles: 200, permissions: 403, audit: 403 },
  intern: { users: 403, roles: 200, permissions: 403, audit: 403 },
  administrative: { users: 200, roles: 200, permissions: 403, audit: 403 },
};

const temporaryUsers = [];
let app;

function sorted(values) {
  return [...values].sort();
}

async function createFixtures() {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const passwordHash = await argon2.hash(`Roles-${crypto.randomBytes(16).toString('hex')}`, {
    type: argon2.argon2id,
  });

  await withTransaction(async (client) => {
    for (const roleCode of Object.keys(expectedPermissions)) {
      const roleResult = await client.query(
        `SELECT r.id, COALESCE(array_agg(p.code ORDER BY p.code) FILTER (WHERE p.id IS NOT NULL), '{}') AS permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
         WHERE r.code = $1
         GROUP BY r.id`,
        [roleCode],
      );
      assert.equal(roleResult.rowCount, 1, `No existe el rol ${roleCode}.`);
      assert.deepEqual(
        sorted(roleResult.rows[0].permissions),
        sorted(expectedPermissions[roleCode]),
        `La matriz de permisos de ${roleCode} no coincide.`,
      );

      const userResult = await client.query(
        `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
         VALUES ($1, $2, $3, TRUE, FALSE)
         RETURNING id`,
        [`roles-${roleCode}-${suffix}@legaldesk.test`, `Prueba ${roleCode}`, passwordHash],
      );
      const userId = userResult.rows[0].id;
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [userId, roleResult.rows[0].id],
      );

      const token = createSessionToken();
      await client.query(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
        [userId, hashSessionToken(token)],
      );
      temporaryUsers.push({ roleCode, userId, token });
    }
  });
}

async function requestAs(token, url) {
  return app.inject({
    method: 'GET',
    url,
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

async function validateRole({ roleCode, token }) {
  const expectations = routeExpectations[roleCode];
  const checks = [
    ['me', '/api/v1/auth/me', 200],
    ['users', '/api/v1/users', expectations.users],
    ['roles', '/api/v1/roles', expectations.roles],
    ['permissions', '/api/v1/roles/permissions', expectations.permissions],
    ['audit', '/api/v1/audit', expectations.audit],
  ];
  const result = {};

  for (const [name, url, expectedStatus] of checks) {
    const response = await requestAs(token, url);
    assert.equal(
      response.statusCode,
      expectedStatus,
      `${roleCode}: ${url} respondió ${response.statusCode}; se esperaba ${expectedStatus}.`,
    );
    result[name] = response.statusCode;

    if (name === 'me') {
      const body = response.json();
      assert.deepEqual(
        sorted(body.user.permissions),
        sorted(expectedPermissions[roleCode]),
        `${roleCode}: los permisos de la sesión no coinciden.`,
      );
    }
  }

  return result;
}

async function cleanup() {
  const ids = temporaryUsers.map(({ userId }) => userId);
  if (ids.length) {
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
  }
}

try {
  await createFixtures();
  app = await buildApp({ logger: false });

  const results = {};
  for (const fixture of temporaryUsers) {
    results[fixture.roleCode] = await validateRole(fixture);
  }

  console.log('Matriz de roles y autorización validada correctamente.');
  console.table(results);
} catch (error) {
  console.error('Falló la validación de roles:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
}
