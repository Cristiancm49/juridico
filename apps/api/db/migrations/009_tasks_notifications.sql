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
