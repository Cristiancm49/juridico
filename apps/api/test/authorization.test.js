import test from 'node:test';
import assert from 'node:assert/strict';
import { requirePermission } from '../src/auth.js';

function replyMock() {
  return {
    status: null,
    payload: null,
    code(status) {
      this.status = status;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test('autoriza cuando el usuario tiene el permiso requerido', async () => {
  const reply = replyMock();
  await requirePermission('users.read')(
    { user: { permissions: ['users.read'] } },
    reply,
  );
  assert.equal(reply.status, null);
});

test('responde 403 cuando falta el permiso requerido', async () => {
  const reply = replyMock();
  await requirePermission('roles.manage')(
    { user: { permissions: ['users.read'] } },
    reply,
  );
  assert.equal(reply.status, 403);
  assert.match(reply.payload.message, /permiso/i);
});

