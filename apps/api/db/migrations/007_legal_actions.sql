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
