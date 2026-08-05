import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { generateTaskNotifications } from '../src/alerts.js';
import { buildApp } from '../src/app.js';
import { SESSION_COOKIE } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';
import { createSessionToken, hashSessionToken } from '../src/security.js';

const fixture = {
  userIds: [],
  actorId: null,
  lawyerId: null,
  personId: null,
  caseId: null,
  taskIds: [],
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
         VALUES ($1, $2, 'not-used-by-this-test', TRUE, FALSE) RETURNING id`,
        [`tasks-${roleCode}-${suffix}@legaldesk.test`, `Tareas ${roleCode}`],
      );
      const userId = userResult.rows[0].id;
      fixture.userIds.push(userId);
      if (roleCode === 'administrator') fixture.actorId = userId;
      if (roleCode === 'lawyer') fixture.lawyerId = userId;
      if (roles[roleCode]) await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roles[roleCode]]);
      const token = createSessionToken();
      fixture.tokens[roleCode] = token;
      await client.query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'15 minutes\')', [userId, hashSessionToken(token)]);
    }

    const personResult = await client.query(
      `INSERT INTO people
        (person_type, document_type, document_number, full_name, active, created_by, updated_by)
       VALUES ('natural', 'CC', $1, 'Cliente tareas', TRUE, $2, $2) RETURNING id`,
      [`TASK-${suffix}`, fixture.actorId],
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

function dueDate(offsetDays) {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();
}

async function createTask(title, offsetDays) {
  const response = await requestAs('administrator', 'POST', '/api/v1/tasks', {
    caseId: fixture.caseId,
    assigneeId: fixture.lawyerId,
    priorityId: fixture.priorityId,
    title,
    description: `Validación automática para ${title}.`,
    dueAt: dueDate(offsetDays),
  });
  assert.equal(response.statusCode, 201, response.body);
  fixture.taskIds.push(response.json().task.id);
  return response.json().task;
}

async function validate() {
  const options = await requestAs('administrator', 'GET', '/api/v1/tasks/options');
  assert.equal(options.statusCode, 200, options.body);
  assert.deepEqual(options.json().statuses.map(({ code }) => code), ['pending', 'in_progress', 'completed', 'cancelled']);
  assert.ok(options.json().assignees.some(({ id }) => id === fixture.lawyerId));

  const createdCase = await requestAs('administrator', 'POST', '/api/v1/cases', {
    personId: fixture.personId,
    legalAreaId: fixture.legalAreaId,
    priorityId: fixture.priorityId,
    title: 'Expediente con vencimientos',
    description: 'Expediente creado para validar tareas, vencimientos y alertas.',
    openedDate: new Date().toISOString().slice(0, 10),
  });
  assert.equal(createdCase.statusCode, 201, createdCase.body);
  fixture.caseId = createdCase.json().case.id;

  const taskSeven = await createTask('Vencimiento en siete días', 7);
  await createTask('Vencimiento en tres días', 3);
  await createTask('Vencimiento en un día', 1);
  await createTask('Vencimiento para hoy', 0);
  await createTask('Vencimiento atrasado', -1);
  assert.equal(taskSeven.status.code, 'pending');

  const firstNotifications = await requestAs('lawyer', 'GET', '/api/v1/notifications');
  assert.equal(firstNotifications.statusCode, 200, firstNotifications.body);
  assert.equal(firstNotifications.json().unread, 5);
  assert.deepEqual(
    new Set(firstNotifications.json().notifications.map(({ alertCode }) => alertCode)),
    new Set(['before_7', 'before_3', 'before_1', 'due_today', 'overdue']),
  );

  const editedWithoutReschedule = await requestAs('administrator', 'PATCH', `/api/v1/tasks/${taskSeven.id}`, {
    caseId: taskSeven.case.id,
    assigneeId: taskSeven.assignee.id,
    priorityId: taskSeven.priority.id,
    title: 'Vencimiento en siete días ajustado',
    description: taskSeven.description,
    dueAt: taskSeven.dueAt,
    statusCode: taskSeven.status.code,
  });
  assert.equal(editedWithoutReschedule.statusCode, 200, editedWithoutReschedule.body);
  const stillUnread = await requestAs('lawyer', 'GET', '/api/v1/notifications');
  assert.equal(stillUnread.json().unread, 5);

  const countBefore = (await pool.query('SELECT COUNT(*)::int AS total FROM notifications WHERE task_id = ANY($1::uuid[])', [fixture.taskIds])).rows[0].total;
  await generateTaskNotifications();
  await generateTaskNotifications();
  const countAfter = (await pool.query('SELECT COUNT(*)::int AS total FROM notifications WHERE task_id = ANY($1::uuid[])', [fixture.taskIds])).rows[0].total;
  assert.equal(countAfter, countBefore);

  const overdueList = await requestAs('lawyer', 'GET', '/api/v1/tasks?mine=true&dueState=overdue');
  assert.equal(overdueList.statusCode, 200, overdueList.body);
  assert.equal(overdueList.json().pagination.total, 1);

  const summary = await requestAs('lawyer', 'GET', '/api/v1/tasks/summary');
  assert.equal(summary.statusCode, 200, summary.body);
  assert.deepEqual(summary.json().summary, { active: 5, overdue: 1, today: 1, week: 3 });

  const completed = await requestAs('administrator', 'PATCH', `/api/v1/tasks/${taskSeven.id}`, {
    statusCode: 'completed',
    comment: 'Compromiso cumplido dentro del término.',
  });
  assert.equal(completed.statusCode, 200, completed.body);
  assert.equal(completed.json().task.status.code, 'completed');
  assert.ok(completed.json().task.completedAt);

  const invalidTransition = await requestAs('administrator', 'PATCH', `/api/v1/tasks/${taskSeven.id}`, { statusCode: 'cancelled' });
  assert.equal(invalidTransition.statusCode, 400, invalidTransition.body);
  const closedCase = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/status`, { statusCode: 'closed' });
  assert.equal(closedCase.statusCode, 200, closedCase.body);
  const blockedArchive = await requestAs('administrator', 'POST', `/api/v1/cases/${fixture.caseId}/status`, { statusCode: 'archived' });
  assert.equal(blockedArchive.statusCode, 400, blockedArchive.body);
  const detail = await requestAs('lawyer', 'GET', `/api/v1/tasks/${taskSeven.id}`);
  assert.equal(detail.statusCode, 200, detail.body);
  assert.equal(detail.json().history.length, 2);

  const notificationToRead = firstNotifications.json().notifications.find(({ alertCode }) => alertCode !== 'before_7');
  const marked = await requestAs('lawyer', 'PATCH', `/api/v1/notifications/${notificationToRead.id}/read`);
  assert.equal(marked.statusCode, 200, marked.body);
  const allRead = await requestAs('lawyer', 'POST', '/api/v1/notifications/read-all');
  assert.equal(allRead.statusCode, 200, allRead.body);
  const afterRead = await requestAs('lawyer', 'GET', '/api/v1/notifications');
  assert.equal(afterRead.json().unread, 0);

  const forbidden = await requestAs('noaccess', 'GET', '/api/v1/tasks');
  assert.equal(forbidden.statusCode, 403);
  const forbiddenNotifications = await requestAs('noaccess', 'GET', '/api/v1/notifications');
  assert.equal(forbiddenNotifications.statusCode, 403);

  const audit = await pool.query(
    `SELECT action FROM audit_logs WHERE entity_type = 'task' AND entity_id = ANY($1::text[])`,
    [fixture.taskIds],
  );
  assert.equal(audit.rows.filter(({ action }) => action === 'task.create').length, 5);
  assert.equal(audit.rows.filter(({ action }) => action === 'task.status_change').length, 1);
}

async function cleanup() {
  if (fixture.taskIds.length) {
    await pool.query("DELETE FROM audit_logs WHERE entity_type = 'task' AND entity_id = ANY($1::text[])", [fixture.taskIds]);
    await pool.query('DELETE FROM tasks WHERE id = ANY($1::uuid[])', [fixture.taskIds]);
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
  console.log('Tareas, vencimientos y alertas validados correctamente.');
} catch (error) {
  console.error('Falló la validación de tareas y alertas:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  try {
    await cleanup();
  } finally {
    await pool.end();
  }
}
