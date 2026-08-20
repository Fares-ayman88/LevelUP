CREATE TABLE email_signup_verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL,
  phone_e164 varchar(16) NOT NULL,
  full_name varchar(160) NOT NULL,
  password_hash varchar(256) NOT NULL,
  code_hash varchar(128) NOT NULL,
  attempt_count smallint NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_signup_verification_challenges_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT email_signup_verification_challenges_attempt_count_valid CHECK (attempt_count >= 0)
);

CREATE INDEX email_signup_verification_challenges_email_expiry_idx
  ON email_signup_verification_challenges (email, expires_at);

CREATE INDEX email_signup_verification_challenges_phone_expiry_idx
  ON email_signup_verification_challenges (phone_e164, expires_at);
