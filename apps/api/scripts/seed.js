import argon2 from 'argon2';
import { pool, withTransaction } from '../src/db.js';
import { normalizeEmail, isStrongEnoughPassword } from '../src/security.js';

async function seed() {
  const name = process.env.ADMIN_NAME || 'Administrador LegalDesk';
  const email = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@legaldesk.local');
  const password = process.env.ADMIN_PASSWORD;

  if (!isStrongEnoughPassword(password)) {
    throw new Error('ADMIN_PASSWORD debe contener al menos 10 caracteres.');
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await withTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (LOWER(email)) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           active = TRUE,
           must_change_password = FALSE,
           updated_at = NOW()
       RETURNING id`,
      [email, name, passwordHash],
    );

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE code = 'administrator'
       ON CONFLICT DO NOTHING`,
      [userResult.rows[0].id],
    );
  });
}

seed()
  .then(() => console.log('Administrador inicial creado o actualizado.'))
  .catch((error) => {
    console.error('No fue posible crear los datos iniciales.', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
