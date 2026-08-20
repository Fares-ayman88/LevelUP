CREATE OR REPLACE FUNCTION assert_optional_membership_tenant(
  expected_organization_id uuid,
  referenced_membership_id uuid,
  relation_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  membership_organization_id uuid;
BEGIN
  IF referenced_membership_id IS NULL THEN
    RETURN;
  END IF;

  SELECT organization_id INTO membership_organization_id
  FROM organization_memberships
  WHERE id = referenced_membership_id;

  PERFORM assert_tenant_match(expected_organization_id, membership_organization_id, relation_name);
END;
$$;

CREATE OR REPLACE FUNCTION enforce_membership_reference_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  membership_column text;
  referenced_membership_id uuid;
BEGIN
  FOREACH membership_column IN ARRAY TG_ARGV LOOP
    referenced_membership_id := NULLIF(to_jsonb(NEW) ->> membership_column, '')::uuid;
    PERFORM assert_optional_membership_tenant(
      NEW.organization_id,
      referenced_membership_id,
      format('%s.%s', TG_TABLE_NAME, membership_column)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_auth_session_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM organization_memberships
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Tenant integrity violation: auth_sessions.organization_id is not available to this user'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_teacher_profile_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  membership_organization_id uuid;
  membership_role_value membership_role;
BEGIN
  SELECT organization_id, role INTO membership_organization_id, membership_role_value
  FROM organization_memberships
  WHERE id = NEW.membership_id;

  PERFORM assert_tenant_match(
    NEW.organization_id,
    membership_organization_id,
    'teacher_profiles.membership_id'
  );

  IF membership_role_value IS DISTINCT FROM 'teacher'::membership_role THEN
    RAISE EXCEPTION 'Tenant integrity violation: teacher_profiles.membership_id must have the teacher role'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_guardian_student_link_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  guardian_organization_id uuid;
  guardian_role membership_role;
  student_organization_id uuid;
BEGIN
  SELECT organization_id, role INTO guardian_organization_id, guardian_role
  FROM organization_memberships
  WHERE id = NEW.guardian_membership_id;
  SELECT organization_id INTO student_organization_id
  FROM student_profiles
  WHERE id = NEW.student_profile_id;

  PERFORM assert_tenant_match(
    NEW.organization_id,
    guardian_organization_id,
    'guardian_student_links.guardian_membership_id'
  );
  PERFORM assert_tenant_match(
    NEW.organization_id,
    student_organization_id,
    'guardian_student_links.student_profile_id'
  );

  IF guardian_role IS DISTINCT FROM 'guardian'::membership_role THEN
    RAISE EXCEPTION 'Tenant integrity violation: guardian_student_links.guardian_membership_id must have the guardian role'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_teacher_subject_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  teacher_organization_id uuid;
  subject_organization_id uuid;
BEGIN
  SELECT organization_id INTO teacher_organization_id
  FROM teacher_profiles
  WHERE id = NEW.teacher_profile_id;
  SELECT organization_id INTO subject_organization_id
  FROM subjects
  WHERE id = NEW.subject_id;

  PERFORM assert_tenant_match(
    NEW.organization_id,
    teacher_organization_id,
    'teacher_subjects.teacher_profile_id'
  );
  PERFORM assert_tenant_match(
    NEW.organization_id,
    subject_organization_id,
    'teacher_subjects.subject_id'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_payment_record_submitter_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.submitted_by_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM organization_memberships
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.submitted_by_user_id
    UNION ALL
    SELECT 1
    FROM student_profiles
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.submitted_by_user_id
  ) THEN
    RAISE EXCEPTION 'Tenant integrity violation: payment_records.submitted_by_user_id is not linked to this organization'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auth_sessions_tenant_insert_guard BEFORE INSERT ON auth_sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_auth_session_tenant();
CREATE TRIGGER auth_sessions_tenant_update_guard BEFORE UPDATE OF organization_id, user_id ON auth_sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_auth_session_tenant();
CREATE TRIGGER student_profiles_membership_tenant_guard BEFORE INSERT OR UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('created_by_membership_id');
CREATE TRIGGER guardian_student_links_tenant_guard BEFORE INSERT OR UPDATE ON guardian_student_links
  FOR EACH ROW EXECUTE FUNCTION enforce_guardian_student_link_tenant();
CREATE TRIGGER teacher_profiles_tenant_guard BEFORE INSERT OR UPDATE ON teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_teacher_profile_membership();
CREATE TRIGGER media_assets_membership_tenant_guard BEFORE INSERT OR UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('created_by_membership_id');
CREATE TRIGGER teacher_subjects_tenant_guard BEFORE INSERT OR UPDATE ON teacher_subjects
  FOR EACH ROW EXECUTE FUNCTION enforce_teacher_subject_tenant();
CREATE TRIGGER group_switch_requests_membership_tenant_guard BEFORE INSERT OR UPDATE ON group_switch_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('resolved_by_membership_id');
CREATE TRIGGER makeup_requests_membership_tenant_guard BEFORE INSERT OR UPDATE ON makeup_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('reviewed_by_membership_id');
CREATE TRIGGER payment_records_membership_tenant_guard BEFORE INSERT OR UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant(
    'recorded_by_membership_id',
    'reviewed_by_membership_id'
  );
CREATE TRIGGER payment_records_submitter_tenant_guard BEFORE INSERT OR UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_record_submitter_tenant();
CREATE TRIGGER payment_follow_up_tasks_membership_tenant_guard BEFORE INSERT OR UPDATE ON payment_follow_up_tasks
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant(
    'assignee_membership_id',
    'resolved_by_membership_id'
  );
CREATE TRIGGER attendance_records_membership_tenant_guard BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('recorded_by_membership_id');
CREATE TRIGGER homework_assignments_membership_tenant_guard BEFORE INSERT OR UPDATE ON homework_assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('created_by_membership_id');
CREATE TRIGGER homework_submissions_membership_tenant_guard BEFORE INSERT OR UPDATE ON homework_submissions
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('graded_by_membership_id');
CREATE TRIGGER exams_membership_tenant_guard BEFORE INSERT OR UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('created_by_membership_id');
CREATE TRIGGER exam_scores_membership_tenant_guard BEFORE INSERT OR UPDATE ON exam_scores
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('graded_by_membership_id');
CREATE TRIGGER audit_logs_membership_tenant_guard BEFORE INSERT OR UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('actor_membership_id');
