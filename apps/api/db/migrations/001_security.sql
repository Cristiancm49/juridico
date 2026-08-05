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

