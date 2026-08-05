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
