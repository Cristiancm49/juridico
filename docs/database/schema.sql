-- LegalDesk - esquema PostgreSQL completo
-- Ejecutar desde psql con: psql "$DATABASE_URL" -f docs/database/schema.sql
-- \ir resuelve las rutas con respecto a este archivo y evita duplicar las
-- migraciones que son la fuente de verdad del esquema.

\set ON_ERROR_STOP on

BEGIN;

\ir ../../apps/api/db/migrations/001_security.sql
\ir ../../apps/api/db/migrations/002_password_policy.sql
\ir ../../apps/api/db/migrations/003_intake_foundation.sql
\ir ../../apps/api/db/migrations/004_legal_requests.sql
\ir ../../apps/api/db/migrations/005_cases.sql
\ir ../../apps/api/db/migrations/006_case_tracking.sql
\ir ../../apps/api/db/migrations/007_legal_actions.sql
\ir ../../apps/api/db/migrations/008_documents.sql
\ir ../../apps/api/db/migrations/009_tasks_notifications.sql
\ir ../../apps/api/db/migrations/010_report_indexes.sql

COMMIT;
