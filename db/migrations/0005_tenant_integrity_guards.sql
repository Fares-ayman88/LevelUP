CREATE OR REPLACE FUNCTION assert_tenant_match(expected_organization_id uuid, referenced_organization_id uuid, relation_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF referenced_organization_id IS NULL OR referenced_organization_id <> expected_organization_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: % does not belong to organization %', relation_name, expected_organization_id
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_academic_group_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  teacher_organization_id uuid;
  subject_organization_id uuid;
BEGIN
  SELECT organization_id INTO teacher_organization_id FROM teacher_profiles WHERE id = NEW.teacher_profile_id;
  SELECT organization_id INTO subject_organization_id FROM subjects WHERE id = NEW.subject_id;
  PERFORM assert_tenant_match(NEW.organization_id, teacher_organization_id, 'academic_groups.teacher_profile_id');
  PERFORM assert_tenant_match(NEW.organization_id, subject_organization_id, 'academic_groups.subject_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_group_schedule_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  group_organization_id uuid;
BEGIN
  SELECT organization_id INTO group_organization_id FROM academic_groups WHERE id = NEW.group_id;
  PERFORM assert_tenant_match(NEW.organization_id, group_organization_id, 'group_schedules.group_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_group_session_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  group_organization_id uuid;
  schedule_group_id uuid;
  schedule_organization_id uuid;
BEGIN
  SELECT organization_id INTO group_organization_id FROM academic_groups WHERE id = NEW.group_id;
  PERFORM assert_tenant_match(NEW.organization_id, group_organization_id, 'group_sessions.group_id');

  IF NEW.group_schedule_id IS NOT NULL THEN
    SELECT group_id, organization_id INTO schedule_group_id, schedule_organization_id FROM group_schedules WHERE id = NEW.group_schedule_id;
    PERFORM assert_tenant_match(NEW.organization_id, schedule_organization_id, 'group_sessions.group_schedule_id');
    IF schedule_group_id IS DISTINCT FROM NEW.group_id THEN
      RAISE EXCEPTION 'Tenant integrity violation: group_sessions.group_schedule_id belongs to another group'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_group_enrollment_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  group_organization_id uuid;
  student_organization_id uuid;
BEGIN
  SELECT organization_id INTO group_organization_id FROM academic_groups WHERE id = NEW.group_id;
  SELECT organization_id INTO student_organization_id FROM student_profiles WHERE id = NEW.student_profile_id;
  PERFORM assert_tenant_match(NEW.organization_id, group_organization_id, 'group_enrollments.group_id');
  PERFORM assert_tenant_match(NEW.organization_id, student_organization_id, 'group_enrollments.student_profile_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_waitlist_entry_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  group_organization_id uuid;
  student_organization_id uuid;
BEGIN
  SELECT organization_id INTO group_organization_id FROM academic_groups WHERE id = NEW.group_id;
  SELECT organization_id INTO student_organization_id FROM student_profiles WHERE id = NEW.student_profile_id;
  PERFORM assert_tenant_match(NEW.organization_id, group_organization_id, 'waitlist_entries.group_id');
  PERFORM assert_tenant_match(NEW.organization_id, student_organization_id, 'waitlist_entries.student_profile_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_group_switch_request_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  enrollment_organization_id uuid;
  target_group_organization_id uuid;
BEGIN
  SELECT organization_id INTO enrollment_organization_id FROM group_enrollments WHERE id = NEW.source_enrollment_id;
  SELECT organization_id INTO target_group_organization_id FROM academic_groups WHERE id = NEW.target_group_id;
  PERFORM assert_tenant_match(NEW.organization_id, enrollment_organization_id, 'group_switch_requests.source_enrollment_id');
  PERFORM assert_tenant_match(NEW.organization_id, target_group_organization_id, 'group_switch_requests.target_group_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_payment_obligation_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  enrollment_organization_id uuid;
BEGIN
  SELECT organization_id INTO enrollment_organization_id FROM group_enrollments WHERE id = NEW.enrollment_id;
  PERFORM assert_tenant_match(NEW.organization_id, enrollment_organization_id, 'payment_obligations.enrollment_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_payment_record_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  obligation_organization_id uuid;
BEGIN
  SELECT organization_id INTO obligation_organization_id FROM payment_obligations WHERE id = NEW.obligation_id;
  PERFORM assert_tenant_match(NEW.organization_id, obligation_organization_id, 'payment_records.obligation_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_payment_follow_up_task_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  obligation_organization_id uuid;
BEGIN
  SELECT organization_id INTO obligation_organization_id FROM payment_obligations WHERE id = NEW.obligation_id;
  PERFORM assert_tenant_match(NEW.organization_id, obligation_organization_id, 'payment_follow_up_tasks.obligation_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_attendance_record_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  enrollment_group_id uuid;
  enrollment_organization_id uuid;
  session_group_id uuid;
  session_organization_id uuid;
BEGIN
  SELECT group_id, organization_id INTO enrollment_group_id, enrollment_organization_id FROM group_enrollments WHERE id = NEW.enrollment_id;
  SELECT group_id, organization_id INTO session_group_id, session_organization_id FROM group_sessions WHERE id = NEW.group_session_id;
  PERFORM assert_tenant_match(NEW.organization_id, enrollment_organization_id, 'attendance_records.enrollment_id');
  PERFORM assert_tenant_match(NEW.organization_id, session_organization_id, 'attendance_records.group_session_id');
  IF enrollment_group_id IS DISTINCT FROM session_group_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: attendance enrollment and session belong to different groups'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_homework_assignment_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  group_organization_id uuid;
BEGIN
  SELECT organization_id INTO group_organization_id FROM academic_groups WHERE id = NEW.group_id;
  PERFORM assert_tenant_match(NEW.organization_id, group_organization_id, 'homework_assignments.group_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_homework_submission_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_group_id uuid;
  assignment_organization_id uuid;
  enrollment_group_id uuid;
  enrollment_organization_id uuid;
BEGIN
  SELECT group_id, organization_id INTO assignment_group_id, assignment_organization_id FROM homework_assignments WHERE id = NEW.assignment_id;
  SELECT group_id, organization_id INTO enrollment_group_id, enrollment_organization_id FROM group_enrollments WHERE id = NEW.enrollment_id;
  PERFORM assert_tenant_match(NEW.organization_id, assignment_organization_id, 'homework_submissions.assignment_id');
  PERFORM assert_tenant_match(NEW.organization_id, enrollment_organization_id, 'homework_submissions.enrollment_id');
  IF assignment_group_id IS DISTINCT FROM enrollment_group_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: homework assignment and enrollment belong to different groups'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_exam_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  group_organization_id uuid;
BEGIN
  SELECT organization_id INTO group_organization_id FROM academic_groups WHERE id = NEW.group_id;
  PERFORM assert_tenant_match(NEW.organization_id, group_organization_id, 'exams.group_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_exam_score_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  enrollment_group_id uuid;
  enrollment_organization_id uuid;
  exam_group_id uuid;
  exam_organization_id uuid;
BEGIN
  SELECT group_id, organization_id INTO exam_group_id, exam_organization_id FROM exams WHERE id = NEW.exam_id;
  SELECT group_id, organization_id INTO enrollment_group_id, enrollment_organization_id FROM group_enrollments WHERE id = NEW.enrollment_id;
  PERFORM assert_tenant_match(NEW.organization_id, exam_organization_id, 'exam_scores.exam_id');
  PERFORM assert_tenant_match(NEW.organization_id, enrollment_organization_id, 'exam_scores.enrollment_id');
  IF exam_group_id IS DISTINCT FROM enrollment_group_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: exam and enrollment belong to different groups'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_makeup_request_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  source_enrollment_group_id uuid;
  source_enrollment_organization_id uuid;
  source_session_group_id uuid;
  source_session_organization_id uuid;
  target_session_organization_id uuid;
BEGIN
  SELECT group_id, organization_id INTO source_enrollment_group_id, source_enrollment_organization_id FROM group_enrollments WHERE id = NEW.source_enrollment_id;
  SELECT group_id, organization_id INTO source_session_group_id, source_session_organization_id FROM group_sessions WHERE id = NEW.source_group_session_id;
  SELECT organization_id INTO target_session_organization_id FROM group_sessions WHERE id = NEW.target_group_session_id;
  PERFORM assert_tenant_match(NEW.organization_id, source_enrollment_organization_id, 'makeup_requests.source_enrollment_id');
  PERFORM assert_tenant_match(NEW.organization_id, source_session_organization_id, 'makeup_requests.source_group_session_id');
  PERFORM assert_tenant_match(NEW.organization_id, target_session_organization_id, 'makeup_requests.target_group_session_id');
  IF source_enrollment_group_id IS DISTINCT FROM source_session_group_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: make-up source enrollment and session belong to different groups'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER academic_groups_tenant_guard BEFORE INSERT OR UPDATE ON academic_groups
  FOR EACH ROW EXECUTE FUNCTION enforce_academic_group_tenant();
CREATE TRIGGER group_schedules_tenant_guard BEFORE INSERT OR UPDATE ON group_schedules
  FOR EACH ROW EXECUTE FUNCTION enforce_group_schedule_tenant();
CREATE TRIGGER group_sessions_tenant_guard BEFORE INSERT OR UPDATE ON group_sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_group_session_tenant();
CREATE TRIGGER group_enrollments_tenant_guard BEFORE INSERT OR UPDATE ON group_enrollments
  FOR EACH ROW EXECUTE FUNCTION enforce_group_enrollment_tenant();
CREATE TRIGGER waitlist_entries_tenant_guard BEFORE INSERT OR UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_waitlist_entry_tenant();
CREATE TRIGGER group_switch_requests_tenant_guard BEFORE INSERT OR UPDATE ON group_switch_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_group_switch_request_tenant();
CREATE TRIGGER payment_obligations_tenant_guard BEFORE INSERT OR UPDATE ON payment_obligations
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_obligation_tenant();
CREATE TRIGGER payment_records_tenant_guard BEFORE INSERT OR UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_record_tenant();
CREATE TRIGGER payment_follow_up_tasks_tenant_guard BEFORE INSERT OR UPDATE ON payment_follow_up_tasks
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_follow_up_task_tenant();
CREATE TRIGGER attendance_records_tenant_guard BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION enforce_attendance_record_tenant();
CREATE TRIGGER homework_assignments_tenant_guard BEFORE INSERT OR UPDATE ON homework_assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_homework_assignment_tenant();
CREATE TRIGGER homework_submissions_tenant_guard BEFORE INSERT OR UPDATE ON homework_submissions
  FOR EACH ROW EXECUTE FUNCTION enforce_homework_submission_tenant();
CREATE TRIGGER exams_tenant_guard BEFORE INSERT OR UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION enforce_exam_tenant();
CREATE TRIGGER exam_scores_tenant_guard BEFORE INSERT OR UPDATE ON exam_scores
  FOR EACH ROW EXECUTE FUNCTION enforce_exam_score_tenant();
CREATE TRIGGER makeup_requests_tenant_guard BEFORE INSERT OR UPDATE ON makeup_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_makeup_request_tenant();
