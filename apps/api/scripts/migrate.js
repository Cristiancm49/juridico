import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, '../db/migrations');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [73190426]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((row) => row.name));
    const files = (await fs.readdir(migrationsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      console.log(`Aplicando ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [73190426]).catch(() => {});
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => console.log('Migraciones completadas.'))
  .catch((error) => {
    console.error('No fue posible aplicar las migraciones.', error);
    process.exitCode = 1;
  });

