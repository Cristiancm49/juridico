import { query } from './db.js';

export async function generateTaskNotifications(now = new Date(), db = { query }) {
  const result = await db.query(
    `WITH due_tasks AS (
       SELECT
         t.id,
         t.assignee_id,
         t.title AS task_title,
         t.due_at,
         t.alert_days,
         c.case_number,
         ((t.due_at AT TIME ZONE 'America/Bogota')::date
           - ($1::timestamptz AT TIME ZONE 'America/Bogota')::date) AS days_remaining
       FROM tasks t
       JOIN cases c ON c.id = t.case_id
       JOIN task_statuses ts ON ts.id = t.status_id
       JOIN users u ON u.id = t.assignee_id
       WHERE ts.code IN ('pending', 'in_progress')
         AND u.active = TRUE
         AND t.due_at < $1::timestamptz + INTERVAL '8 days'
     ), eligible AS (
       SELECT *,
         CASE
           WHEN days_remaining < 0 THEN 'overdue'
           WHEN days_remaining = 0 THEN 'due_today'
           ELSE 'before_' || days_remaining::text
         END AS alert_code
       FROM due_tasks
       WHERE days_remaining < 0 OR days_remaining::smallint = ANY(alert_days)
     )
     INSERT INTO notifications
       (user_id, task_id, alert_code, due_at_snapshot, title, message)
     SELECT
       assignee_id,
       id,
       alert_code,
       due_at,
       CASE
         WHEN alert_code = 'overdue' THEN 'Tarea vencida'
         WHEN alert_code = 'due_today' THEN 'Tarea para hoy'
         ELSE 'Próximo vencimiento'
       END,
       CASE
         WHEN alert_code = 'overdue' THEN task_title || ' del expediente ' || case_number || ' está vencida.'
         WHEN alert_code = 'due_today' THEN task_title || ' del expediente ' || case_number || ' vence hoy.'
         ELSE task_title || ' del expediente ' || case_number || ' vence en ' || days_remaining || ' día(s).'
       END
     FROM eligible
     ON CONFLICT (task_id, user_id, alert_code, due_at_snapshot) DO NOTHING
     RETURNING id`,
    [now.toISOString()],
  );
  return result.rowCount;
}
