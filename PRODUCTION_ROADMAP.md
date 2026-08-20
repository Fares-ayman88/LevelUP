# LevelUp Production Roadmap

## Purpose

Turn the current interactive demo into a secure, multi-tenant tutoring platform for students, teachers, assistants, center administrators, and guardians. The demo remains a visual reference; production data and permissions must never rely on browser state, mock data, or demo access codes.

## Active Planning Documents

- Approved business rules: `PHASE_0_PRODUCT_CONTRACT.md`.
- First engineering backlog: `PHASE_1_IMPLEMENTATION_BACKLOG.md`.

## Current Baseline

- The root `/` route remains the stakeholder demo and is still backed by mock browser state.
- The production route group now has PostgreSQL-backed phone OTP sessions, organization selection, role checks, tenant-scoped student discovery, atomic seat holds, waiting-list entry and offer acceptance, guardian visibility, assistant cash/hold/release decisions, and manual-transfer review.
- Students can view server-generated dated sessions, request a compatible alternative class, and view an explainable attendance/homework/exam progress score with a privacy-safe group rank. Assistants review alternative-class requests.
- Teachers have an authenticated classroom workspace for their own groups: attendance for completed sessions, homework and exam creation, and roster score entry. Server-side transactions record every correction in the audit log.
- Database relationship guards now reject operational cross-tenant references at the PostgreSQL layer, and CI migrates a fresh PostgreSQL 16 instance before running tenant-integrity tests.
- A protected maintenance route generates the next 28 days of sessions, escalates overdue payments, opens idempotent assistant tasks, expires waiting-list offers and unusable alternative-class requests, promotes the next student, and rejects stale uploads. Vercel deployment has a ten-minute schedule in `vercel.json`.
- Teachers can upload a profile photo through signed S3-compatible URLs; the server verifies metadata and image signatures before students see it through an authenticated redirect.
- QR attendance, assistant delegation for academic records, messaging, reports, receipt-image uploads, a durable notification outbox, real SMS delivery, and database-backed integration/end-to-end tests are still not production workflows.
- The existing CSS proves the intended visual direction, but needs consolidation before it becomes a long-term design system.

## Product Decisions To Lock Before Implementation

1. Define the first launch tenant model: one center with multiple branches, or many independent centers from day one.
2. Define the role matrix: student, guardian, teacher, assistant, center admin, organization owner, and support operator.
3. Decide the source of truth for identity: phone OTP, email OTP, password, or an external identity provider. A printed access code may identify an account, but must not be the only authenticator.
4. Confirm the payment provider, refund policy, payment methods, invoice rules, tax requirements, and currency handling.
5. Confirm the communication provider and consent policy for WhatsApp, SMS, email, and notification opt-outs.
6. Define attendance rules: check-in window, late threshold, permitted devices, staff override policy, offline fallback, and dispute handling.
7. Define the progress formula, visibility rules, ties, inactive students, missing data, and whether guardians can see rankings.
8. Establish retention and deletion rules for minors, guardian consent, profile photos, attendance, payments, and message history.

## Target Architecture

### Application

- Keep Next.js App Router, but split the current single client page into route-level server components and small client components for interactions.
- Use Server Components for authenticated reads and Server Actions for normal mutations. Use Route Handlers for third-party webhooks, signed upload URLs, QR check-ins, and public callbacks.
- Organize routes by bounded context instead of by one role-switching component:
  - `app/(public)` for sign-in, invite, and policy pages.
  - `app/(workspace)/student`, `teacher`, `assistant`, and `center` for authenticated workspaces.
  - `app/api` for payment, messaging, upload, and QR integrations.
- Keep the demo/preview route separate from production routes and disable it outside non-production environments.

### Data And Storage

- Use managed PostgreSQL as the system of record.
- Use a type-safe ORM and migrations. Recommended default: Drizzle ORM with SQL migrations. Do not mix multiple ORMs.
- Use object storage for profile photos and attachments. Store only object keys and metadata in PostgreSQL.
- Use a durable queue or a transactional outbox plus worker for payments, message delivery, notification fan-out, report generation, and waiting-list invitations.
- Store money as integer minor units, never JavaScript floating-point values.
- Store timestamps in UTC and retain `Africa/Cairo` as the business time zone for schedules and display.

### Authentication And Authorization

- Replace localStorage access codes with server-owned sessions in Secure, HttpOnly, SameSite cookies.
- Use a strong second factor for staff and privileged roles. Rate-limit sign-in, recovery, QR, and invitation endpoints.
- Authorize every server mutation against both organization and role. Client-side visibility is never authorization.
- Make every query organization-scoped. Add authorization tests specifically for cross-center and cross-student access.
- Record an immutable audit event for privileged actions: payment changes, attendance overrides, grade edits, waitlist promotion, group changes, and staff role changes.

## Initial Data Model

All tenant-owned records include `organization_id`, timestamps, actor metadata where relevant, and soft-delete or archival strategy where legally appropriate.

| Area | Core tables |
| --- | --- |
| Identity | `users`, `sessions`, `organizations`, `organization_memberships`, `roles`, `invites` |
| People | `student_profiles`, `guardian_profiles`, `guardian_students`, `teacher_profiles`, `staff_profiles`, `media_assets` |
| Learning setup | `subjects`, `grade_levels`, `centers`, `rooms`, `teacher_subjects`, `groups`, `group_schedules`, `sessions` |
| Enrollment | `enrollments`, `seat_holds`, `waitlist_entries`, `makeup_requests` |
| Billing | `invoices`, `invoice_lines`, `payment_attempts`, `payment_events`, `refunds`, `discounts` |
| Attendance | `attendance_sessions`, `attendance_qr_tokens`, `attendance_records`, `attendance_overrides` |
| Academic progress | `assignments`, `submissions`, `assessments`, `assessment_scores`, `progress_snapshots` |
| Communication | `message_templates`, `message_campaigns`, `message_deliveries`, `notification_preferences`, `notifications` |
| Reliability | `audit_events`, `idempotency_keys`, `outbox_events`, `job_runs` |

### Required Integrity Rules

- A user can have multiple memberships, but a membership is scoped to one organization and role set.
- A student can have active enrollment only when the target group has a confirmed seat or an approved exception.
- A waitlist entry is unique per student and group while active, has a deterministic ordering key, and stores invitation expiry.
- A payment event is immutable and idempotent by provider event ID.
- Attendance is unique per student and attendance session. Manual overrides require actor, reason, and timestamp.
- Scores are versioned or recalculable from source data; do not persist a rank as the only source of truth.
- Group schedules generate dated sessions. Never use display strings such as `Sunday / Wednesday` as executable schedule data.

## Core Flows And Worst Cases

| Flow | Production behavior | Failure cases to prove |
| --- | --- | --- |
| Discovery | Search teachers, groups, fee, available seats, and profile image with pagination and filters. | Empty results, retired teacher, stale availability, slow network, inaccessible image. |
| Booking | Create a short-lived seat hold in a database transaction, then create an invoice/payment attempt. | Two users claim the last seat, payment abandonment, duplicate submission, browser refresh. |
| Waitlist | Promote one entry at a time, notify it asynchronously, and expire the invitation before promoting the next entry. | Duplicate entry, simultaneous promotion, expired invite, declined offer, staff override. |
| Renewal and payment | Accept provider webhook only after signature verification; update invoice state idempotently. | Duplicate/out-of-order webhook, failed or delayed callback, partial refund, provider outage. |
| QR attendance | QR contains only a short-lived opaque token. Server validates session, enrollment, freshness, duplicate scan, and authorization. | Screenshot/replay, wrong group, expired QR, offline device, clock drift, manual correction. |
| Make-up | Request is tied to a missed session and replacement session, with conflict/capacity checks and approval history. | Same session twice, target becomes full, schedule clash, late cancellation. |
| Progress | Compute from versioned attendance, submission, and assessment data; explain the score in the UI. | Missing marks, grade correction, ties, inactive student, privacy leak between students. |
| Messaging | Queue provider sends, preserve consent and opt-out state, and record delivery outcomes. | Duplicate send, invalid phone, template rejection, rate limit, webhook retry. |
| Profile photo | Use signed upload URLs, server-side file validation, metadata checks, and object storage. | Fake MIME type, oversized image, malicious file, storage failure, deleted asset. |

## Delivery Phases

### Phase 0: Product And Technical Contract

- Write the role/permission matrix and organization boundary rules.
- Approve payment, messaging, identity, data retention, and attendance policies.
- Turn the current demo flows into acceptance criteria with happy path, empty state, error state, and permission-denied state.
- Produce schema ERD, API contracts, event catalog, and migration strategy.
- Establish design tokens and component inventory from the approved Card-Y-inspired direction.

Exit criteria: approved decisions, no ambiguous authority for payments, attendance, or guardian data.

### Phase 1: Engineering Foundation

- Split `page.tsx` into routes, domain modules, shared UI primitives, and feature folders.
- Replace the large cascading CSS layer with named design tokens, component-scoped styles, and documented light/dark surface rules.
- Add Zod input schemas, typed error results, structured logging, environment validation, and feature flags.
- Add `error.tsx`, `loading.tsx`, not-found behavior, metadata, security headers, and a protected production-only route policy.
- Add CI for install, lint, typecheck, unit tests, integration tests, and production build.

Exit criteria: every screen is route-addressable, no production logic depends on mock files, and the UI works with loading/error states.

### Phase 2: Database, Identity, And RBAC

- Provision PostgreSQL, migrations, seed data, backup policy, and staging environment.
- Implement users, organizations, memberships, profile records, and secure sessions.
- Implement server-side role guards and tenant-scoped repository functions.
- Migrate access-code demo behavior to invitation or OTP onboarding.
- Move teacher photo upload to signed object-storage uploads and database metadata.

Exit criteria: users cannot read or mutate another organization or role's data, and audit events exist for privileged changes.

### Phase 3: Student Discovery And Enrollment

- Implement teacher profiles, search, filters, group detail, schedules, fee display, and availability from PostgreSQL.
- Implement atomic seat holds, enrollments, cancellation, schedule-conflict checks, and waiting-list entry.
- Build accurate student schedule and next-session views.
- Preserve the premium discovery UI while making availability server-authoritative.

Exit criteria: a real student can discover, reserve, enroll, cancel, and join a waitlist without overselling a group.

### Phase 4: Billing, Renewals, And Waitlist Automation

- Create invoices and payment attempts; integrate the chosen payment provider.
- Verify signed webhooks, use idempotency keys, reconcile failed/pending events, and support staff review.
- Implement monthly renewal, reminder policy, grace period, receipts, refunds, and payment audit records.
- Implement waitlist promotion with an expiration timer and queued notifications.

Exit criteria: no payment status is set by the browser and every money-changing event is traceable.

### Phase 5: Sessions And QR Attendance

- Generate dated class sessions from schedules.
- Let authorized staff open/close attendance sessions and rotate short-lived QR tokens.
- Implement authenticated camera scanning plus manual code and staff override fallback.
- Add attendance history, late/absent rules, and reconciliation tools.

Exit criteria: replayed or expired QR scans fail safely, duplicated attendance is impossible, and offline failure is understandable to users.

### Phase 6: Academic Work And Progress

- Implement assignments, submissions, assessments, score entry, and teacher correction history.
- Compute progress and group percentile on the server, with transparent explanations and privacy-safe comparisons.
- Implement make-up workflow with session-level capacity and clash validation.

Exit criteria: the displayed score can be reproduced from source records and every correction has an audit trail.

### Phase 7: Staff Operations And Communication

- Build teacher, assistant, and center workflows from real data with scoped permissions.
- Add dashboards, capacity decisions, payment follow-up, exports, and report filters.
- Add WhatsApp/SMS/email integration through queued jobs, consent controls, templates, delivery status, and opt-out handling.

Exit criteria: staff can complete their daily workflow without manual spreadsheet reconciliation for core operations.

### Phase 8: Hardening, Beta, And Launch

- Add automated unit, integration, end-to-end, accessibility, visual regression, load, and security tests.
- Run migration rehearsal, backup restore drill, webhook replay drill, and role-escape tests.
- Add monitoring, alerting, error tracking, audit review, incident runbooks, rate limits, and dashboard health checks.
- Launch to one pilot center behind feature flags, collect behavior analytics, then expand by tenant.

Exit criteria: production readiness review passes, rollback is rehearsed, and a pilot center completes real bookings, payments, and attendance successfully.

## Quality Gates

- Unit tests for business rules: capacity, waitlist ordering, price calculation, score formula, and QR eligibility.
- Integration tests for database transactions, RBAC, payment webhook idempotency, and object storage uploads.
- End-to-end tests for student booking, waitlist promotion, payment completion, QR attendance, staff override, and Arabic RTL behavior.
- Accessibility tests for keyboard navigation, focus trapping, dialog semantics, contrast, touch target size, and reduced-motion support.
- Load tests for last-seat contention, QR scan bursts at class start, message campaign spikes, and report export queues.
- Security tests for IDOR/BOLA, role escalation, session fixation, upload abuse, webhook forgery, rate limits, and data leakage in logs.

## Design System Workstream

- Preserve the new dark, restrained Card-Y-inspired visual direction: deep neutral canvas, sparse accent light, crisp type hierarchy, and deliberate whitespace.
- Define semantic tokens for canvas, surface, elevated surface, border, text, muted text, accent, success, warning, danger, focus, and motion.
- Build reusable primitives for navigation, search/filter, dialog, empty state, data list, stat, form, table, status, and destructive confirmation.
- Treat dark and light themes as two designed systems, not simple color inversion.
- Reduce one-off CSS overrides and hard-coded colors. The current stylesheet contains many `!important` rules and hard-coded values, so tokenization must happen before feature scale increases.
- Add a component gallery and visual regression coverage for both themes, RTL, mobile, tablet, and desktop.

## Immediate Next Step

Expand browser end-to-end coverage for booking, payments, alternative classes, and teacher academic records. The database integration suite now provisions PostgreSQL in CI and exercises cross-center operational and membership guards. Then define assistant delegation and begin QR attendance behind a feature flag.
