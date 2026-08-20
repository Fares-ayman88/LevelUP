# Database Operations

## Chosen Stack

- **Database:** PostgreSQL 16.
- **Data layer:** the existing Drizzle ORM + `pg` pool. There is no framework migration to make; the current schema, transactions, and tenant guards already use this stack.
- **Local development:** Docker Compose with PostgreSQL 16.
- **Staging and production:** a managed PostgreSQL service. Neon is the default recommendation for this Next.js deployment because it provides a standard PostgreSQL connection string, isolated environments, and works with the existing `pg` client. A managed Supabase or AWS PostgreSQL instance is also compatible.

## Create a Staging Database

1. Create a managed PostgreSQL project and a separate `staging` database.
2. Put its SSL connection string in the staging environment as `DATABASE_URL`.
3. Configure `DATABASE_POOL_MAX=5`, `SESSION_SECRET`, `CRON_SECRET`, `APP_URL`, and the remaining service credentials.
4. Run `npm run db:migrate` from a trusted deployment runner.
5. Run `npm run db:check`; it verifies connectivity and that every migration checksum matches the repository.
6. Use `npm run db:seed` only for local development or staging demos. It is blocked in production.

## Create the First Center

After migrations complete, create the initial center administrator with an E.164 Egyptian phone number:

```powershell
npm run db:bootstrap-center -- --organization-name "LevelUp Ismailia" --organization-slug levelup-ismailia --admin-name "Wael Barakat" --admin-phone +201012345678
```

The command creates the organization, activates a `center_admin` membership, and writes an audit event. Re-running it for the same center and administrator preserves the same access relationship and records the repeat in the audit trail.

## Probes

- `GET /api/health` is a liveness check and stays independent of PostgreSQL.
- `GET /api/ready` verifies that the application can connect to PostgreSQL. It returns `503` without a usable database or environment configuration.

## Message Delivery

- Mobile sign-in requires an SMS provider. The application is prepared for Infobip through `OTP_PROVIDER=infobip`, `INFOBIP_BASE_URL`, `INFOBIP_API_KEY`, and `OTP_SENDER_ID`.
- Keep `OTP_PROVIDER=development` locally; it deliberately exposes the code only in the local sign-in screen and never logs it.
- Resend or SMTP are email services, not mobile OTP providers. Use Resend later for receipts and operational email after a sending domain is verified.

## Release Checklist

1. Back up the production database and confirm a restore procedure.
2. Apply migrations once, through CI or a controlled deployment job.
3. Run `npm run db:check` against the target database.
4. Create the first center through the bootstrap command.
5. Verify `/api/health`, `/api/ready`, sign-in, a booking, a manual-payment review, and an assistant action before inviting the pilot center.
