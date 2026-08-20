# Phase 0 Product Contract

## Status

Core launch decisions captured on 2026-08-17. This document is the product contract for the first production implementation. Any change to these rules should be recorded as a new decision before implementation.

## Approved Launch Model

### Tenancy

- LevelUp supports multiple independent tutoring centers from day one.
- Each independent center is an `organization` tenant. Data, staff, students, payments, and reports are isolated by `organization_id`.
- The data model remains branch-ready: an organization can later have multiple physical `branches`, rooms, and schedules.
- A person may have memberships in more than one organization, but must explicitly switch context and may never access another tenant's data by URL manipulation or API request.

### Roles And Accounts

| Role | Account and scope |
| --- | --- |
| Student | Individual account authenticated by phone OTP when the student has a phone number. |
| Guardian | Individual account authenticated by phone OTP; can be linked to one or more children. |
| Teacher | Separate individual account, scoped by membership to one or more organizations. |
| Assistant | Separate individual account, scoped by membership to one or more organizations. |
| Center Admin | Separate individual account with center operations permissions. |
| Platform Support | Internal LevelUp role only; excluded from normal tenant operations and audited separately. |

### Student Without A Phone

- A center may create a student profile without creating a login account or inventing a phone number.
- The student can be managed by a linked guardian account or by authorized staff.
- When the student later receives a phone number, the profile can be claimed through a verified OTP or controlled invitation flow.
- A center-created profile must record the staff member, date, and guardian relationship where available.

### Guardian Model

- A guardian can link to multiple students.
- Guardian visibility is limited to linked children, their schedules, invoices, payment status, attendance, permitted academic information, and communication preferences.
- A guardian cannot see other students, teacher private data, staff operations, or unrelated center records.
- Link/unlink operations require an auditable staff action or verified guardian flow.

## Authentication Policy

- Phone OTP is the primary authentication method for students and guardians.
- Staff use their own phone-authenticated accounts; privileged staff must support a stronger second factor before launch.
- A printed/student access code is an identifier or invitation aid only, never a complete login credential.
- Authentication uses server-owned Secure, HttpOnly, SameSite session cookies. No authenticated state is stored in localStorage.
- OTP, invitation, password recovery, and session refresh endpoints require rate limiting, expiry, retry limits, and audit events.

## Manual Payment And Renewal Policy

### Supported Methods In The First Release

1. Cash at the center.
2. Manual online transfer. The student or guardian submits a transfer reference and optional receipt; an assistant verifies it.

There is no payment gateway in the first release. The product must never show a payment as successful merely because a browser button was clicked.

### Payment States

- `open`: invoice exists and can be paid.
- `pending_review`: a manual transfer was submitted and needs staff verification.
- `paid`: cash or transfer was verified by an authorized staff member.
- `overdue`: the payment deadline passed.
- `held_by_staff`: a staff member approved a temporary seat hold with an explicit expiry date and reason.
- `released`: the student seat was released by staff action.
- `void` or `refunded`: administrative terminal states with an audit trail.

### Unpaid Student Policy

The first production release uses a human-in-the-loop policy:

1. The system opens the renewal window and sends configured reminders.
2. At the payment deadline, it marks the invoice overdue and creates an "unpaid students" task for the relevant assistant.
3. The assistant chooses one action per student:
   - Mark cash as received.
   - Approve or reject a manual transfer.
   - Extend the seat hold until a specific date and write a reason.
   - Mark an approved discount/scholarship exception.
   - Release the seat now.
4. Releasing a seat is audited and triggers the waiting-list offer workflow.
5. If an assistant does not decide, the task escalates to the Center Admin. The system does not silently remove the student in the first release.

Later, each organization may enable a configurable automatic release rule after an explicit grace period. It is disabled by default until the payment operation is proven stable.

### Booking And Seat Rules

- Booking creates a short-lived database seat hold, not a final enrollment.
- The hold expires if the required payment or staff approval does not happen by the configured deadline.
- Capacity checks, seat holds, enrollment, and release happen in server-side transactions to prevent overselling the last seat.
- A released seat first goes to the next eligible waiting-list entry. The invitation has its own expiry before the next person is considered.

## Attendance

- QR attendance is intentionally deferred from the initial production slice.
- Phase 1 attendance is staff-recorded with present, late, absent, and authorized correction history.
- QR design starts only after the session, enrollment, manual override, and attendance data models are stable.

## Academic Progress

- Progress combines attendance, homework, and exam results.
- Scores and rankings are calculated on the server from source records, never trusted from the browser.
- Each organization can configure the weights. Proposed launch default: attendance 30%, homework 30%, exams 40%.
- Students see their own score, percentile/rank context, and next improvement action. They do not see classmates' private marks.
- Corrections to attendance, submissions, or grades create an audit event and recalculate affected progress snapshots.

## First Data Model Implications

The first schema must include at least:

- `organizations`, `branches`, `rooms`.
- `users`, `sessions`, `organization_memberships`, `roles`, `invites`.
- `student_profiles`, `guardian_profiles`, `guardian_students`, `teacher_profiles`, `staff_profiles`.
- `subjects`, `grade_levels`, `groups`, `group_schedules`, `sessions`.
- `enrollments`, `seat_holds`, `waitlist_entries`, `makeup_requests`.
- `invoices`, `invoice_lines`, `manual_payment_submissions`, `payment_reviews`.
- `attendance_records`, `attendance_overrides`.
- `assignments`, `submissions`, `assessments`, `assessment_scores`, `progress_snapshots`.
- `notifications`, `message_templates`, `audit_events`, `outbox_events`, `idempotency_keys`, `media_assets`.

## Remaining Decisions Before Payment And Launch

1. Renewal grace period and reminder schedule per organization.
2. The exact manual transfer instructions and whether a receipt image is mandatory.
3. OTP provider, message sender identity, delivery-cost policy, and staff second-factor method.
4. Guardian consent and permitted academic visibility rules for minors.
5. Whether teachers can work in more than one organization during launch.
6. Final score weighting default and whether it changes by subject or grade.
7. Refund, cancellation, late-payment, and scholarship policies.

## Phase 0 Exit Criteria

- The approved rules above are reflected in the architecture, schema, API contracts, and test cases.
- No production implementation uses demo access codes, client-side authority, or implicit cross-tenant access.
- The remaining decisions are either resolved before their feature starts or expressed as organization-level configuration with secure defaults.
