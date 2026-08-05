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
