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

databaseDescribe("tenant membership integrity guards", () => {
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

  async function createMembership(
    organizationId: string,
    role: "guardian" | "teacher",
    suffix: string,
  ): Promise<string> {
    const user = await one("INSERT INTO users (full_name) VALUES ($1) RETURNING id", [`${role} ${suffix}`]);
    const membership = await one(
      "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES ($1, $2, $3) RETURNING id",
      [organizationId, user.id, role],
    );
    return membership.id;
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

  it("rejects teacher and guardian records that borrow another center's membership", async () => {
    const organizationA = await createOrganization("center-a");
    const organizationB = await createOrganization("center-b");
    const teacherMembershipB = await createMembership(organizationB, "teacher", "B");
    const guardianMembershipA = await createMembership(organizationA, "guardian", "A");
    const student = await one(
      `
        INSERT INTO student_profiles (organization_id, student_code, full_name, grade_level)
        VALUES ($1, 'ST-A', 'Student A', '3rd Secondary')
        RETURNING id
      `,
      [organizationA],
    );

    await expect(
      client.query(
        `
          INSERT INTO teacher_profiles (organization_id, membership_id, display_name)
          VALUES ($1, $2, 'Teacher from another center')
        `,
        [organizationA, teacherMembershipB],
      ),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      client.query(
        `
          INSERT INTO guardian_student_links (organization_id, guardian_membership_id, student_profile_id)
          VALUES ($1, $2, $3)
        `,
        [organizationB, guardianMembershipA, student.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("requires the declared teacher and guardian roles", async () => {
    const organizationId = await createOrganization("center-main");
    const guardianMembership = await createMembership(organizationId, "guardian", "Main");
    const teacherMembership = await createMembership(organizationId, "teacher", "Main");
    const student = await one(
      `
        INSERT INTO student_profiles (organization_id, student_code, full_name, grade_level)
        VALUES ($1, 'ST-MAIN', 'Student Main', '3rd Secondary')
        RETURNING id
      `,
      [organizationId],
    );

    await expect(
      client.query(
        "INSERT INTO teacher_profiles (organization_id, membership_id, display_name) VALUES ($1, $2, 'Wrong role')",
        [organizationId, guardianMembership],
      ),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      client.query(
        "INSERT INTO guardian_student_links (organization_id, guardian_membership_id, student_profile_id) VALUES ($1, $2, $3)",
        [organizationId, teacherMembership, student.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      client.query(
        "INSERT INTO teacher_profiles (organization_id, membership_id, display_name) VALUES ($1, $2, 'Correct role')",
        [organizationId, teacherMembership],
      ),
    ).resolves.toBeDefined();

    await expect(
      client.query(
        "INSERT INTO guardian_student_links (organization_id, guardian_membership_id, student_profile_id) VALUES ($1, $2, $3)",
        [organizationId, guardianMembership, student.id],
      ),
    ).resolves.toBeDefined();
  });
});
