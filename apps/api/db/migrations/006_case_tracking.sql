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
