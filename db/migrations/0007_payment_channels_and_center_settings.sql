CREATE TYPE payment_channel_kind AS ENUM ('instapay', 'vodafone_cash', 'bank_transfer', 'cash');

CREATE TABLE payment_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind payment_channel_kind NOT NULL,
  label varchar(100) NOT NULL,
  account_holder varchar(160),
  account_identifier varchar(160),
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  display_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_channels_display_order_nonnegative CHECK (display_order >= 0),
  CONSTRAINT payment_channels_org_kind_unique UNIQUE (organization_id, kind)
);

CREATE INDEX payment_channels_org_active_order_idx
  ON payment_channels (organization_id, is_active, display_order);

CREATE TRIGGER payment_channels_set_updated_at BEFORE UPDATE ON payment_channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payment_records
  DROP CONSTRAINT payment_records_proof_for_transfer;

ALTER TABLE payment_records
  ADD COLUMN payment_channel_id uuid REFERENCES payment_channels(id) ON DELETE SET NULL;

CREATE INDEX payment_records_channel_idx
  ON payment_records (organization_id, payment_channel_id)
  WHERE payment_channel_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_payment_record_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  obligation_organization_id uuid;
  channel_organization_id uuid;
BEGIN
  SELECT organization_id INTO obligation_organization_id FROM payment_obligations WHERE id = NEW.obligation_id;
  PERFORM assert_tenant_match(NEW.organization_id, obligation_organization_id, 'payment_records.obligation_id');

  IF NEW.payment_channel_id IS NOT NULL THEN
    SELECT organization_id INTO channel_organization_id FROM payment_channels WHERE id = NEW.payment_channel_id;
    PERFORM assert_tenant_match(NEW.organization_id, channel_organization_id, 'payment_records.payment_channel_id');
  END IF;

  RETURN NEW;
END;
$$;
