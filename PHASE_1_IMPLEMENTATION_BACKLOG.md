# Phase 1 Implementation Backlog

## Goal

Replace the demo's browser-owned state with a secure production foundation while preserving the approved visual system. This phase does not implement QR scanning or a live payment gateway.

## Foundation Implemented On 2026-08-17

- Environment contract in `src/lib/env/server.ts`, with production OTP safeguards.
- Security headers, a no-cache health endpoint, loading, not-found, and global error boundaries.
- CI commands for linting, type checks, unit tests, and a production build.
- CI now provisions PostgreSQL 16, applies migrations, and executes a separate integration suite for database-level tenant integrity.
- PostgreSQL schema, immutable SQL migration runner, tenant IDs, sessions, OTP challenge storage, memberships, student/guardian links, teacher media metadata, groups, waitlists, manual-payment workflow, attendance, homework, exams, alternative-class requests, and audit logs.
- Unit coverage for Egyptian phone normalization and the first server-side permission/tenant checks.

The root `/` demo remains intentionally separate. The first production student read model now runs from PostgreSQL; the remaining work below covers the other role workspaces, profile media delivery, and deeper end-to-end coverage.

## Authentication Slice Implemented On 2026-08-17

- `/sign-in` is a real phone-OTP flow, not a demo access-code toggle.
- OTPs are HMAC-hashed, expire after five minutes, accept five attempts, and have a database-backed request limit.
- Browser cookies contain an opaque random session token only; its hash, expiration, revocation state, and selected organization live in PostgreSQL.
- `/select-organization` handles users with multiple independent center memberships, and `/app` is protected by an optimistic proxy plus server-side session and membership checks.
- `npm run db:seed` creates isolated development tenants and accounts for local testing. The root `/` demo remains intentionally separate.

The temporary development OTP adapter is complete for local testing. A real SMS provider adapter and account-claim flows remain required before a production launch.

## Student Discovery And Booking Slice Implemented On 2026-08-17

- `/app/student` reads the active organization, active student profile, teachers, subjects, schedules, live enrollment occupancy, and the student's own seats from PostgreSQL.
- Search, subject, and availability filters are URL-backed in the top bar, so there is one discovery control and results survive a refresh.
- Reserving a seat is a server-side transaction that locks the group row before counting capacity. Active waiting-list offers reserve capacity too, so a direct booking cannot take an offered seat.
- An unpaid seat is never silently removed by another student's booking. It remains a staff decision in the payment queue.
- Releasing a seat promotes the earliest eligible waiting student for 24 hours. The student sees and accepts the offer inside `/app/student`; acceptance creates a fresh 30-minute payment hold in a new transaction.
- Route-local loading and error states cover slow or unavailable data. The development seed now creates an enrolled group, an open group with two seats, a full group for waitlist testing, and a guardian linked to two children.

Teacher photos are now uploaded from `/app/teacher/profile` through short-lived signed S3-compatible URLs. The server verifies MIME type, size, and image signature before saving the object key, and student cards use an authenticated media redirect with safe initials as fallback.

## Guardian And Payment Follow-Up Slices Implemented On 2026-08-17

- `/app/guardian` resolves the active guardian membership server-side and returns only records reached through `guardian_student_links`: linked children, active groups, schedules, and the most actionable payment state per group.
- `/app/assistant/payments` is available to assistants and center admins only. Opening the queue marks elapsed dues as overdue and idempotently creates the corresponding follow-up task.
- The assistant can confirm a cash payment, extend a seat hold with a future deadline and written reason, or release an unpaid seat. Each operation locks the payment and enrollment, updates the work item, and writes an audit event.
- Students and guardians can submit a normalized manual-transfer reference. It becomes `awaiting_review`; an assistant can confirm or reject it, and an active reference cannot be submitted twice within the organization.
- The system never silently removes a monthly seat. Releasing it remains an explicit staff action.
- `/api/internal/maintenance`, protected by `CRON_SECRET`, generates 28 days of dated sessions from the tenant's weekly schedule, marks dues overdue, opens idempotent follow-up tasks, expires stale waiting-list offers, promotes the next student, expires unusable alternative-class requests, and rejects abandoned media uploads. `vercel.json` schedules it every ten minutes when deployed to Vercel.
- Notification delivery is deliberately not faked: the offer is visible in the student workspace now, while SMS/WhatsApp/email fan-out still needs a durable outbox and chosen provider.

## Student Schedule, Progress, And Alternative-Class Slice Implemented On 2026-08-17

- `/app/student/schedule` combines authoritative dated sessions with the recurring weekly plan and uses the center's `Africa/Cairo` business time zone for display.
- Active schedules generate dated sessions server-side for the next 28 days. The partial unique database index makes repeated maintenance runs safe.
- `/app/student/makeup` lets a student request a session in a different active group of the same subject and grade. It excludes already-open requests and full targets.
- Both request creation and assistant approval re-check the tenant, ownership, session status, two-week window, group capacity, and conflicts with the student's normal or already-approved alternative classes.
- `/app/assistant/makeup` gives assistants and center admins the pending review queue. Approval, rejection, automatic expiry, and review notes are audit logged.
- `/app/student/progress` derives attendance, homework, exam components, an explainable reweighted total, and a privacy-safe competition rank from source records. It never exposes peer identities.
- The development seed now creates a small Physics cohort with completed sessions and scores, plus upcoming compatible sessions, so the student and assistant flows can be exercised locally.

Remaining before this slice is launch-ready: teacher/assistant data-entry interfaces for attendance, homework, and scores; database-backed transaction and authorization integration tests; and the deferred QR attendance flow.

## Teacher Academic Operations Slice Implemented On 2026-08-17

- `/app/teacher/classes` is now the default teacher workspace. It is scoped to the authenticated teacher's active groups and provides a single operational surface for attendance, homework, exams, and scorebooks.
- Attendance can only be saved for a finished, non-cancelled, unlocked session. The service locks the session and current roster, rejects an incomplete or duplicate roster payload, and marks a scheduled session complete when attendance is first saved.
- Homework and exams are created only in groups owned by the teacher. Score save operations re-check group ownership, lock the assessment and roster, enforce integer scores in range, and support clearing an ungraded value safely.
- Score and attendance corrections write audit records containing the prior and next values. Student progress is revalidated after every academic mutation.

Remaining before this slice is launch-ready: staff delegation policy for assistants, an explicit correction-history UI, database-backed transaction and authorization integration tests, and the deferred QR attendance flow.

## Database Integrity And CI Slice Implemented On 2026-08-17

- `0005_tenant_integrity_guards.sql` enforces organization consistency across groups, schedules, sessions, enrollments, waitlists, payment records, attendance, academic work, scores, and alternative-class requests. `0006_tenant_membership_integrity.sql` extends that guard to actor memberships, guardian links, teacher profiles, subjects, and tenant-bound sessions.
- `npm run test:integration` exercises the migrated schema against PostgreSQL. It proves cross-center operational and membership records are rejected even when their foreign keys exist, checks recurring-session uniqueness, and validates the one-open-request make-up constraint.
- GitHub Actions now starts PostgreSQL 16, migrates an empty database, and runs the integration suite after unit tests. The suite skips locally only when a database URL is not configured.

## Delivery Order

### 1. Project Boundaries And Route Structure

- Keep `/` as the demo only until the authenticated application is ready.
- Add route groups for public access and authenticated workspace routes.
- Create route-level shells for organization selection, student, guardian, teacher, assistant, and center admin workspaces.
- Move reusable controls from the large page component into domain-owned feature folders.
- Add route-level loading, error, and not-found states.
- Restrict the current visual preview route to development or demo environments.

Acceptance criteria:

- Every future production screen has a stable URL.
- A role is determined by a server-side membership, not by a UI toggle.
- The demo remains available for stakeholder review without exposing production data.

### 2. Environment And Operational Safety

- Add environment validation for database URL, session secrets, storage configuration, OTP provider configuration, and manual-payment settings.
- Add security headers, request IDs, structured logging, error tracking hook, and health checks.
- Add a `.env.example` containing names only, never secrets.
- Add CI commands for install, lint, typecheck, tests, and production build.
- Add a staging environment and migration workflow before production deployment.

Acceptance criteria:

- The application fails fast with a useful error when required production configuration is absent.
- No secret, payment reference, OTP, or personally identifiable information is committed or logged.

### 3. PostgreSQL And Migrations

- Provision PostgreSQL and connect through one database layer.
- Add Drizzle ORM and SQL migrations.
- Establish shared primitives: UUID IDs, UTC timestamps, `organization_id`, audit metadata, optimistic version where useful, and archived/soft-deleted records where appropriate.
- Implement the first migration set:
  - organizations, branches, rooms;
  - users, sessions, organization memberships, roles, invites;
  - student, guardian, teacher, and staff profiles;
  - guardian-student links;
  - subjects, grades, groups, schedules, and dated sessions.
- Create realistic development seed data for two isolated organizations and a guardian with multiple children.

Acceptance criteria:

- Running migrations from an empty database creates the schema deterministically.
- Data from Organization A cannot appear in Organization B queries.
- A student profile can exist without a login user and later be claimed safely.

### 4. Authentication And Membership Resolution

- Implement phone normalization in E.164 form and an OTP provider interface.
- Provide a local development OTP adapter only for development; production requires a real provider.
- Implement invite/claim flows for center-created student profiles.
- Create server-owned sessions in Secure, HttpOnly, SameSite cookies.
- Implement membership selection for users who belong to more than one organization.
- Add account recovery, sign-out-all-sessions, rate limits, and sign-in audit events.

Acceptance criteria:

- A guardian can sign in and see only linked children.
- A teacher or assistant has an independent account and no implicit access to another center.
- An attacker cannot authenticate by copying a browser localStorage value or access code.

### 5. Role And Permission Layer

- Define permissions as server-side capabilities instead of checking role labels in components.
- Create `requireAuth`, `requireOrganizationMembership`, and `requirePermission` guards.
- Encode permissions for student, guardian, teacher, assistant, and center admin.
- Add audit events for role change, guardian linkage, profile claim, and privileged data changes.
- Add integration tests for direct-object-reference and cross-tenant attacks.

Acceptance criteria:

- Every mutation checks organization, role, and ownership on the server.
- Changing a URL, hidden input, or request ID cannot expose another student's data.

### 6. Media And Teacher Profiles

- Completed: media metadata is stored in PostgreSQL, with short-lived signed S3-compatible upload URLs.
- Completed: the teacher-owned upload flow validates type, byte size, object metadata, and file signature before profile assignment; superseded and stale uploads are rejected.
- Completed: student cards and the teacher profile use an authenticated media route with safe fallback initials.
- Remaining: add image normalization, asynchronous deletion retries, storage lifecycle rules, and visual/integration coverage against a real bucket.

Acceptance criteria:

- A teacher photo persists across devices and is visible only where policy permits.
- Upload failure, invalid file, missing object, and deleted photo each have a clear UI state.

### 7. First Real Workspace Read Model

- Completed: authenticated teacher discovery and group availability reads from PostgreSQL.
- Completed: navbar search and filters are the single student-discovery control.
- Completed: the production student discovery route is isolated from the root demo route.
- Completed: empty, slow, unavailable, and permission-denied states for the new student route.
- Completed: serve teacher profile photos through the media pipeline and expose guardian access to linked student schedules and payments.
- Remaining: add pagination, richer teacher detail, and database integration tests for the complete discovery read model.

Acceptance criteria:

- A student or guardian sees only the data allowed by the active organization and relationship.
- Filters and group availability survive refresh and work on mobile; teacher photos remain in the next media slice.

## Tests Required In This Phase

- Unit tests for phone normalization, permissions, organization scope, and invite claiming.
- Database integration tests for tenant isolation, guardian-child visibility, and profile creation without a phone.
- End-to-end tests for OTP sign-in, staff-created student profile, guardian linkage, organization switch, and sign-out.
- Accessibility checks for sign-in, organization switcher, profile image upload, and mobile navigation.

## External Decisions That Can Be Deferred

- Final OTP provider can be swapped behind the provider interface.
- Real payment gateway remains deferred; manual payment states and staff review can be modeled before it.
- QR attendance remains deferred until dated sessions and attendance records exist.
- Renewal grace period and reminder schedule become organization configuration before the billing phase.

## Definition Of Done

Phase 1 is complete when an authenticated user can enter the correct organization, receive only the permissions and records they own, and view real teacher/group data stored in PostgreSQL. The demo's localStorage login and local image storage are not used by production routes.
