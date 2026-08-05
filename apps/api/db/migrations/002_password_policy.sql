ALTER TABLE users
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX users_must_change_password_idx
  ON users (must_change_password)
  WHERE must_change_password = TRUE;

