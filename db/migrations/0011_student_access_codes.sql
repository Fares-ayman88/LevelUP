CREATE TABLE student_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash varchar(128) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_access_codes_profile_unique UNIQUE (student_profile_id),
  CONSTRAINT student_access_codes_hash_unique UNIQUE (code_hash),
  CONSTRAINT student_access_codes_hash_format CHECK (code_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX student_access_codes_org_status_idx
  ON student_access_codes (organization_id, is_active);

CREATE INDEX student_access_codes_user_idx
  ON student_access_codes (user_id);

CREATE OR REPLACE FUNCTION enforce_student_access_code_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  profile_org_id uuid;
  profile_user_id uuid;
BEGIN
  SELECT organization_id, user_id
    INTO profile_org_id, profile_user_id
  FROM student_profiles
  WHERE id = NEW.student_profile_id;

  PERFORM assert_tenant_match(
    NEW.organization_id,
    profile_org_id,
    'student_access_codes.student_profile_id'
  );

  IF profile_user_id IS NULL OR profile_user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: student access code user must match its student profile'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM organization_memberships
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.user_id
      AND role = 'student'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Tenant integrity violation: student access code requires an active student membership'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER student_access_codes_set_updated_at BEFORE UPDATE ON student_access_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER student_access_codes_tenant_guard BEFORE INSERT OR UPDATE ON student_access_codes
  FOR EACH ROW EXECUTE FUNCTION enforce_student_access_code_tenant();

CREATE TRIGGER student_access_codes_membership_tenant_guard BEFORE INSERT OR UPDATE ON student_access_codes
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('created_by_membership_id');

ALTER TABLE student_access_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE student_access_codes FROM anon, authenticated;
