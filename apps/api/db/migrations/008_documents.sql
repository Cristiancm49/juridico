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
