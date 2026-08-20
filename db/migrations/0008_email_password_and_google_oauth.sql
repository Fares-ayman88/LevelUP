CREATE TYPE oauth_provider AS ENUM ('google');

ALTER TABLE users
  ADD COLUMN email varchar(320),
  ADD COLUMN email_verified_at timestamptz,
  ADD COLUMN password_hash varchar(256);

ALTER TABLE users
  ADD CONSTRAINT users_email_lowercase CHECK (email IS NULL OR email = lower(email));

CREATE UNIQUE INDEX users_email_ci_unique
  ON users (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider oauth_provider NOT NULL,
  provider_account_id varchar(255) NOT NULL,
  email varchar(320) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oauth_accounts_provider_subject_unique UNIQUE (provider, provider_account_id),
  CONSTRAINT oauth_accounts_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX oauth_accounts_user_idx ON oauth_accounts (user_id);

CREATE TRIGGER oauth_accounts_set_updated_at BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
