import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const accountStatus = pgEnum("account_status", ["active", "suspended"]);
export const membershipRole = pgEnum("membership_role", [
  "student",
  "guardian",
  "teacher",
  "assistant",
  "center_admin",
]);
export const membershipStatus = pgEnum("membership_status", ["active", "suspended", "inactive"]);
export const studentStatus = pgEnum("student_status", ["active", "inactive", "graduated"]);
export const groupStatus = pgEnum("group_status", ["draft", "active", "archived"]);
export const enrollmentStatus = pgEnum("enrollment_status", [
  "pending_payment",
  "active",
  "payment_follow_up",
  "seat_released",
  "cancelled",
]);
export const waitlistStatus = pgEnum("waitlist_status", ["waiting", "offered", "accepted", "expired", "removed"]);
export const paymentObligationStatus = pgEnum("payment_obligation_status", [
  "due",
  "overdue",
  "awaiting_review",
  "paid",
  "waived",
  "void",
]);
export const paymentMethod = pgEnum("payment_method", ["cash", "online_transfer"]);
export const paymentChannelKind = pgEnum("payment_channel_kind", ["instapay", "vodafone_cash", "bank_transfer", "cash"]);
export const paymentRecordStatus = pgEnum("payment_record_status", [
  "submitted",
  "cash_recorded",
  "confirmed",
  "rejected",
  "cancelled",
]);
export const followUpStatus = pgEnum("follow_up_status", ["open", "in_progress", "resolved", "dismissed"]);
export const groupSwitchStatus = pgEnum("group_switch_status", ["pending", "approved", "rejected", "cancelled"]);
export const sessionStatus = pgEnum("session_status", ["scheduled", "cancelled", "completed"]);
export const attendanceStatus = pgEnum("attendance_status", ["present", "late", "absent", "excused"]);
export const homeworkSubmissionStatus = pgEnum("homework_submission_status", [
  "pending",
  "submitted",
  "late",
  "graded",
]);
export const otpPurpose = pgEnum("otp_purpose", ["sign_in", "verify_phone"]);
export const oauthProvider = pgEnum("oauth_provider", ["google"]);
export const registrationRole = pgEnum("registration_role", ["student", "guardian"]);
export const mediaAssetKind = pgEnum("media_asset_kind", ["teacher_profile_photo"]);
export const mediaAssetStatus = pgEnum("media_asset_status", ["pending_upload", "ready", "rejected", "deleted"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Africa/Cairo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phoneE164: varchar("phone_e164", { length: 16 }).unique(),
  email: varchar("email", { length: 320 }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordHash: varchar("password_hash", { length: 256 }),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  status: accountStatus("status").notNull().default("active"),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  lastSignedInAt: timestamp("last_signed_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_ci_unique").on(sql`lower(${table.email})`).where(sql`${table.email} is not null`),
]);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProvider("provider").notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("oauth_accounts_provider_subject_unique").on(table.provider, table.providerAccountId),
    uniqueIndex("oauth_accounts_user_provider_unique").on(table.userId, table.provider),
    index("oauth_accounts_user_idx").on(table.userId),
  ],
);

export const organizationRegistrationCodes = pgTable(
  "organization_registration_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    role: registrationRole("role").notNull(),
    label: varchar("label", { length: 120 }),
    maxUses: integer("max_uses").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdByMembershipId: uuid("created_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organization_registration_codes_hash_unique").on(table.codeHash),
    index("organization_registration_codes_org_status_idx").on(table.organizationId, table.isActive, table.expiresAt),
  ],
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull(),
    status: membershipStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("memberships_org_user_role_unique").on(table.organizationId, table.userId, table.role),
    index("memberships_org_user_idx").on(table.organizationId, table.userId),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_sessions_user_expiry_idx").on(table.userId, table.expiresAt)],
);

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    purpose: otpPurpose("purpose").notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    attemptCount: smallint("attempt_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("otp_challenges_phone_expiry_idx").on(table.phoneE164, table.expiresAt)],
);

export const emailSignupVerificationChallenges = pgTable(
  "email_signup_verification_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    passwordHash: varchar("password_hash", { length: 256 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    attemptCount: smallint("attempt_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("email_signup_verification_challenges_email_expiry_idx").on(table.email, table.expiresAt),
    index("email_signup_verification_challenges_phone_expiry_idx").on(table.phoneE164, table.expiresAt),
  ],
);

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    studentCode: varchar("student_code", { length: 48 }).notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    gradeLevel: varchar("grade_level", { length: 80 }).notNull(),
    status: studentStatus("status").notNull().default("active"),
    createdByMembershipId: uuid("created_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("student_profiles_org_code_unique").on(table.organizationId, table.studentCode),
    uniqueIndex("student_profiles_org_user_unique").on(table.organizationId, table.userId),
    index("student_profiles_org_name_idx").on(table.organizationId, table.fullName),
  ],
);

export const studentAccessCodes = pgTable(
  "student_access_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdByMembershipId: uuid("created_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("student_access_codes_profile_unique").on(table.studentProfileId),
    uniqueIndex("student_access_codes_hash_unique").on(table.codeHash),
    index("student_access_codes_org_status_idx").on(table.organizationId, table.isActive),
    index("student_access_codes_user_idx").on(table.userId),
  ],
);

export const guardianStudentLinks = pgTable(
  "guardian_student_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    guardianMembershipId: uuid("guardian_membership_id")
      .notNull()
      .references(() => organizationMemberships.id, { onDelete: "cascade" }),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    relationship: varchar("relationship", { length: 40 }).notNull().default("guardian"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("guardian_student_links_unique").on(
      table.organizationId,
      table.guardianMembershipId,
      table.studentProfileId,
    ),
    index("guardian_student_links_student_idx").on(table.organizationId, table.studentProfileId),
  ],
);

export const teacherProfiles = pgTable(
  "teacher_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .unique()
      .references(() => organizationMemberships.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    bio: text("bio"),
    profilePhotoKey: varchar("profile_photo_key", { length: 512 }),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("teacher_profiles_org_published_idx").on(table.organizationId, table.isPublished)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByMembershipId: uuid("created_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    kind: mediaAssetKind("kind").notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull().unique(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    status: mediaAssetStatus("status").notNull().default("pending_upload"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    rejectionReason: varchar("rejection_reason", { length: 240 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_assets_org_status_idx").on(table.organizationId, table.status),
    index("media_assets_creator_idx").on(table.organizationId, table.createdByMembershipId),
  ],
);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("subjects_org_name_unique").on(table.organizationId, table.name)],
);

export const teacherSubjects = pgTable(
  "teacher_subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    teacherProfileId: uuid("teacher_profile_id")
      .notNull()
      .references(() => teacherProfiles.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("teacher_subjects_unique").on(table.organizationId, table.teacherProfileId, table.subjectId),
  ],
);

export const academicGroups = pgTable(
  "academic_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    teacherProfileId: uuid("teacher_profile_id")
      .notNull()
      .references(() => teacherProfiles.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    gradeLevel: varchar("grade_level", { length: 80 }).notNull(),
    capacity: integer("capacity").notNull(),
    monthlyFeeMinor: integer("monthly_fee_minor").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("EGP"),
    status: groupStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("academic_groups_discovery_idx").on(table.organizationId, table.subjectId, table.gradeLevel, table.status),
    index("academic_groups_teacher_idx").on(table.organizationId, table.teacherProfileId, table.status),
  ],
);

export const groupSchedules = pgTable(
  "group_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroups.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    roomLabel: varchar("room_label", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("group_schedules_group_idx").on(table.organizationId, table.groupId)],
);

export const groupSessions = pgTable(
  "group_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroups.id, { onDelete: "cascade" }),
    groupScheduleId: uuid("group_schedule_id").references(() => groupSchedules.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: sessionStatus("status").notNull().default("scheduled"),
    attendanceLocked: boolean("attendance_locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("group_sessions_group_start_idx").on(table.organizationId, table.groupId, table.startsAt),
    uniqueIndex("group_sessions_schedule_start_unique")
      .on(table.groupScheduleId, table.startsAt)
      .where(sql`group_schedule_id is not null`),
  ],
);

export const groupEnrollments = pgTable(
  "group_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroups.id, { onDelete: "restrict" }),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "restrict" }),
    status: enrollmentStatus("status").notNull().default("pending_payment"),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    releaseReason: text("release_reason"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("group_enrollments_group_status_idx").on(table.organizationId, table.groupId, table.status),
    index("group_enrollments_student_status_idx").on(table.organizationId, table.studentProfileId, table.status),
  ],
);

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroups.id, { onDelete: "cascade" }),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    status: waitlistStatus("status").notNull().default("waiting"),
    offeredUntil: timestamp("offered_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("waitlist_entries_group_status_created_idx").on(table.organizationId, table.groupId, table.status, table.createdAt)],
);

export const groupSwitchRequests = pgTable(
  "group_switch_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceEnrollmentId: uuid("source_enrollment_id")
      .notNull()
      .references(() => groupEnrollments.id, { onDelete: "restrict" }),
    targetGroupId: uuid("target_group_id")
      .notNull()
      .references(() => academicGroups.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    status: groupSwitchStatus("status").notNull().default("pending"),
    resolvedByMembershipId: uuid("resolved_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("group_switch_requests_org_status_idx").on(table.organizationId, table.status)],
);

export const makeupRequests = pgTable(
  "makeup_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceEnrollmentId: uuid("source_enrollment_id")
      .notNull()
      .references(() => groupEnrollments.id, { onDelete: "restrict" }),
    sourceGroupSessionId: uuid("source_group_session_id")
      .notNull()
      .references(() => groupSessions.id, { onDelete: "restrict" }),
    targetGroupSessionId: uuid("target_group_session_id")
      .notNull()
      .references(() => groupSessions.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    status: groupSwitchStatus("status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedByMembershipId: uuid("reviewed_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("makeup_requests_org_status_idx").on(table.organizationId, table.status),
    index("makeup_requests_target_status_idx").on(table.organizationId, table.targetGroupSessionId, table.status),
    uniqueIndex("makeup_requests_one_open_source_session")
      .on(table.organizationId, table.sourceEnrollmentId, table.sourceGroupSessionId)
      .where(sql`status in ('pending', 'approved')`),
  ],
);

export const paymentObligations = pgTable(
  "payment_obligations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => groupEnrollments.id, { onDelete: "cascade" }),
    billingPeriodStart: date("billing_period_start").notNull(),
    billingPeriodEnd: date("billing_period_end").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("EGP"),
    status: paymentObligationStatus("status").notNull().default("due"),
    seatHoldUntil: timestamp("seat_hold_until", { withTimezone: true }),
    holdNote: text("hold_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_obligations_enrollment_period_unique").on(table.enrollmentId, table.billingPeriodStart),
    index("payment_obligations_org_status_due_idx").on(table.organizationId, table.status, table.dueAt),
  ],
);

export const paymentChannels = pgTable(
  "payment_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: paymentChannelKind("kind").notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    accountHolder: varchar("account_holder", { length: 160 }),
    accountIdentifier: varchar("account_identifier", { length: 160 }),
    instructions: text("instructions"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: smallint("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_channels_org_kind_unique").on(table.organizationId, table.kind),
    index("payment_channels_org_active_order_idx").on(table.organizationId, table.isActive, table.displayOrder),
  ],
);

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => paymentObligations.id, { onDelete: "cascade" }),
    paymentChannelId: uuid("payment_channel_id").references(() => paymentChannels.id, { onDelete: "set null" }),
    method: paymentMethod("method").notNull(),
    status: paymentRecordStatus("status").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    transferReference: varchar("transfer_reference", { length: 160 }),
    proofObjectKey: varchar("proof_object_key", { length: 512 }),
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    recordedByMembershipId: uuid("recorded_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    reviewedByMembershipId: uuid("reviewed_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_records_obligation_status_idx").on(table.organizationId, table.obligationId, table.status),
    index("payment_records_channel_idx").on(table.organizationId, table.paymentChannelId),
    uniqueIndex("payment_records_active_transfer_reference_unique")
      .on(table.organizationId, table.transferReference)
      .where(sql`transfer_reference is not null and status in ('submitted', 'confirmed')`),
  ],
);

export const paymentFollowUpTasks = pgTable(
  "payment_follow_up_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => paymentObligations.id, { onDelete: "cascade" }),
    assigneeMembershipId: uuid("assignee_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    status: followUpStatus("status").notNull().default("open"),
    priority: smallint("priority").notNull().default(2),
    resolutionNote: text("resolution_note"),
    resolvedByMembershipId: uuid("resolved_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payment_follow_up_tasks_queue_idx").on(table.organizationId, table.status, table.priority)],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    groupSessionId: uuid("group_session_id")
      .notNull()
      .references(() => groupSessions.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => groupEnrollments.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull(),
    recordedByMembershipId: uuid("recorded_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("attendance_records_session_enrollment_unique").on(table.groupSessionId, table.enrollmentId)],
);

export const homeworkAssignments = pgTable(
  "homework_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroups.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    instructions: text("instructions"),
    maxScore: integer("max_score").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdByMembershipId: uuid("created_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("homework_assignments_group_due_idx").on(table.organizationId, table.groupId, table.dueAt)],
);

export const homeworkSubmissions = pgTable(
  "homework_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => homeworkAssignments.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => groupEnrollments.id, { onDelete: "cascade" }),
    status: homeworkSubmissionStatus("status").notNull().default("pending"),
    score: integer("score"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    gradedByMembershipId: uuid("graded_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("homework_submissions_assignment_enrollment_unique").on(table.assignmentId, table.enrollmentId)],
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroups.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    maxScore: integer("max_score").notNull(),
    heldAt: timestamp("held_at", { withTimezone: true }),
    createdByMembershipId: uuid("created_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("exams_group_held_idx").on(table.organizationId, table.groupId, table.heldAt)],
);

export const examScores = pgTable(
  "exam_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => groupEnrollments.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    gradedByMembershipId: uuid("graded_by_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("exam_scores_exam_enrollment_unique").on(table.examId, table.enrollmentId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorMembershipId: uuid("actor_membership_id").references(() => organizationMemberships.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 160 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_org_created_idx").on(table.organizationId, table.createdAt)],
);
