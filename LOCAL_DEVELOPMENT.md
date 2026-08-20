# Local Development

## Prerequisites

- Node.js 24 or later.
- Docker Desktop, or PostgreSQL 16 or later running locally.

## First-Time Setup

1. Copy `.env.example` to `.env.local`.
2. For the included local database, set `DATABASE_URL` to:

   ```text
   postgresql://levelup:levelup_dev_only@127.0.0.1:5433/levelup
   ```

3. Set `DATABASE_URL_TEST` to a separate database whose name ends with `_test`, for example `levelup_test` on the same local PostgreSQL instance.
4. Set `SESSION_SECRET` to a unique random value with at least 32 characters.
5. Set `CRON_SECRET` to a different random value with at least 32 characters.
5. Start PostgreSQL:

   ```powershell
   docker compose up -d db
   ```

6. Apply schema migrations:

   ```powershell
   npm run db:migrate
   ```

7. Verify the database migration state:

   ```powershell
   npm run db:check
   ```

8. Add the isolated development centers and test accounts:

   ```powershell
   npm run db:seed
   ```

9. Start the application:

   ```powershell
   npm run dev
   ```

## Validation

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

With a migrated PostgreSQL database available, also run:

```powershell
npm run test:integration
```

The integration suite uses `DATABASE_URL_TEST` when present and otherwise uses `DATABASE_URL`. It refuses to run unless the target database name ends in `_test`, so its required `TRUNCATE ... CASCADE` setup cannot touch development or production data. The command migrates that isolated test database before every run. GitHub Actions provisions PostgreSQL 16, runs migrations, then executes it for every push and pull request.

The liveness endpoint is available at `http://127.0.0.1:3000/api/health`.
The database readiness endpoint is available at `http://127.0.0.1:3000/api/ready` and returns `503` until a usable PostgreSQL connection is configured.

When opening the development server from another device on the same network, run it with a LAN hostname and add that hostname or IP to `LEVELUP_DEV_ORIGINS` in `.env.local`. Values are comma-separated. Restart the dev server after changing this setting.

The protected maintenance endpoint can be invoked locally after the database is available:

```powershell
curl.exe -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3000/api/internal/maintenance
```

On Vercel, `vercel.json` calls this route every ten minutes. Configure the same `CRON_SECRET` in the project environment; Vercel Cron sends it in the bearer authorization header. The maintenance run generates the next 28 days of dated sessions from each active weekly schedule, escalates due payments, expires stale waitlist offers and pending alternative-class requests, and rejects abandoned media uploads.

## Development Sign-In

Open `http://127.0.0.1:3000/sign-in`. The development seed gives every test account the password `LevelUpDemo!2026`.

| Account | Email | Expected flow |
| --- | --- | --- |
| Student | `student@levelup.demo` | Opens LevelUp Ismailia directly. |
| Guardian | `guardian@levelup.demo` | Opens LevelUp Ismailia directly. |
| Teacher | `teacher@levelup.demo` | Opens LevelUp Ismailia directly. |
| Assistant | `assistant@levelup.demo` | Opens LevelUp Ismailia directly. |
| Center Admin (Wael Barakat) | `admin@levelup.demo` | Chooses between two independent centers. |

## Development Sign-Up

Open `http://127.0.0.1:3000/sign-up` to enter account details, receive an email verification code, and then complete the center connection at `/onboarding`. A pending sign-up does not create a user record until its email code is verified.

- Student demo access code: `LU-STUDENT-DEMO-2026`. Use a new student code such as `ST-DEMO-3000` and any grade, or claim the seeded unassigned profile with `ST-2049`.
- Guardian demo access code: `LU-GUARDIAN-DEMO-2026`. Link it to the seeded student code `ST-2049`.
- The seeded center admin can open `/app/admin/access-codes` to create, limit, expire, and disable fresh student or guardian codes. The plaintext code is only shown immediately after creation.

## Google OAuth Locally

Create a Google Cloud project, configure its OAuth consent screen, then create an OAuth client with the **Web application** type. For this checkout, add the following exact authorized redirect URI in Google Cloud:

```text
http://127.0.0.1:3000/api/auth/google/callback
```

Add these values to `.env.local`; keep the secret out of chat and source control:

```text
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Restart the Next.js server after saving the file, then open `http://127.0.0.1:3000/sign-up` or `http://127.0.0.1:3000/sign-in` on the same computer. Do not use a private LAN address such as `192.168.x.x` for the Google callback. Google permits loopback addresses for local testing but requires HTTPS and an owned public domain for LAN or production access. The redirect URI must match `APP_URL` exactly.

Google sign-up can create a new LevelUp account and continues to center onboarding; Google sign-in links an existing LevelUp account with the same email when no Google identity is linked yet.

## Email Verification with Resend

The default email OTP provider is development mode. It does not send email; the six-digit code appears only in the local sign-up UI so the full flow can be tested without a third-party credential.

For real delivery through Resend, add these values to the .env.local file:

    EMAIL_OTP_PROVIDER=resend
    RESEND_API_KEY=re_your_resend_api_key
    RESEND_FROM=LevelUp <verify@your-domain.example>

For a no-domain development test, use `RESEND_FROM=LevelUp <onboarding@resend.dev>` and sign up with the same email address used for the Resend account. Resend restricts that test sender to the account owner's email address. To send verification emails to real students, add and verify a domain in Resend, publish its DNS records, then replace `RESEND_FROM` with an address on that domain. The server rejects the development email provider in production.

After a student signs in, `/app/student` shows three seeded 3rd Secondary groups: the student's active Physics group, Mathematics with two open seats, and a full Chemistry group that exercises the waiting-list path. The guardian account is linked to two student profiles for the upcoming guardian workspace.

The guardian account opens `/app/guardian`, where it sees only the linked children. The assistant account opens `/app/assistant/payments`; the seeded Physics renewal becomes an overdue follow-up item and can be confirmed as cash, held, or released during local testing.

To exercise the manual transfer flow, sign in as the student or guardian, submit a transfer reference from the due payment, then sign in as the assistant and confirm or reject that reference from the same queue. If the assistant releases a seat, the next waiting student receives a 24-hour in-app offer that becomes a new 30-minute payment hold when accepted.

The seed also adds completed and upcoming Physics sessions, a second Physics group, attendance records, marked homework, and an exam for a small cohort. Sign in as the student to exercise `/app/student/schedule`, `/app/student/progress`, and `/app/student/makeup`. Send an alternative-class request, then use the assistant account at `/app/assistant/makeup` to approve or decline it. Requests are rejected server-side when the target is full, it conflicts with another scheduled class, or it falls outside the two-week window.

The teacher account now opens `/app/teacher/classes`. It can choose only its own groups, record attendance for finished sessions, create homework and exams, and save scores for the current active roster. Editing either scorebook or attendance updates the student progress calculation; every changed record writes an audit event with the prior and new value.

## Teacher Photo Storage

The teacher account opens `/app/teacher/profile`. To enable real uploads, configure a private S3-compatible bucket with the five `OBJECT_STORAGE_*` values from `.env.example` and allow browser `PUT` requests from `APP_URL` with the `Content-Type` header. The app verifies the uploaded object before it becomes visible to students.

For a deployed environment, rebuild after changing `OBJECT_STORAGE_ENDPOINT` so the Content Security Policy includes the storage origin. Keep the bucket private; images are delivered through the authenticated `/api/media/teacher-photo/:id` route using short-lived signed download URLs.

## Safety Notes

- `.env.local` is ignored by Git. Do not place secrets in `.env.example`.
- The Docker database credentials are for local development only.
- `OTP_PROVIDER=development` is intentionally rejected by the server environment validator in production.
- EMAIL_OTP_PROVIDER=development is intentionally rejected by the server environment validator in production. Use a Resend API key limited to sending access and a verified sender domain.
- `CRON_SECRET` is required in production. The maintenance endpoint rejects every request without its exact bearer token.
- The Infobip OTP adapter is ready for a real SMS provider and sender identity. Keep `OTP_PROVIDER=development` locally until those credentials are configured.
- `npm run db:seed` is intentionally blocked when `NODE_ENV=production`; create the first real organization with `npm run db:bootstrap-center` instead.
- Bootstrap a real center with `--admin-email` and `--admin-password`; the script stores the password with the same `scrypt` format used by the application.
- Center access codes are stored only as HMAC hashes, expire automatically, and have a server-enforced usage limit. Generate them from the center-admin access-code screen instead of sharing a center slug.
- Migrations are checksum-protected. Create a new SQL migration instead of editing one that has been applied to a shared database.
- Migrations `0005_tenant_integrity_guards.sql` and `0006_tenant_membership_integrity.sql` add PostgreSQL triggers for operational relationship rows, actor memberships, guardian links, teacher profiles, and staff-attributed records. They reject cross-center references even if an invalid write bypasses an application query.
