CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE account_status AS ENUM ('active', 'suspended');
CREATE TYPE membership_role AS ENUM ('student', 'guardian', 'teacher', 'assistant', 'center_admin');
CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'inactive');
CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated');
CREATE TYPE group_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE enrollment_status AS ENUM ('pending_payment', 'active', 'payment_follow_up', 'seat_released', 'cancelled');
CREATE TYPE waitlist_status AS ENUM ('waiting', 'offered', 'accepted', 'expired', 'removed');
CREATE TYPE payment_obligation_status AS ENUM ('due', 'overdue', 'awaiting_review', 'paid', 'waived', 'void');
CREATE TYPE payment_method AS ENUM ('cash', 'online_transfer');
CREATE TYPE payment_record_status AS ENUM ('submitted', 'cash_recorded', 'confirmed', 'rejected', 'cancelled');
CREATE TYPE follow_up_status AS ENUM ('open', 'in_progress', 'resolved', 'dismissed');
CREATE TYPE group_switch_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE session_status AS ENUM ('scheduled', 'cancelled', 'completed');
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'excused');
CREATE TYPE homework_submission_status AS ENUM ('pending', 'submitted', 'late', 'graded');
CREATE TYPE otp_purpose AS ENUM ('sign_in', 'verify_phone');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  slug varchar(80) NOT NULL UNIQUE,
  timezone varchar(64) NOT NULL DEFAULT 'Africa/Cairo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 varchar(16) UNIQUE,
  full_name varchar(160) NOT NULL,
  status account_status NOT NULL DEFAULT 'active',
  phone_verified_at timestamptz,
  last_signed_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_phone_e164_format CHECK (
    phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{6,14}$'
  )
);

CREATE TABLE organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_org_user_role_unique UNIQUE (organization_id, user_id, role)
);

CREATE INDEX memberships_org_user_idx ON organization_memberships (organization_id, user_id);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  token_hash varchar(128) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_sessions_user_expiry_idx ON auth_sessions (user_id, expires_at);

CREATE TABLE otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 varchar(16) NOT NULL,
  purpose otp_purpose NOT NULL,
  code_hash varchar(128) NOT NULL,
  attempt_count smallint NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT otp_challenges_attempt_count_valid CHECK (attempt_count >= 0)
);

CREATE INDEX otp_challenges_phone_expiry_idx ON otp_challenges (phone_e164, expires_at);

CREATE TABLE student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  student_code varchar(48) NOT NULL,
  full_name varchar(160) NOT NULL,
  grade_level varchar(80) NOT NULL,
  status student_status NOT NULL DEFAULT 'active',
  created_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_profiles_org_code_unique UNIQUE (organization_id, student_code),
  CONSTRAINT student_profiles_org_user_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX student_profiles_org_name_idx ON student_profiles (organization_id, full_name);

CREATE TABLE guardian_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  guardian_membership_id uuid NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  relationship varchar(40) NOT NULL DEFAULT 'guardian',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guardian_student_links_unique UNIQUE (organization_id, guardian_membership_id, student_profile_id)
);

CREATE INDEX guardian_student_links_student_idx ON guardian_student_links (organization_id, student_profile_id);

CREATE TABLE teacher_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL UNIQUE REFERENCES organization_memberships(id) ON DELETE CASCADE,
  display_name varchar(160) NOT NULL,
  bio text,
  profile_photo_key varchar(512),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX teacher_profiles_org_published_idx ON teacher_profiles (organization_id, is_published);

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subjects_org_name_unique UNIQUE (organization_id, name)
);

CREATE TABLE teacher_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_profile_id uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT teacher_subjects_unique UNIQUE (organization_id, teacher_profile_id, subject_id)
);

CREATE TABLE academic_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_profile_id uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  grade_level varchar(80) NOT NULL,
  capacity integer NOT NULL,
  monthly_fee_minor integer NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'EGP',
  status group_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_groups_capacity_positive CHECK (capacity > 0),
  CONSTRAINT academic_groups_fee_nonnegative CHECK (monthly_fee_minor >= 0),
  CONSTRAINT academic_groups_currency_code CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE INDEX academic_groups_discovery_idx
  ON academic_groups (organization_id, subject_id, grade_level, status);
CREATE INDEX academic_groups_teacher_idx
  ON academic_groups (organization_id, teacher_profile_id, status);

CREATE TABLE group_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES academic_groups(id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  room_label varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_schedules_weekday_valid CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT group_schedules_time_range_valid CHECK (ends_at > starts_at)
);

CREATE INDEX group_schedules_group_idx ON group_schedules (organization_id, group_id);

CREATE TABLE group_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES academic_groups(id) ON DELETE CASCADE,
  group_schedule_id uuid REFERENCES group_schedules(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status session_status NOT NULL DEFAULT 'scheduled',
  attendance_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_sessions_time_range_valid CHECK (ends_at > starts_at)
);

CREATE INDEX group_sessions_group_start_idx ON group_sessions (organization_id, group_id, starts_at);

CREATE TABLE group_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES academic_groups(id) ON DELETE RESTRICT,
  student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  status enrollment_status NOT NULL DEFAULT 'pending_payment',
  reserved_until timestamptz,
  released_at timestamptz,
  release_reason text,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX group_enrollments_group_status_idx
  ON group_enrollments (organization_id, group_id, status);
CREATE INDEX group_enrollments_student_status_idx
  ON group_enrollments (organization_id, student_profile_id, status);
CREATE UNIQUE INDEX group_enrollments_one_live_seat
  ON group_enrollments (organization_id, group_id, student_profile_id)
  WHERE status IN ('pending_payment', 'active', 'payment_follow_up');

CREATE TABLE waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES academic_groups(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  status waitlist_status NOT NULL DEFAULT 'waiting',
  offered_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX waitlist_entries_group_status_created_idx
  ON waitlist_entries (organization_id, group_id, status, created_at);
CREATE UNIQUE INDEX waitlist_entries_one_active_entry
  ON waitlist_entries (organization_id, group_id, student_profile_id)
  WHERE status IN ('waiting', 'offered');

CREATE TABLE group_switch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_enrollment_id uuid NOT NULL REFERENCES group_enrollments(id) ON DELETE RESTRICT,
  target_group_id uuid NOT NULL REFERENCES academic_groups(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  status group_switch_status NOT NULL DEFAULT 'pending',
  resolved_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX group_switch_requests_org_status_idx ON group_switch_requests (organization_id, status);

CREATE TABLE payment_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES group_enrollments(id) ON DELETE CASCADE,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  due_at timestamptz NOT NULL,
  amount_minor integer NOT NULL,
  currency_code varchar(3) NOT NULL DEFAULT 'EGP',
  status payment_obligation_status NOT NULL DEFAULT 'due',
  seat_hold_until timestamptz,
  hold_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_obligations_period_valid CHECK (billing_period_end >= billing_period_start),
  CONSTRAINT payment_obligations_amount_nonnegative CHECK (amount_minor >= 0),
  CONSTRAINT payment_obligations_currency_code CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT payment_obligations_enrollment_period_unique UNIQUE (enrollment_id, billing_period_start)
);

CREATE INDEX payment_obligations_org_status_due_idx
  ON payment_obligations (organization_id, status, due_at);

CREATE TABLE payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES payment_obligations(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  status payment_record_status NOT NULL,
  amount_minor integer NOT NULL,
  proof_object_key varchar(512),
  submitted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  recorded_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  reviewed_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_records_amount_positive CHECK (amount_minor > 0),
  CONSTRAINT payment_records_proof_for_transfer CHECK (
    method <> 'online_transfer' OR proof_object_key IS NOT NULL
  )
);

CREATE INDEX payment_records_obligation_status_idx
  ON payment_records (organization_id, obligation_id, status);

CREATE TABLE payment_follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES payment_obligations(id) ON DELETE CASCADE,
  assignee_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  status follow_up_status NOT NULL DEFAULT 'open',
  priority smallint NOT NULL DEFAULT 2,
  resolution_note text,
  resolved_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_follow_up_tasks_priority_valid CHECK (priority BETWEEN 1 AND 3)
);

CREATE INDEX payment_follow_up_tasks_queue_idx
  ON payment_follow_up_tasks (organization_id, status, priority);
CREATE UNIQUE INDEX payment_follow_up_tasks_one_open_task
  ON payment_follow_up_tasks (obligation_id)
  WHERE status IN ('open', 'in_progress');

CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_session_id uuid NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES group_enrollments(id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  recorded_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_records_session_enrollment_unique UNIQUE (group_session_id, enrollment_id)
);

CREATE TABLE homework_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES academic_groups(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  instructions text,
  max_score integer NOT NULL,
  due_at timestamptz,
  created_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homework_assignments_max_score_positive CHECK (max_score > 0)
);

CREATE INDEX homework_assignments_group_due_idx
  ON homework_assignments (organization_id, group_id, due_at);

CREATE TABLE homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES group_enrollments(id) ON DELETE CASCADE,
  status homework_submission_status NOT NULL DEFAULT 'pending',
  score integer,
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homework_submissions_score_nonnegative CHECK (score IS NULL OR score >= 0),
  CONSTRAINT homework_submissions_assignment_enrollment_unique UNIQUE (assignment_id, enrollment_id)
);

CREATE TABLE exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES academic_groups(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  max_score integer NOT NULL,
  held_at timestamptz,
  created_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exams_max_score_positive CHECK (max_score > 0)
);

CREATE INDEX exams_group_held_idx ON exams (organization_id, group_id, held_at);

CREATE TABLE exam_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES group_enrollments(id) ON DELETE CASCADE,
  score integer NOT NULL,
  graded_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_scores_score_nonnegative CHECK (score >= 0),
  CONSTRAINT exam_scores_exam_enrollment_unique UNIQUE (exam_id, enrollment_id)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  action varchar(160) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_org_created_idx ON audit_logs (organization_id, created_at);

CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organization_memberships_set_updated_at BEFORE UPDATE ON organization_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER student_profiles_set_updated_at BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER teacher_profiles_set_updated_at BEFORE UPDATE ON teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER subjects_set_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER academic_groups_set_updated_at BEFORE UPDATE ON academic_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER group_schedules_set_updated_at BEFORE UPDATE ON group_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER group_sessions_set_updated_at BEFORE UPDATE ON group_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER group_enrollments_set_updated_at BEFORE UPDATE ON group_enrollments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER waitlist_entries_set_updated_at BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER group_switch_requests_set_updated_at BEFORE UPDATE ON group_switch_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_obligations_set_updated_at BEFORE UPDATE ON payment_obligations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_records_set_updated_at BEFORE UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_follow_up_tasks_set_updated_at BEFORE UPDATE ON payment_follow_up_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER attendance_records_set_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER homework_assignments_set_updated_at BEFORE UPDATE ON homework_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER homework_submissions_set_updated_at BEFORE UPDATE ON homework_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER exams_set_updated_at BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER exam_scores_set_updated_at BEFORE UPDATE ON exam_scores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
