CREATE TYPE registration_role AS ENUM ('student', 'guardian');

CREATE TABLE organization_registration_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code_hash varchar(128) NOT NULL,
  role registration_role NOT NULL,
  label varchar(120),
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_registration_codes_hash_unique UNIQUE (code_hash),
  CONSTRAINT organization_registration_codes_max_uses_positive CHECK (max_uses > 0),
  CONSTRAINT organization_registration_codes_used_count_nonnegative CHECK (used_count >= 0),
  CONSTRAINT organization_registration_codes_used_count_within_limit CHECK (used_count <= max_uses)
);

CREATE INDEX organization_registration_codes_org_status_idx
  ON organization_registration_codes (organization_id, is_active, expires_at);

CREATE TRIGGER organization_registration_codes_set_updated_at BEFORE UPDATE ON organization_registration_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER organization_registration_codes_membership_tenant_guard
  BEFORE INSERT OR UPDATE ON organization_registration_codes
  FOR EACH ROW EXECUTE FUNCTION enforce_membership_reference_tenant('created_by_membership_id');
