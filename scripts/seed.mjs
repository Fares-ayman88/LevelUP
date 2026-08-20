import dotenv from "dotenv";

import { createHmac, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const developmentUsers = {
  assistant: { email: "assistant@levelup.demo", name: "Nour Hassan", phone: "+201512345678" },
  centerAdmin: { email: "admin@levelup.demo", name: "Wael Barakat", phone: "+201012345679" },
  chemistryTeacher: { email: "chemistry.teacher@levelup.demo", name: "Mariam Ahmed", phone: "+201012345670" },
  guardian: { email: "guardian@levelup.demo", name: "Sara Ali", phone: "+201112345678" },
  mathematicsTeacher: { email: "mathematics.teacher@levelup.demo", name: "Omar Samir", phone: "+201112345670" },
  student: { email: "student@levelup.demo", name: "Mohamed Ali", phone: "+201012345678" },
  teacher: { email: "teacher@levelup.demo", name: "Ahmed Mohamed", phone: "+201212345678" },
};

const DEVELOPMENT_PASSWORD = "LevelUpDemo!2026";
const developmentRegistrationCodes = {
  guardian: "LU-GUARDIAN-DEMO-2026",
  student: "LU-STUDENT-DEMO-2026",
};
const scryptAsync = promisify(scrypt);

async function createDevelopmentPasswordHash() {
  const derivedKey = await scryptAsync(DEVELOPMENT_PASSWORD, "levelup-development-seed-v1", 64, {
    N: 16_384,
    maxmem: 32 * 1024 * 1024,
    p: 1,
    r: 8,
  });
  return ["scrypt", "16384", "8", "1", "levelup-development-seed-v1", Buffer.from(derivedKey).toString("base64url")].join("$");
}

async function one(client, query, values) {
  const result = await client.query(query, values);
  const row = result.rows[0];
  if (!row) throw new Error("Expected the development seed query to return one row.");
  return row;
}

async function upsertOrganization(client, name, slug) {
  const row = await one(
    client,
    `
      INSERT INTO organizations (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [name, slug],
  );
  return row.id;
}

function hashRegistrationCode(code) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required before creating registration codes.");
  const normalized = code.trim().toUpperCase().replace(/[\s_]+/g, "-");
  return createHmac("sha256", secret).update(`registration-code:${normalized}`).digest("hex");
}

async function upsertRegistrationCode(client, organizationId, input) {
  await client.query(
    `
      INSERT INTO organization_registration_codes (
        organization_id, code_hash, role, label, max_uses, used_count, expires_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, 0, now() + interval '365 days', true)
      ON CONFLICT (code_hash) DO UPDATE
        SET organization_id = EXCLUDED.organization_id,
            role = EXCLUDED.role,
            label = EXCLUDED.label,
            max_uses = EXCLUDED.max_uses,
            used_count = 0,
            expires_at = EXCLUDED.expires_at,
            is_active = true
    `,
    [organizationId, hashRegistrationCode(input.code), input.role, input.label, input.maxUses],
  );
}

async function upsertUser(client, user, passwordHash) {
  const row = await one(
    client,
    `
      INSERT INTO users (phone_e164, email, email_verified_at, password_hash, full_name, status)
      VALUES ($1, $2, now(), $3, $4, 'active')
      ON CONFLICT (phone_e164) DO UPDATE
        SET email = EXCLUDED.email,
            email_verified_at = EXCLUDED.email_verified_at,
            password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            status = 'active'
      RETURNING id
    `,
    [user.phone, user.email, passwordHash, user.name],
  );
  return row.id;
}

async function upsertMembership(client, organizationId, userId, role) {
  const row = await one(
    client,
    `
      INSERT INTO organization_memberships (organization_id, user_id, role, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (organization_id, user_id, role) DO UPDATE SET status = 'active'
      RETURNING id
    `,
    [organizationId, userId, role],
  );
  return row.id;
}

async function upsertPaymentChannel(client, organizationId, channel) {
  await client.query(
    `
      INSERT INTO payment_channels (
        organization_id, kind, label, account_holder, account_identifier, instructions, is_active, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (organization_id, kind) DO UPDATE
        SET label = EXCLUDED.label,
            account_holder = EXCLUDED.account_holder,
            account_identifier = EXCLUDED.account_identifier,
            instructions = EXCLUDED.instructions,
            is_active = EXCLUDED.is_active,
            display_order = EXCLUDED.display_order
    `,
    [
      organizationId,
      channel.kind,
      channel.label,
      channel.accountHolder,
      channel.accountIdentifier,
      channel.instructions,
      channel.isActive,
      channel.displayOrder,
    ],
  );
}

async function upsertTeacherProfile(client, organizationId, membershipId, displayName) {
  const row = await one(
    client,
    `
      INSERT INTO teacher_profiles (organization_id, membership_id, display_name, is_published)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (membership_id) DO UPDATE
        SET display_name = EXCLUDED.display_name, is_published = true
      RETURNING id
    `,
    [organizationId, membershipId, displayName],
  );
  return row.id;
}

async function upsertSubject(client, organizationId, name) {
  const row = await one(
    client,
    `
      INSERT INTO subjects (organization_id, name)
      VALUES ($1, $2)
      ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [organizationId, name],
  );
  return row.id;
}

async function linkTeacherToSubject(client, organizationId, teacherProfileId, subjectId) {
  await client.query(
    `
      INSERT INTO teacher_subjects (organization_id, teacher_profile_id, subject_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (organization_id, teacher_profile_id, subject_id) DO NOTHING
    `,
    [organizationId, teacherProfileId, subjectId],
  );
}

async function upsertGroup(client, { capacity, monthlyFeeMinor, name, organizationId, subjectId, teacherProfileId }) {
  const existing = await client.query(
    `SELECT id FROM academic_groups WHERE organization_id = $1 AND name = $2 LIMIT 1`,
    [organizationId, name],
  );

  if (existing.rows[0]) {
    await client.query(
      `
        UPDATE academic_groups
        SET teacher_profile_id = $2,
            subject_id = $3,
            grade_level = '3rd Secondary',
            capacity = $4,
            monthly_fee_minor = $5,
            status = 'active'
        WHERE id = $1
      `,
      [existing.rows[0].id, teacherProfileId, subjectId, capacity, monthlyFeeMinor],
    );
    return existing.rows[0].id;
  }

  const row = await one(
    client,
    `
      INSERT INTO academic_groups (
        organization_id, teacher_profile_id, subject_id, name, grade_level, capacity, monthly_fee_minor, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id
    `,
    [organizationId, teacherProfileId, subjectId, name, "3rd Secondary", capacity, monthlyFeeMinor],
  );
  return row.id;
}

async function ensureSchedule(client, organizationId, groupId, weekday, startsAt, endsAt, roomLabel) {
  const existing = await client.query(
    `
      SELECT id
      FROM group_schedules
      WHERE organization_id = $1 AND group_id = $2
      ORDER BY created_at
      LIMIT 1
    `,
    [organizationId, groupId],
  );

  if (existing.rows[0]) {
    await client.query(
      `
        UPDATE group_schedules
        SET weekday = $2, starts_at = $3, ends_at = $4, room_label = $5
        WHERE id = $1
      `,
      [existing.rows[0].id, weekday, startsAt, endsAt, roomLabel],
    );
    return existing.rows[0].id;
  }

  const row = await one(
    client,
    `
      INSERT INTO group_schedules (organization_id, group_id, weekday, starts_at, ends_at, room_label)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [organizationId, groupId, weekday, startsAt, endsAt, roomLabel],
  );
  return row.id;
}

async function upsertUnclaimedStudent(client, organizationId, studentCode, fullName) {
  const row = await one(
    client,
    `
      INSERT INTO student_profiles (organization_id, student_code, full_name, grade_level, status)
      VALUES ($1, $2, $3, '3rd Secondary', 'active')
      ON CONFLICT (organization_id, student_code) DO UPDATE
        SET full_name = EXCLUDED.full_name, grade_level = EXCLUDED.grade_level, status = 'active'
      RETURNING id
    `,
    [organizationId, studentCode, fullName],
  );
  return row.id;
}

async function ensureEnrollment(client, organizationId, groupId, studentProfileId) {
  await client.query(
    `
      INSERT INTO group_enrollments (organization_id, group_id, student_profile_id, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT DO NOTHING
    `,
    [organizationId, groupId, studentProfileId],
  );
}

async function seedCohort(client, organizationId, groupId, prefix, size) {
  const studentProfileIds = [];
  for (let index = 1; index <= size; index += 1) {
    const ordinal = String(index).padStart(2, "0");
    const studentProfileId = await upsertUnclaimedStudent(
      client,
      organizationId,
      `${prefix}-${ordinal}`,
      `Demo ${prefix} Student ${ordinal}`,
    );
    await ensureEnrollment(client, organizationId, groupId, studentProfileId);
    studentProfileIds.push(studentProfileId);
  }
  return studentProfileIds;
}

async function getEnrollment(client, organizationId, groupId, studentProfileId) {
  return one(
    client,
    `
      SELECT id
      FROM group_enrollments
      WHERE organization_id = $1
        AND group_id = $2
        AND student_profile_id = $3
        AND status IN ('pending_payment', 'active', 'payment_follow_up')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [organizationId, groupId, studentProfileId],
  );
}

async function ensureGroupSession(client, { endsAt, groupId, groupScheduleId, organizationId, startsAt, status }) {
  const row = await one(
    client,
    `
      INSERT INTO group_sessions (organization_id, group_id, group_schedule_id, starts_at, ends_at, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (group_schedule_id, starts_at) WHERE group_schedule_id IS NOT NULL
      DO UPDATE SET ends_at = EXCLUDED.ends_at, status = EXCLUDED.status
      RETURNING id
    `,
    [organizationId, groupId, groupScheduleId, startsAt, endsAt, status],
  );
  return row.id;
}

async function ensureAttendanceRecord(client, organizationId, groupSessionId, enrollmentId, status) {
  await client.query(
    `
      INSERT INTO attendance_records (organization_id, group_session_id, enrollment_id, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (group_session_id, enrollment_id) DO UPDATE SET status = EXCLUDED.status
    `,
    [organizationId, groupSessionId, enrollmentId, status],
  );
}

async function upsertHomeworkAssignment(client, organizationId, groupId, title, maxScore) {
  const existing = await client.query(
    `SELECT id FROM homework_assignments WHERE organization_id = $1 AND group_id = $2 AND title = $3 LIMIT 1`,
    [organizationId, groupId, title],
  );

  if (existing.rows[0]) {
    await client.query(`UPDATE homework_assignments SET max_score = $2 WHERE id = $1`, [existing.rows[0].id, maxScore]);
    return existing.rows[0].id;
  }

  const row = await one(
    client,
    `
      INSERT INTO homework_assignments (organization_id, group_id, title, max_score)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [organizationId, groupId, title, maxScore],
  );
  return row.id;
}

async function ensureHomeworkScore(client, organizationId, assignmentId, enrollmentId, score) {
  await client.query(
    `
      INSERT INTO homework_submissions (organization_id, assignment_id, enrollment_id, status, score, graded_at)
      VALUES ($1, $2, $3, 'graded', $4, now())
      ON CONFLICT (assignment_id, enrollment_id)
      DO UPDATE SET status = 'graded', score = EXCLUDED.score, graded_at = now()
    `,
    [organizationId, assignmentId, enrollmentId, score],
  );
}

async function upsertExam(client, organizationId, groupId, title, maxScore) {
  const existing = await client.query(
    `SELECT id FROM exams WHERE organization_id = $1 AND group_id = $2 AND title = $3 LIMIT 1`,
    [organizationId, groupId, title],
  );

  if (existing.rows[0]) {
    await client.query(`UPDATE exams SET max_score = $2 WHERE id = $1`, [existing.rows[0].id, maxScore]);
    return existing.rows[0].id;
  }

  const row = await one(
    client,
    `
      INSERT INTO exams (organization_id, group_id, title, max_score, held_at)
      VALUES ($1, $2, $3, $4, now())
      RETURNING id
    `,
    [organizationId, groupId, title, maxScore],
  );
  return row.id;
}

async function ensureExamScore(client, organizationId, examId, enrollmentId, score) {
  await client.query(
    `
      INSERT INTO exam_scores (organization_id, exam_id, enrollment_id, score)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (exam_id, enrollment_id) DO UPDATE SET score = EXCLUDED.score
    `,
    [organizationId, examId, enrollmentId, score],
  );
}

function relativeDate(daysFromNow, hours, minutes = 0) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + daysFromNow);
  value.setUTCHours(hours, minutes, 0, 0);
  return value;
}

function addHours(value, hours) {
  return new Date(value.getTime() + (hours * 60 * 60 * 1000));
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development seed data cannot run in production.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before running the development seed.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const developmentPasswordHash = await createDevelopmentPasswordHash();
    await client.query("BEGIN");

    const levelUpIsmailiaId = await upsertOrganization(client, "LevelUp Ismailia", "levelup-ismailia");
    const nileLearningHubId = await upsertOrganization(client, "Nile Learning Hub", "nile-learning-hub");

    await upsertRegistrationCode(client, levelUpIsmailiaId, {
      code: developmentRegistrationCodes.student,
      label: "Demo student access",
      maxUses: 100,
      role: "student",
    });
    await upsertRegistrationCode(client, levelUpIsmailiaId, {
      code: developmentRegistrationCodes.guardian,
      label: "Demo guardian access",
      maxUses: 100,
      role: "guardian",
    });

    const paymentChannels = [
      {
        accountHolder: "LevelUp Ismailia Demo",
        accountIdentifier: "levelup.demo@instapay",
        displayOrder: 10,
        instructions: "Demo payment detail only. Use the student name in the note, then enter the transfer reference below.",
        isActive: true,
        kind: "instapay",
        label: "InstaPay",
      },
      {
        accountHolder: "LevelUp Ismailia Demo",
        accountIdentifier: "0100 000 0000",
        displayOrder: 20,
        instructions: "Demo wallet number only. Keep the confirmation reference after the transfer.",
        isActive: true,
        kind: "vodafone_cash",
        label: "Vodafone Cash",
      },
      {
        accountHolder: "LevelUp Ismailia Demo",
        accountIdentifier: "EG00 0000 0000 0000 0000 0000 000",
        displayOrder: 30,
        instructions: "Demo bank detail only. Add the student name to the transfer note.",
        isActive: false,
        kind: "bank_transfer",
        label: "Bank transfer",
      },
      {
        accountHolder: "Wael Barakat",
        accountIdentifier: "Main reception",
        displayOrder: 40,
        instructions: "Ask reception for a stamped receipt. The center team confirms cash payments.",
        isActive: true,
        kind: "cash",
        label: "Cash at the center",
      },
    ];

    for (const paymentChannel of paymentChannels) {
      await upsertPaymentChannel(client, levelUpIsmailiaId, paymentChannel);
    }

    const studentUserId = await upsertUser(client, developmentUsers.student, developmentPasswordHash);
    const guardianUserId = await upsertUser(client, developmentUsers.guardian, developmentPasswordHash);
    const teacherUserId = await upsertUser(client, developmentUsers.teacher, developmentPasswordHash);
    const chemistryTeacherUserId = await upsertUser(client, developmentUsers.chemistryTeacher, developmentPasswordHash);
    const mathematicsTeacherUserId = await upsertUser(client, developmentUsers.mathematicsTeacher, developmentPasswordHash);
    const assistantUserId = await upsertUser(client, developmentUsers.assistant, developmentPasswordHash);
    const centerAdminUserId = await upsertUser(client, developmentUsers.centerAdmin, developmentPasswordHash);

    const studentMembershipId = await upsertMembership(client, levelUpIsmailiaId, studentUserId, "student");
    const guardianMembershipId = await upsertMembership(client, levelUpIsmailiaId, guardianUserId, "guardian");
    const teacherMembershipId = await upsertMembership(client, levelUpIsmailiaId, teacherUserId, "teacher");
    const chemistryTeacherMembershipId = await upsertMembership(client, levelUpIsmailiaId, chemistryTeacherUserId, "teacher");
    const mathematicsTeacherMembershipId = await upsertMembership(client, levelUpIsmailiaId, mathematicsTeacherUserId, "teacher");
    await upsertMembership(client, levelUpIsmailiaId, assistantUserId, "assistant");
    await upsertMembership(client, levelUpIsmailiaId, centerAdminUserId, "center_admin");
    await upsertMembership(client, nileLearningHubId, centerAdminUserId, "center_admin");

    const studentProfile = await one(
      client,
      `
        INSERT INTO student_profiles (
          organization_id, user_id, student_code, full_name, grade_level, status, created_by_membership_id
        )
        VALUES ($1, $2, 'ST-2048', $3, '3rd Secondary', 'active', $4)
        ON CONFLICT (organization_id, user_id) DO UPDATE
          SET full_name = EXCLUDED.full_name, grade_level = EXCLUDED.grade_level, status = 'active'
        RETURNING id
      `,
      [levelUpIsmailiaId, studentUserId, developmentUsers.student.name, studentMembershipId],
    );
    const siblingProfileId = await upsertUnclaimedStudent(
      client,
      levelUpIsmailiaId,
      "ST-2049",
      "Hana Ali",
    );

    await client.query(
      `
        INSERT INTO guardian_student_links (organization_id, guardian_membership_id, student_profile_id, relationship)
        VALUES ($1, $2, $3, 'parent')
        ON CONFLICT (organization_id, guardian_membership_id, student_profile_id) DO NOTHING
      `,
      [levelUpIsmailiaId, guardianMembershipId, studentProfile.id],
    );
    await client.query(
      `
        INSERT INTO guardian_student_links (organization_id, guardian_membership_id, student_profile_id, relationship)
        VALUES ($1, $2, $3, 'parent')
        ON CONFLICT (organization_id, guardian_membership_id, student_profile_id) DO NOTHING
      `,
      [levelUpIsmailiaId, guardianMembershipId, siblingProfileId],
    );

    const physicsTeacherProfileId = await upsertTeacherProfile(
      client,
      levelUpIsmailiaId,
      teacherMembershipId,
      developmentUsers.teacher.name,
    );
    const chemistryTeacherProfileId = await upsertTeacherProfile(
      client,
      levelUpIsmailiaId,
      chemistryTeacherMembershipId,
      developmentUsers.chemistryTeacher.name,
    );
    const mathematicsTeacherProfileId = await upsertTeacherProfile(
      client,
      levelUpIsmailiaId,
      mathematicsTeacherMembershipId,
      developmentUsers.mathematicsTeacher.name,
    );

    const physicsSubjectId = await upsertSubject(client, levelUpIsmailiaId, "Physics");
    const chemistrySubjectId = await upsertSubject(client, levelUpIsmailiaId, "Chemistry");
    const mathematicsSubjectId = await upsertSubject(client, levelUpIsmailiaId, "Mathematics");

    await linkTeacherToSubject(client, levelUpIsmailiaId, physicsTeacherProfileId, physicsSubjectId);
    await linkTeacherToSubject(client, levelUpIsmailiaId, chemistryTeacherProfileId, chemistrySubjectId);
    await linkTeacherToSubject(client, levelUpIsmailiaId, mathematicsTeacherProfileId, mathematicsSubjectId);

    const physicsGroupId = await upsertGroup(client, {
      capacity: 24,
      monthlyFeeMinor: 40000,
      name: "Physics 3A",
      organizationId: levelUpIsmailiaId,
      subjectId: physicsSubjectId,
      teacherProfileId: physicsTeacherProfileId,
    });
    const physicsMakeupGroupId = await upsertGroup(client, {
      capacity: 18,
      monthlyFeeMinor: 40000,
      name: "Physics 3B",
      organizationId: levelUpIsmailiaId,
      subjectId: physicsSubjectId,
      teacherProfileId: physicsTeacherProfileId,
    });
    const mathematicsGroupId = await upsertGroup(client, {
      capacity: 14,
      monthlyFeeMinor: 45000,
      name: "Mathematics 3B",
      organizationId: levelUpIsmailiaId,
      subjectId: mathematicsSubjectId,
      teacherProfileId: mathematicsTeacherProfileId,
    });
    const chemistryGroupId = await upsertGroup(client, {
      capacity: 12,
      monthlyFeeMinor: 42000,
      name: "Chemistry 3C",
      organizationId: levelUpIsmailiaId,
      subjectId: chemistrySubjectId,
      teacherProfileId: chemistryTeacherProfileId,
    });

    const physicsScheduleId = await ensureSchedule(client, levelUpIsmailiaId, physicsGroupId, 0, "17:00", "19:00", "Room 2");
    const physicsMakeupScheduleId = await ensureSchedule(client, levelUpIsmailiaId, physicsMakeupGroupId, 4, "18:00", "20:00", "Room 3");
    await ensureSchedule(client, levelUpIsmailiaId, mathematicsGroupId, 2, "18:00", "20:00", "Room 1");
    await ensureSchedule(client, levelUpIsmailiaId, chemistryGroupId, 4, "16:00", "18:00", "Room 4");

    await ensureEnrollment(client, levelUpIsmailiaId, physicsGroupId, studentProfile.id);
    const physicsPeerStudentIds = await seedCohort(client, levelUpIsmailiaId, physicsGroupId, "PHY", 7);
    await seedCohort(client, levelUpIsmailiaId, physicsMakeupGroupId, "PHYB", 9);
    await seedCohort(client, levelUpIsmailiaId, mathematicsGroupId, "MATH", 12);
    await seedCohort(client, levelUpIsmailiaId, chemistryGroupId, "CHEM", 12);

    const enrollment = await getEnrollment(client, levelUpIsmailiaId, physicsGroupId, studentProfile.id);
    const physicsPeerEnrollments = [];
    for (const studentProfileId of physicsPeerStudentIds) {
      physicsPeerEnrollments.push(await getEnrollment(client, levelUpIsmailiaId, physicsGroupId, studentProfileId));
    }
    const physicsEnrollmentIds = [enrollment.id, ...physicsPeerEnrollments.map((peer) => peer.id)];

    const pastPhysicsStarts = [-28, -21, -14, -7].map((days) => relativeDate(days, 15));
    const pastPhysicsSessionIds = [];
    for (const startsAt of pastPhysicsStarts) {
      pastPhysicsSessionIds.push(await ensureGroupSession(client, {
        endsAt: addHours(startsAt, 2),
        groupId: physicsGroupId,
        groupScheduleId: physicsScheduleId,
        organizationId: levelUpIsmailiaId,
        startsAt,
        status: "completed",
      }));
    }

    const upcomingPhysicsStart = relativeDate(3, 15);
    const followingPhysicsStart = relativeDate(10, 15);
    const firstMakeupStart = relativeDate(2, 16);
    const secondMakeupStart = relativeDate(9, 16);
    const thirdMakeupStart = relativeDate(11, 16);
    const scheduledPhysicsSessions = [
      {
        endsAt: addHours(upcomingPhysicsStart, 2),
        groupId: physicsGroupId,
        groupScheduleId: physicsScheduleId,
        organizationId: levelUpIsmailiaId,
        startsAt: upcomingPhysicsStart,
        status: "scheduled",
      },
      {
        endsAt: addHours(followingPhysicsStart, 2),
        groupId: physicsGroupId,
        groupScheduleId: physicsScheduleId,
        organizationId: levelUpIsmailiaId,
        startsAt: followingPhysicsStart,
        status: "scheduled",
      },
      {
        endsAt: addHours(firstMakeupStart, 2),
        groupId: physicsMakeupGroupId,
        groupScheduleId: physicsMakeupScheduleId,
        organizationId: levelUpIsmailiaId,
        startsAt: firstMakeupStart,
        status: "scheduled",
      },
      {
        endsAt: addHours(secondMakeupStart, 2),
        groupId: physicsMakeupGroupId,
        groupScheduleId: physicsMakeupScheduleId,
        organizationId: levelUpIsmailiaId,
        startsAt: secondMakeupStart,
        status: "scheduled",
      },
      {
        endsAt: addHours(thirdMakeupStart, 2),
        groupId: physicsMakeupGroupId,
        groupScheduleId: physicsMakeupScheduleId,
        organizationId: levelUpIsmailiaId,
        startsAt: thirdMakeupStart,
        status: "scheduled",
      },
    ];

    for (const session of scheduledPhysicsSessions) {
      await ensureGroupSession(client, session);
    }

    const scoreProfiles = [
      { attendance: ["present", "present", "late", "absent"], exams: 41, homework: [16, 17] },
      { attendance: ["present", "present", "present", "present"], exams: 48, homework: [20, 19] },
      { attendance: ["present", "present", "present", "late"], exams: 45, homework: [18, 19] },
      { attendance: ["present", "present", "late", "present"], exams: 43, homework: [18, 18] },
      { attendance: ["present", "late", "present", "absent"], exams: 39, homework: [16, 18] },
      { attendance: ["present", "absent", "present", "present"], exams: 37, homework: [17, 15] },
      { attendance: ["late", "present", "absent", "present"], exams: 35, homework: [15, 16] },
      { attendance: ["present", "absent", "late", "present"], exams: 33, homework: [14, 15] },
    ];

    const kinematicsHomeworkId = await upsertHomeworkAssignment(client, levelUpIsmailiaId, physicsGroupId, "Kinematics practice", 20);
    const forcesHomeworkId = await upsertHomeworkAssignment(client, levelUpIsmailiaId, physicsGroupId, "Forces review", 20);
    const motionExamId = await upsertExam(client, levelUpIsmailiaId, physicsGroupId, "Motion checkpoint", 50);

    for (const [index, enrollmentId] of physicsEnrollmentIds.entries()) {
      const profile = scoreProfiles[index] ?? scoreProfiles[scoreProfiles.length - 1];
      if (!profile) continue;

      for (const [sessionIndex, groupSessionId] of pastPhysicsSessionIds.entries()) {
        const attendance = profile.attendance[sessionIndex];
        if (attendance) await ensureAttendanceRecord(client, levelUpIsmailiaId, groupSessionId, enrollmentId, attendance);
      }
      await ensureHomeworkScore(client, levelUpIsmailiaId, kinematicsHomeworkId, enrollmentId, profile.homework[0]);
      await ensureHomeworkScore(client, levelUpIsmailiaId, forcesHomeworkId, enrollmentId, profile.homework[1]);
      await ensureExamScore(client, levelUpIsmailiaId, motionExamId, enrollmentId, profile.exams);
    }

    const periodStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0));
    const dueAt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 5, 21));

    await client.query(
      `
        INSERT INTO payment_obligations (
          organization_id, enrollment_id, billing_period_start, billing_period_end, due_at, amount_minor, status
        )
        VALUES ($1, $2, $3, $4, $5, 40000, 'due')
        ON CONFLICT (enrollment_id, billing_period_start) DO NOTHING
      `,
      [levelUpIsmailiaId, enrollment.id, periodStart.toISOString().slice(0, 10), periodEnd.toISOString().slice(0, 10), dueAt],
    );

    await client.query("COMMIT");
    console.info(`Development data seeded. Use /sign-in with one of the documented development email accounts. Student code: ${developmentRegistrationCodes.student}; guardian code: ${developmentRegistrationCodes.guardian}.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Development seed failed.", error);
  process.exitCode = 1;
});
