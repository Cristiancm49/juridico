CREATE INDEX cases_report_filters_idx
  ON cases (opened_date DESC, status_id, legal_area_id);

CREATE INDEX legal_requests_report_filters_idx
  ON legal_requests (received_date DESC, legal_area_id);

CREATE INDEX case_assignments_current_user_case_idx
  ON case_assignments (user_id, case_id)
  WHERE unassigned_at IS NULL;
