import dotenv from "dotenv";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";

if (databaseUrl && !databaseName.endsWith("_test")) {
  throw new Error("Integration tests require a database name ending in _test.");
}

const databaseDescribe = databaseUrl ? describe : describe.skip;

type IdRow = { id: string };

databaseDescribe("tenant integrity guards", () => {
  let client: Client;

  async function one(query: string, values: unknown[] = []): Promise<IdRow> {
    const result = await client.query<IdRow>(query, values);
    const row = result.rows[0];
    if (!row) throw new Error("Expected a row from the integration test setup.");
    return row;
  }

  async function createOrganization(slug: string): Promise<string> {
    const row = await one(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [slug, slug],
    );
    return row.id;
  }

  async function createTeacherGroup(organizationId: string, suffix: string): Promise<{ groupId: string; scheduleId: string }> {
    const user = await one("INSERT INTO users (full_name) VALUES ($1) RETURNING id", [`Teacher ${suffix}`]);
    const membership = await one(
      "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES ($1, $2, 'teacher') RETURNING id",
      [organizationId, user.id],
    );
    const teacher = await one(
      "INSERT INTO teacher_profiles (organization_id, membership_id, display_name) VALUES ($1, $2, $3) RETURNING id",
      [organizationId, membership.id, `Teacher ${suffix}`],
    );
    const subject = await one(
      "INSERT INTO subjects (organization_id, name) VALUES ($1, $2) RETURNING id",
      [organizationId, `Physics ${suffix}`],
    );
    const group = await one(
      `
        INSERT INTO academic_groups (
          organization_id, teacher_profile_id, subject_id, name, grade_level, capacity, monthly_fee_minor, status
        )
        VALUES ($1, $2, $3, $4, '3rd Secondary', 20, 40000, 'active')
        RETURNING id
      `,
      [organizationId, teacher.id, subject.id, `Group ${suffix}`],
    );
    const schedule = await one(
      "INSERT INTO group_schedules (organization_id, group_id, weekday, starts_at, ends_at) VALUES ($1, $2, 0, '17:00', '19:00') RETURNING id",
      [organizationId, group.id],
    );
    return { groupId: group.id, scheduleId: schedule.id };
  }

  async function createStudent(organizationId: string, suffix: string): Promise<string> {
    const row = await one(
      "INSERT INTO student_profiles (organization_id, student_code, full_name, grade_level) VALUES ($1, $2, $3, '3rd Secondary') RETURNING id",
      [organizationId, `ST-${suffix}`, `Student ${suffix}`],
    );
    return row.id;
  }

  async function createPaymentObligation(organizationId: string, suffix: string): Promise<{ obligationId: string }> {
    const group = await createTeacherGroup(organizationId, `Payment ${suffix}`);
    const studentId = await createStudent(organizationId, `Payment ${suffix}`);
    const enrollment = await one(
      "INSERT INTO group_enrollments (organization_id, group_id, student_profile_id, status) VALUES ($1, $2, $3, 'active') RETURNING id",
      [organizationId, group.groupId, studentId],
    );
    const obligation = await one(
      `
        INSERT INTO payment_obligations (
          organization_id, enrollment_id, billing_period_start, billing_period_end, due_at, amount_minor, status
        )
        VALUES ($1, $2, '2026-09-01', '2026-09-30', '2026-09-05T12:00:00.000Z', 40000, 'due')
        RETURNING id
      `,
      [organizationId, enrollment.id],
    );
    return { obligationId: obligation.id };
  }

  async function createSession(organizationId: string, groupId: string, scheduleId: string, startsAt: string): Promise<string> {
    const row = await one(
      `
        INSERT INTO group_sessions (organization_id, group_id, group_schedule_id, starts_at, ends_at, status)
        VALUES ($1, $2, $3, $4, $5, 'scheduled')
        RETURNING id
      `,
      [organizationId, groupId, scheduleId, startsAt, new Date(new Date(startsAt).getTime() + (2 * 60 * 60 * 1000)).toISOString()],
    );
    return row.id;
  }

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  beforeEach(async () => {
    await client.query("TRUNCATE TABLE organizations CASCADE");
  });

  afterAll(async () => {
    await client.end();
  });

  it("rejects a cross-center enrollment even when both foreign keys exist", async () => {
    const organizationA = await createOrganization("center-a");
    const organizationB = await createOrganization("center-b");
    const groupA = await createTeacherGroup(organizationA, "A");
    const studentB = await createStudent(organizationB, "B");

    await expect(
      client.query(
        "INSERT INTO group_enrollments (organization_id, group_id, student_profile_id, status) VALUES ($1, $2, $3, 'active')",
        [organizationA, groupA.groupId, studentB],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("guards session schedules and allows only one open make-up request per source class", async () => {
    const organizationId = await createOrganization("center-main");
    const group = await createTeacherGroup(organizationId, "Main");
    const studentId = await createStudent(organizationId, "Main");
    const enrollment = await one(
      "INSERT INTO group_enrollments (organization_id, group_id, student_profile_id, status) VALUES ($1, $2, $3, 'active') RETURNING id",
      [organizationId, group.groupId, studentId],
    );
    const sourceSessionId = await createSession(organizationId, group.groupId, group.scheduleId, "2026-09-01T15:00:00.000Z");
    const targetSessionId = await createSession(organizationId, group.groupId, group.scheduleId, "2026-09-08T15:00:00.000Z");

    await expect(
      client.query(
        `
          INSERT INTO group_sessions (organization_id, group_id, group_schedule_id, starts_at, ends_at, status)
          VALUES ($1, $2, $3, '2026-09-01T15:00:00.000Z', '2026-09-01T17:00:00.000Z', 'scheduled')
        `,
        [organizationId, group.groupId, group.scheduleId],
      ),
    ).rejects.toMatchObject({ code: "23505" });

    await client.query(
      `
        INSERT INTO makeup_requests (
          organization_id, source_enrollment_id, source_group_session_id, target_group_session_id, reason, status
        )
        VALUES ($1, $2, $3, $4, 'Family commitment requires an alternative class.', 'pending')
      `,
      [organizationId, enrollment.id, sourceSessionId, targetSessionId],
    );
    await expect(
      client.query(
        `
          INSERT INTO makeup_requests (
            organization_id, source_enrollment_id, source_group_session_id, target_group_session_id, reason, status
          )
          VALUES ($1, $2, $3, $4, 'Trying the same source session twice.', 'pending')
        `,
        [organizationId, enrollment.id, sourceSessionId, targetSessionId],
      ),
    ).rejects.toMatchObject({ code: "23505" });

    await client.query(
      "UPDATE makeup_requests SET status = 'rejected' WHERE organization_id = $1",
      [organizationId],
    );
    await expect(
      client.query(
        `
          INSERT INTO makeup_requests (
            organization_id, source_enrollment_id, source_group_session_id, target_group_session_id, reason, status
          )
          VALUES ($1, $2, $3, $4, 'A new request after the first one was declined.', 'pending')
        `,
        [organizationId, enrollment.id, sourceSessionId, targetSessionId],
      ),
    ).resolves.toBeDefined();
  });

  it("rejects a payment record that borrows another center's payment channel", async () => {
    const organizationA = await createOrganization("center-payment-a");
    const organizationB = await createOrganization("center-payment-b");
    const obligationA = await createPaymentObligation(organizationA, "A");
    const channelA = await one(
      "INSERT INTO payment_channels (organization_id, kind, label, account_identifier) VALUES ($1, 'instapay', 'A InstaPay', 'a.demo@instapay') RETURNING id",
      [organizationA],
    );
    const channelB = await one(
      "INSERT INTO payment_channels (organization_id, kind, label, account_identifier) VALUES ($1, 'instapay', 'B InstaPay', 'b.demo@instapay') RETURNING id",
      [organizationB],
    );

    await expect(
      client.query(
        `
          INSERT INTO payment_records (
            organization_id, obligation_id, payment_channel_id, method, status, amount_minor, transfer_reference
          )
          VALUES ($1, $2, $3, 'online_transfer', 'submitted', 40000, 'CROSS-CENTER-REFERENCE')
        `,
        [organizationA, obligationA.obligationId, channelB.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      client.query(
        `
          INSERT INTO payment_records (
            organization_id, obligation_id, payment_channel_id, method, status, amount_minor, transfer_reference
          )
          VALUES ($1, $2, $3, 'online_transfer', 'submitted', 40000, 'VALID-CENTER-REFERENCE')
        `,
        [organizationA, obligationA.obligationId, channelA.id],
      ),
    ).resolves.toBeDefined();
  });
});
