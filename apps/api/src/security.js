import crypto from 'node:crypto';

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isStrongEnoughPassword(password) {
  return typeof password === 'string' && password.length >= 10;
}
