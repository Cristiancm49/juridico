import { PgBoss } from 'pg-boss';
import { generateTaskNotifications } from './alerts.js';
import { config } from './config.js';
import { pool } from './db.js';

const queueName = 'generate-task-alerts';
const boss = new PgBoss({
  connectionString: config.databaseUrl,
  application_name: 'legaldesk-alert-worker',
});

boss.on('error', (error) => console.error('Error del trabajador de alertas:', error));

async function start() {
  await boss.start();
  await boss.createQueue(queueName);
  await boss.work(queueName, async () => {
    const created = await generateTaskNotifications();
    return { created };
  });
  await boss.schedule(queueName, '* * * * *', {}, { tz: 'America/Bogota' });
  await boss.send(queueName, { source: 'startup' }, { singletonKey: 'startup', singletonSeconds: 50 });
  console.log('Trabajador de alertas listo.');
}

async function stop() {
  await boss.stop({ graceful: true, timeout: 10_000 }).catch(() => {});
  await pool.end().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

start().catch(async (error) => {
  console.error('No fue posible iniciar el trabajador de alertas:', error);
  await pool.end().catch(() => {});
  process.exit(1);
});
