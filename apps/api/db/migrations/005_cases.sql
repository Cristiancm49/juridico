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
