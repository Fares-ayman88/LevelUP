# Vercel Production Database Setup

LevelUP uses the Vercel serverless API at `/api/levelup` in production.
For stable instructor requests, admin approvals, users, transactions, chats, and notifications, Vercel must have a persistent Postgres database.

Without `DATABASE_URL`, the API falls back to temporary memory storage. That is fine for a quick demo, but data can disappear after refresh, redeploy, or a new serverless instance.

## Recommended Setup

1. Open the Vercel project:
   `level-up`

2. Go to:
   `Storage` -> `Create Database`

3. Choose:
   `Neon`

4. Create a new Postgres database and connect it to the project.

5. Vercel should add environment variables automatically. Confirm that one of these exists:

```env
DATABASE_URL=postgres://...
POSTGRES_URL=postgres://...
```

Prefer `DATABASE_URL` if Vercel gives you multiple connection strings. Use the pooled/serverless connection string when available.

6. Keep this unset in Vercel unless you intentionally use an external backend:

```env
VITE_LEVELUP_API_URL
```

Production should use the default internal API:

```text
/api/levelup
```

7. Make sure this variable is not set to false if you want to keep MonsterASP auth proxying:

```env
LEVELUP_USE_MONSTERASP
```

For the current Vercel/Postgres setup, remove it or set it only if you know which backend should own auth.

8. Redeploy the Vercel project.

## Verify

After redeploy, open:

```text
https://level-up-steel.vercel.app/api/levelup/debug/storage
```

Expected stable production result:

```json
{
  "databaseConfigured": true,
  "postgresReady": true,
  "storage": "postgres"
}
```

Then open:

```text
https://level-up-steel.vercel.app/api/levelup/health
```

That first request initializes the tables automatically.

## Tables Created Automatically

The API creates these tables on startup:

- `users`
- `courses`
- `mentors`
- `transactions`
- `instructor_requests`
- `notifications`
- `chats`
- `chat_messages`
- `files`

It also bootstraps the static admin users:

- `sa3doon@levelup.admin`
- `fares@levelup.admin`
- `mahmoud@levelup.admin`

## Email

Instructor request email notifications use Resend first when available:

```env
RESEND_API_KEY=...
RESEND_FROM=LevelUP <onboarding@resend.dev>
LEVELUP_ADMIN_EMAIL=faresymen88@gmail.com
LEVELUP_EMAIL_TEST_SECRET=test123
```

Test email:

```text
https://level-up-steel.vercel.app/api/levelup/debug/smtp-test?secret=test123
```
