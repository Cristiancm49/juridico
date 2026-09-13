-- ============================================================================
-- 001_security.sql
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_normalized CHECK (email = LOWER(email))
);

CREATE UNIQUE INDEX users_email_unique_idx ON users (LOWER(email));
CREATE INDEX users_active_idx ON users (active);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  module TEXT NOT NULL
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);

INSERT INTO permissions (code, name, module) VALUES
  ('users.read', 'Consultar usuarios', 'Usuarios'),
  ('users.manage', 'Administrar usuarios', 'Usuarios'),
  ('roles.manage', 'Administrar roles y permisos', 'Seguridad'),
  ('requests.read', 'Consultar solicitudes', 'Solicitudes'),
  ('requests.write', 'Gestionar solicitudes', 'Solicitudes'),
  ('requests.assign', 'Clasificar y asignar solicitudes', 'Solicitudes'),
  ('cases.read', 'Consultar expedientes', 'Expedientes'),
  ('cases.write', 'Gestionar expedientes', 'Expedientes'),
  ('cases.assign', 'Asignar expedientes', 'Expedientes'),
  ('actions.write', 'Registrar actuaciones', 'Seguimiento'),
  ('documents.read', 'Consultar documentos', 'Documentos'),
  ('documents.write', 'Gestionar documentos', 'Documentos'),
  ('tasks.read', 'Consultar tareas y vencimientos', 'Tareas'),
  ('tasks.write', 'Gestionar tareas y vencimientos', 'Tareas'),
  ('reports.read', 'Consultar reportes', 'Reportes'),
  ('audit.read', 'Consultar auditoría', 'Seguridad');

INSERT INTO roles (code, name, description, system_role) VALUES
  ('administrator', 'Administrador', 'Control completo del sistema.', TRUE),
  ('lawyer', 'Abogado', 'Gestiona solicitudes, expedientes y actuaciones.', TRUE),
  ('intern', 'Practicante', 'Apoya el registro y seguimiento bajo supervisión.', TRUE),
  ('administrative', 'Administrativo', 'Registra solicitudes y organiza información.', TRUE);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'administrator';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = ANY (ARRAY[
  'requests.read', 'requests.write', 'requests.assign',
  'cases.read', 'cases.write', 'cases.assign', 'actions.write',
  'documents.read', 'documents.write',
  'tasks.read', 'tasks.write', 'reports.read'
])
WHERE r.code = 'lawyer';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = ANY (ARRAY[
  'requests.read', 'requests.write', 'cases.read', 'actions.write',
  'documents.read', 'documents.write', 'tasks.read', 'tasks.write'
])
WHERE r.code = 'intern';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = ANY (ARRAY[
  'users.read', 'requests.read', 'requests.write',
  'cases.read', 'documents.read', 'documents.write',
  'tasks.read', 'reports.read'
])
WHERE r.code = 'administrative';


-- ============================================================================
-- 002_password_policy.sql
-- ============================================================================
ALTER TABLE users
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX users_must_change_password_idx
  ON users (must_change_password)
  WHERE must_change_password = TRUE;


-- ============================================================================
-- 003_intake_foundation.sql
-- ============================================================================
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_type TEXT NOT NULL CHECK (person_type IN ('natural', 'legal')),
  document_type TEXT NOT NULL CHECK (document_type IN ('CC', 'CE', 'NIT', 'PASSPORT', 'TI')),
  document_number TEXT NOT NULL CHECK (LENGTH(TRIM(document_number)) >= 3),
  full_name TEXT NOT NULL CHECK (LENGTH(TRIM(full_name)) >= 3),
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT people_email_normalized CHECK (email IS NULL OR email = LOWER(email)),
  CONSTRAINT people_document_unique UNIQUE (document_type, document_number)
);

CREATE INDEX people_active_idx ON people (active);
CREATE INDEX people_full_name_idx ON people (LOWER(full_name));
CREATE INDEX people_document_number_idx ON people (document_number);

CREATE TABLE legal_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  level SMALLINT NOT NULL UNIQUE CHECK (level BETWEEN 1 AND 4),
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO legal_areas (code, name, description, sort_order) VALUES
  ('civil', 'Derecho civil', 'Obligaciones, contratos y responsabilidad civil.', 10),
  ('family', 'Derecho de familia', 'Asuntos familiares, alimentos y sucesiones.', 20),
  ('labor', 'Derecho laboral', 'Relaciones laborales y seguridad social.', 30),
  ('commercial', 'Derecho comercial', 'Sociedades, negocios y controversias comerciales.', 40),
  ('administrative', 'Derecho administrativo', 'Actuaciones y controversias con entidades públicas.', 50),
  ('criminal', 'Derecho penal', 'Orientación y representación en asuntos penales.', 60),
  ('constitutional', 'Derecho constitucional', 'Tutelas y protección de derechos fundamentales.', 70);

INSERT INTO priorities (code, name, level, color) VALUES
  ('urgent', 'Urgente', 1, '#B33A3A'),
  ('high', 'Alta', 2, '#C77818'),
  ('medium', 'Media', 3, '#347A68'),
  ('low', 'Baja', 4, '#667A91');

-- ============================================================================
-- 004_legal_requests.sql
-- ============================================================================
CREATE SEQUENCE legal_request_number_seq START WITH 1;

CREATE TABLE request_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  terminal BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO request_statuses (code, name, description, color, sort_order, terminal) VALUES
  ('received', 'Recibida', 'Solicitud registrada y pendiente de revisión.', '#426B85', 10, FALSE),
  ('in_review', 'En revisión', 'El equipo está analizando la solicitud.', '#A66B15', 20, FALSE),
  ('approved', 'Aprobada', 'La solicitud puede convertirse en expediente.', '#287646', 30, FALSE),
  ('rejected', 'Rechazada', 'La solicitud no continuará como expediente.', '#9A4B43', 40, TRUE),
  ('converted', 'Convertida', 'La solicitud ya originó un expediente.', '#574B8A', 50, TRUE);

CREATE TABLE legal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  legal_area_id UUID NOT NULL REFERENCES legal_areas(id) ON DELETE RESTRICT,
  priority_id UUID NOT NULL REFERENCES priorities(id) ON DELETE RESTRICT,
  status_id UUID NOT NULL REFERENCES request_statuses(id) ON DELETE RESTRICT,
  subject TEXT NOT NULL CHECK (LENGTH(TRIM(subject)) >= 5),
  description TEXT NOT NULL CHECK (LENGTH(TRIM(description)) >= 10),
  source TEXT NOT NULL CHECK (source IN ('in_person', 'phone', 'email', 'referral', 'other')),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX legal_requests_person_idx ON legal_requests (person_id);
CREATE INDEX legal_requests_status_idx ON legal_requests (status_id);
CREATE INDEX legal_requests_area_idx ON legal_requests (legal_area_id);
CREATE INDEX legal_requests_priority_idx ON legal_requests (priority_id);
CREATE INDEX legal_requests_received_date_idx ON legal_requests (received_date DESC);

CREATE TABLE legal_request_status_history (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES legal_requests(id) ON DELETE CASCADE,
  from_status_id UUID REFERENCES request_statuses(id) ON DELETE RESTRICT,
  to_status_id UUID NOT NULL REFERENCES request_statuses(id) ON DELETE RESTRICT,
  comment TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX legal_request_status_history_request_idx
  ON legal_request_status_history (request_id, created_at DESC);

-- ============================================================================
-- 005_cases.sql
-- ============================================================================
CREATE SEQUENCE case_number_seq START WITH 1;

CREATE TABLE case_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  terminal BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO case_statuses (code, name, description, color, sort_order, terminal) VALUES
  ('open', 'Abierto', 'Expediente creado y pendiente de asignación y seguimiento.', '#287646', 10, FALSE);

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE,
  origin_request_id UUID UNIQUE REFERENCES legal_requests(id) ON DELETE RESTRICT,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  legal_area_id UUID NOT NULL REFERENCES legal_areas(id) ON DELETE RESTRICT,
  priority_id UUID NOT NULL REFERENCES priorities(id) ON DELETE RESTRICT,
  status_id UUID NOT NULL REFERENCES case_statuses(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) >= 5),
  description TEXT NOT NULL CHECK (LENGTH(TRIM(description)) >= 10),
  external_reference TEXT,
  authority TEXT,
  opened_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cases_person_idx ON cases (person_id);
CREATE INDEX cases_status_idx ON cases (status_id);
CREATE INDEX cases_area_idx ON cases (legal_area_id);
CREATE INDEX cases_priority_idx ON cases (priority_id);
CREATE INDEX cases_opened_date_idx ON cases (opened_date DESC);
CREATE INDEX cases_external_reference_idx ON cases (external_reference) WHERE external_reference IS NOT NULL;

-- ============================================================================
-- 006_case_tracking.sql
-- ============================================================================
INSERT INTO case_statuses (code, name, description, color, sort_order, terminal) VALUES
  ('in_progress', 'En trámite', 'El equipo jurídico está trabajando activamente en el expediente.', '#2F6FA3', 20, FALSE),
  ('on_hold', 'Suspendido', 'El expediente está temporalmente detenido.', '#A66B15', 30, FALSE),
  ('closed', 'Cerrado', 'El asunto jurídico terminó y puede reabrirse si es necesario.', '#586C66', 40, FALSE),
  ('archived', 'Archivado', 'El expediente cerrado fue archivado y no admite nuevos cambios.', '#6B5A7A', 50, TRUE);

CREATE TABLE case_assignments (
  id BIGSERIAL PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX case_assignments_current_unique_idx
  ON case_assignments (case_id)
  WHERE unassigned_at IS NULL;
CREATE INDEX case_assignments_user_idx
  ON case_assignments (user_id, unassigned_at);
CREATE INDEX case_assignments_history_idx
  ON case_assignments (case_id, assigned_at DESC);

CREATE TABLE case_status_history (
  id BIGSERIAL PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_status_id UUID REFERENCES case_statuses(id) ON DELETE RESTRICT,
  to_status_id UUID NOT NULL REFERENCES case_statuses(id) ON DELETE RESTRICT,
  comment TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX case_status_history_case_idx
  ON case_status_history (case_id, created_at DESC);

INSERT INTO case_status_history (case_id, to_status_id, comment, changed_by, created_at)
SELECT c.id, c.status_id, 'Registro inicial del expediente.', c.created_by, c.created_at
FROM cases c;

-- ============================================================================
-- 007_legal_actions.sql
-- ============================================================================
CREATE TABLE action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO action_types (code, name, description, color, sort_order) VALUES
  ('meeting', 'Reunión', 'Reunión con el cliente, contraparte o equipo jurídico.', '#347A68', 10),
  ('call', 'Llamada', 'Comunicación telefónica relacionada con el expediente.', '#426B85', 20),
  ('filing', 'Escrito o radicación', 'Presentación o recepción de un escrito formal.', '#574B8A', 30),
  ('hearing', 'Audiencia o diligencia', 'Audiencia, diligencia o comparecencia.', '#B05E32', 40),
  ('communication', 'Comunicación', 'Correo, oficio, notificación o comunicación relevante.', '#2F6FA3', 50),
  ('review', 'Revisión jurídica', 'Análisis de documentos, normas o antecedentes.', '#A66B15', 60),
  ('note', 'Nota interna', 'Observación de trabajo o avance interno.', '#586C66', 70),
  ('other', 'Otra actuación', 'Actuación que no corresponde a otro tipo.', '#697772', 80);

CREATE TABLE legal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  action_type_id UUID NOT NULL REFERENCES action_types(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) >= 5),
  description TEXT NOT NULL CHECK (LENGTH(TRIM(description)) >= 10),
  result TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX legal_actions_case_date_idx ON legal_actions (case_id, occurred_at DESC);
CREATE INDEX legal_actions_type_idx ON legal_actions (action_type_id);
CREATE INDEX legal_actions_created_by_idx ON legal_actions (created_by);

-- ============================================================================
-- 008_documents.sql
-- ============================================================================
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO document_categories (code, name, description, sort_order) VALUES
  ('contract', 'Contrato', 'Contratos y acuerdos relacionados con el asunto.', 10),
  ('power_of_attorney', 'Poder', 'Poderes y autorizaciones otorgadas.', 20),
  ('filing', 'Escrito o memorial', 'Escritos, memoriales y documentos radicados.', 30),
  ('evidence', 'Prueba o soporte', 'Pruebas y soportes documentales.', 40),
  ('court_decision', 'Providencia o decisión', 'Autos, sentencias y decisiones de autoridad.', 50),
  ('correspondence', 'Correspondencia', 'Comunicaciones, oficios y notificaciones.', 60),
  ('identification', 'Identificación', 'Documentos de identificación y existencia.', 70),
  ('other', 'Otro documento', 'Documento que no corresponde a otra categoría.', 80);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES document_categories(id) ON DELETE RESTRICT,
  document_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number > 0),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  original_name TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  extension TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  description TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_group_id, version_number)
);

CREATE UNIQUE INDEX documents_one_current_version_idx
  ON documents (document_group_id)
  WHERE is_current = TRUE;
CREATE INDEX documents_case_created_idx ON documents (case_id, created_at DESC);
CREATE INDEX documents_case_current_idx ON documents (case_id, is_current, category_id);
CREATE INDEX documents_sha256_idx ON documents (sha256);

-- ============================================================================
-- 009_tasks_notifications.sql
-- ============================================================================
CREATE TABLE task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  terminal BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO task_statuses (code, name, color, sort_order, terminal) VALUES
  ('pending', 'Pendiente', '#A66B15', 10, FALSE),
  ('in_progress', 'En curso', '#2F6FA3', 20, FALSE),
  ('completed', 'Completada', '#347A68', 30, TRUE),
  ('cancelled', 'Cancelada', '#697772', 40, TRUE);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  priority_id UUID NOT NULL REFERENCES priorities(id) ON DELETE RESTRICT,
  status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) >= 5),
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  alert_days SMALLINT[] NOT NULL DEFAULT ARRAY[7, 3, 1, 0]::SMALLINT[],
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (alert_days <@ ARRAY[0, 1, 3, 7]::SMALLINT[])
);

CREATE TABLE task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status_id UUID REFERENCES task_statuses(id) ON DELETE RESTRICT,
  to_status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
  comment TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  alert_code TEXT NOT NULL,
  due_at_snapshot TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, user_id, alert_code, due_at_snapshot)
);

CREATE INDEX tasks_due_active_idx ON tasks (due_at, status_id);
CREATE INDEX tasks_assignee_status_idx ON tasks (assignee_id, status_id, due_at);
CREATE INDEX tasks_case_idx ON tasks (case_id, due_at);
CREATE INDEX task_status_history_task_idx ON task_status_history (task_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX notifications_task_idx ON notifications (task_id, created_at DESC);

-- ============================================================================
-- 010_report_indexes.sql
-- ============================================================================
CREATE INDEX cases_report_filters_idx
  ON cases (opened_date DESC, status_id, legal_area_id);

CREATE INDEX legal_requests_report_filters_idx
  ON legal_requests (received_date DESC, legal_area_id);

CREATE INDEX case_assignments_current_user_case_idx
  ON case_assignments (user_id, case_id)
  WHERE unassigned_at IS NULL;

