CREATE TYPE media_asset_kind AS ENUM ('teacher_profile_photo');
CREATE TYPE media_asset_status AS ENUM ('pending_upload', 'ready', 'rejected', 'deleted');

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_membership_id uuid REFERENCES organization_memberships(id) ON DELETE SET NULL,
  kind media_asset_kind NOT NULL,
  storage_key varchar(512) NOT NULL UNIQUE,
  content_type varchar(100) NOT NULL,
  byte_size integer NOT NULL,
  status media_asset_status NOT NULL DEFAULT 'pending_upload',
  verified_at timestamptz,
  rejection_reason varchar(240),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_byte_size_valid CHECK (byte_size > 0 AND byte_size <= 5242880),
  CONSTRAINT media_assets_content_type_valid CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif'))
);

CREATE INDEX media_assets_org_status_idx
  ON media_assets (organization_id, status);
CREATE INDEX media_assets_creator_idx
  ON media_assets (organization_id, created_by_membership_id);

CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
