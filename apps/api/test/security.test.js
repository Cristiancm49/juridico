import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken,
  hashSessionToken,
  isStrongEnoughPassword,
  normalizeEmail,
} from '../src/security.js';

test('normaliza correos antes de consultar PostgreSQL', () => {
  assert.equal(normalizeEmail('  Admin@LegalDesk.Local '), 'admin@legaldesk.local');
});

test('los tokens de sesión son aleatorios y solo se almacena su hash', () => {
  const first = createSessionToken();
  const second = createSessionToken();
  assert.notEqual(first, second);
  assert.equal(hashSessionToken(first).length, 64);
  assert.notEqual(hashSessionToken(first), first);
});

test('rechaza contraseñas de menos de diez caracteres', () => {
  assert.equal(isStrongEnoughPassword('corta'), false);
  assert.equal(isStrongEnoughPassword('UnaClave10!'), true);
});

