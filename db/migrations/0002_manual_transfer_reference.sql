ALTER TABLE payment_records
  ADD COLUMN transfer_reference varchar(160);

ALTER TABLE payment_records
  ADD CONSTRAINT payment_records_transfer_reference_required
  CHECK (method <> 'online_transfer' OR transfer_reference IS NOT NULL);

CREATE UNIQUE INDEX payment_records_active_transfer_reference_unique
  ON payment_records (organization_id, transfer_reference)
  WHERE transfer_reference IS NOT NULL AND status IN ('submitted', 'confirmed');
