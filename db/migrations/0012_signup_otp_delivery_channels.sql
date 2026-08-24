ALTER TABLE email_signup_verification_challenges
  ADD COLUMN delivery_channel varchar(16) NOT NULL DEFAULT 'email',
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE email_signup_verification_challenges
  ADD CONSTRAINT email_signup_verification_challenges_delivery_channel_valid
  CHECK (delivery_channel IN ('email', 'whatsapp')) NOT VALID;

ALTER TABLE email_signup_verification_challenges
  VALIDATE CONSTRAINT email_signup_verification_challenges_delivery_channel_valid;

ALTER TABLE email_signup_verification_challenges
  ADD CONSTRAINT email_signup_verification_challenges_delivery_data_valid
  CHECK (
    (delivery_channel = 'email' AND email IS NOT NULL AND password_hash IS NOT NULL)
    OR (delivery_channel = 'whatsapp' AND email IS NULL AND password_hash IS NULL)
  ) NOT VALID;

ALTER TABLE email_signup_verification_challenges
  VALIDATE CONSTRAINT email_signup_verification_challenges_delivery_data_valid;

ALTER TABLE email_signup_verification_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE email_signup_verification_challenges FROM anon, authenticated;
