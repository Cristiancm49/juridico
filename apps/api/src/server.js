import { buildApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

const app = await buildApp();

async function stop(signal) {
  app.log.info({ signal }, 'Cerrando LegalDesk');
  await app.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exit(1);
}

