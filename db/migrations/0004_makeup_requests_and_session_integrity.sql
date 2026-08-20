CREATE UNIQUE INDEX group_sessions_schedule_start_unique
  ON group_sessions (group_schedule_id, starts_at)
  WHERE group_schedule_id IS NOT NULL;

CREATE TABLE makeup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_enrollment_id uuid NOT NULL REFERENCES group_enrollments(id) ON DELETE RESTRICT,
  source_group_session_id uuid NOT NULL REFERENCES group_sessions(id) ON DELETE RESTRICT,
  target_group_session_id uuid NOT NULL REFERENCES group_sessions(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  status group_switch_status NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT makeup_requests_different_sessions CHECK (source_group_session_id <> target_group_session_id)
);

CREATE INDEX makeup_requests_org_status_idx
  ON makeup_requests (organization_id, status);
CREATE INDEX makeup_requests_target_status_idx
  ON makeup_requests (organization_id, target_group_session_id, status);
CREATE UNIQUE INDEX makeup_requests_one_open_source_session
  ON makeup_requests (organization_id, source_enrollment_id, source_group_session_id)
  WHERE status IN ('pending', 'approved');

CREATE TRIGGER makeup_requests_set_updated_at BEFORE UPDATE ON makeup_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
