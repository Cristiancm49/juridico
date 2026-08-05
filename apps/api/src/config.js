import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../../../.env') });

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: numberFromEnv(process.env.API_PORT, 3100),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://legaldesk:legaldesk@127.0.0.1:55432/legaldesk',
  sessionHours: numberFromEnv(process.env.SESSION_HOURS, 12),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};

export const SESSION_COOKIE = 'legaldesk_session';
