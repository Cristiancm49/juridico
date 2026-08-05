import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { config, SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';
import { deleteDocument } from '../src/storage.js';

const fixture = {
  userIds: [],
  actorId: null,
  lawyerId: null,
  personId: null,
  caseId: null,
  documentIds: [],
  legalAreaId: null,
  priorityId: null,
  tokens: {},
};
let app;

async function createFixtures() {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  await withTransaction(async (client) => {
    const rolesResult = await client.query("SELECT id, code FROM roles WHERE code IN ('administrator', 'lawyer')");
    const roles = Object.fromEntries(rolesResult.rows.map(({ code, id }) => [code, id]));
    fixture.legalAreaId = (await client.query("SELECT id FROM legal_areas WHERE code = 'civil'")).rows[0].id;
    fixture.priorityId = (await client.query("SELECT id FROM priorities WHERE code = 'medium'")).rows[0].id;

    for (const roleCode of ['administrator', 'lawyer', 'noaccess']) {
      const userResult = await client.query(
        `INSERT INTO users (email, full_name, password_hash, active, must_change_password)
         VALUES ($1, $2, 'not-used-by-this-test', TRUE, FALSE)
         RETURNING id`,
        [`documents-${roleCode}-${suffix}@legaldesk.test`, `Documentos ${roleCode}`],
      );
      const userId = userResult.rows[0].id;
      fixture.userIds.push(userId);
      if (roleCode === 'administrator') fixture.actorId = userId;
      if (roleCode === 'lawyer') fixture.lawyerId = userId;
      if (roles[roleCode]) await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roles[roleCode]]);
      const token = createSessionToken();
      fixture.tokens[roleCode] = token;
      await client.query(
        `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
        [userId, hashSessionToken(token)],
      );
    }

    const personResult = await client.query(
      `INSERT INTO people
        (person_type, document_type, document_number, full_name, active, created_by, updated_by)
       VALUES ('natural', 'CC', $1, 'Cliente documentos', TRUE, $2, $2)
       RETURNING id`,
      [`DOC-${suffix}`, fixture.actorId],
    );
    fixture.personId = personResult.rows[0].id;
  });
}

function requestAs(roleCode, method, url, payload, headers = {}) {
  return app.inject({
    method,
    url,
    payload,
    headers: { cookie: `${SESSION_COOKIE}=${fixture.tokens[roleCode]}`, ...headers },
  });
}

async function multipartPayload(fields, buffer, filename, mimetype) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value) form.append(key, value);
  });
  form.append('file', new Blob([buffer], { type: mimetype }), filename);
  const request = new Request('http://legaldesk.test/upload', { method: 'POST', body: form });
  return {
    body: Buffer.from(await request.arrayBuffer()),
    contentType: request.headers.get('content-type'),
  };
}

async function upload(roleCode, fields, buffer, filename, mimetype) {
  const multipart = await multipartPayload(fields, buffer, filename, mimetype);
  return requestAs(roleCode, 'POST', `/api/v1/cases/${fixture.caseId}/documents`, multipart.body, {
    'content-type': multipart.contentType,
  });
}

async function validate() {
  const catalog = await requestAs('administrator', 'GET', '/api/v1/catalogs/document-categories');
  assert.equal(catalog.statusCode, 200, catalog.body);
  assert.equal(catalog.json().documentCategories.length, 8);
  const evidence = catalog.json().documentCategories.find(({ code }) => code === 'evidence');

  const createdCase = await requestAs('administrator', 'POST', '/api/v1/cases', {
    personId: fixture.personId,
    legalAreaId: fixture.legalAreaId,
    priorityId: fixture.priorityId,
    title: 'Expediente documental',
    description: 'Expediente creado para validar la gestión documental privada.',
    openedDate: new Date().toISOString().slice(0, 10),
  });
  assert.equal(createdCase.statusCode, 201, createdCase.body);
  fixture.caseId = createdCase.json().case.id;

  const firstBuffer = Buffer.from('%PDF-1.7\nDocumento jurídico versión uno.\n%%EOF');
  const first = await upload('lawyer', { categoryId: evidence.id, description: 'Soporte inicial.' }, firstBuffer, 'soporte inicial.pdf', 'application/pdf');
  assert.equal(first.statusCode, 201, first.body);
  const firstDocument = first.json().document;
  fixture.documentIds.push(firstDocument.id);
  assert.equal(firstDocument.versionNumber, 1);
  assert.equal(firstDocument.isCurrent, true);
  assert.equal(firstDocument.sha256, crypto.createHash('sha256').update(firstBuffer).digest('hex'));

  const invalid = await upload('lawyer', { categoryId: evidence.id }, Buffer.from('No es un PDF'), 'engaño.pdf', 'application/pdf');
  assert.equal(invalid.statusCode, 400, invalid.body);

  const oversizedBuffer = Buffer.alloc(config.documentMaxBytes + 1);
  Buffer.from('%PDF-').copy(oversizedBuffer);
  const oversized = await upload('lawyer', { categoryId: evidence.id }, oversizedBuffer, 'demasiado-grande.pdf', 'application/pdf');
  assert.equal(oversized.statusCode, 413, oversized.body);

  const duplicate = await upload('lawyer', { categoryId: evidence.id, replacesDocumentId: firstDocument.id }, firstBuffer, 'soporte repetido.pdf', 'application/pdf');
  assert.equal(duplicate.statusCode, 409, duplicate.body);

  const secondBuffer = Buffer.from('%PDF-1.7\nDocumento jurídico versión dos con cambios.\n%%EOF');
  const second = await upload('lawyer', { categoryId: evidence.id, description: 'Versión corregida.', replacesDocumentId: firstDocument.id }, secondBuffer, 'soporte corregido.pdf', 'application/pdf');
  assert.equal(second.statusCode, 201, second.body);
  const secondDocument = second.json().document;
  fixture.documentIds.push(secondDocument.id);
  assert.equal(secondDocument.versionNumber, 2);
  assert.equal(secondDocument.documentGroupId, firstDocument.documentGroupId);

  const list = await requestAs('administrator', 'GET', `/api/v1/cases/${fixture.caseId}/documents`);
  assert.equal(list.statusCode, 200, list.body);
  assert.equal(list.json().documents.length, 2);
  assert.equal(list.json().documents.find(({ id }) => id === firstDocument.id).isCurrent, false);
  assert.equal(list.json().documents.find(({ id }) => id === secondDocument.id).isCurrent, true);

  const download = await requestAs('administrator', 'GET', `/api/v1/cases/${fixture.caseId}/documents/${firstDocument.id}/download`);
  assert.equal(download.statusCode, 200, download.body);
  assert.equal(download.headers['content-type'], 'application/pdf');
  assert.deepEqual(download.rawPayload, firstBuffer);

  const forbiddenList = await requestAs('noaccess', 'GET', `/api/v1/cases/${fixture.caseId}/documents`);
  assert.equal(forbiddenList.statusCode, 403);
  const forbiddenDownload = await requestAs('noaccess', 'GET', `/api/v1/cases/${fixture.caseId}/documents/${firstDocument.id}/download`);
  assert.equal(forbiddenDownload.statusCode, 403);
  const forbiddenUpload = await upload('noaccess', { categoryId: evidence.id }, firstBuffer, 'sin-permiso.pdf', 'application/pdf');
  assert.equal(forbiddenUpload.statusCode, 403);

  const auditResult = await pool.query(
    `SELECT action FROM audit_logs
     WHERE entity_type = 'document' AND entity_id = ANY($1::text[])
     ORDER BY created_at`,
    [fixture.documentIds],
  );
  assert.deepEqual(auditResult.rows.map(({ action }) => action).sort(), ['document.upload', 'document.download', 'document.upload'].sort());
}

async function cleanup() {
  if (fixture.documentIds.length) {
    const stored = await pool.query('SELECT storage_key FROM documents WHERE id = ANY($1::uuid[])', [fixture.documentIds]);
    for (const { storage_key: key } of stored.rows) await deleteDocument(key).catch(() => {});
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'document' AND entity_id = ANY($1::text[])", [fixture.documentIds]);
    await pool.query('DELETE FROM documents WHERE id = ANY($1::uuid[])', [fixture.documentIds]);
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
  console.log('Gestión documental privada validada correctamente.');
} catch (error) {
  console.error('Falló la validación de documentos:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
}
