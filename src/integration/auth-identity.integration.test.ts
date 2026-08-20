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

type UserRow = { id: string };
type OrganizationRow = { id: string };

databaseDescribe("auth identity constraints", () => {
  let client: Client;

  async function createUser(email: string): Promise<UserRow> {
    const result = await client.query<UserRow>(
      "INSERT INTO users (email, full_name) VALUES ($1, $2) RETURNING id",
      [email, email],
    );
    const user = result.rows[0];
    if (!user) throw new Error("Expected a user from the integration test setup.");
    return user;
  }

  async function createOrganization(slug: string): Promise<OrganizationRow> {
    const result = await client.query<OrganizationRow>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [slug, slug],
    );
    const organization = result.rows[0];
    if (!organization) throw new Error("Expected an organization from the integration test setup.");
    return organization;
  }

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  beforeEach(async () => {
    await client.query("TRUNCATE TABLE users CASCADE");
  });

  afterAll(async () => {
    await client.end();
  });

  it("requires normalized, unique account emails", async () => {
    await createUser("student@example.com");

    await expect(
      client.query("INSERT INTO users (email, full_name) VALUES ('Student@Example.com', 'Mixed case')"),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query("INSERT INTO users (email, full_name) VALUES ('student@example.com', 'Duplicate')"),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("binds one Google subject to one LevelUp account", async () => {
    const firstUser = await createUser("first@example.com");
    const secondUser = await createUser("second@example.com");

    await client.query(
      "INSERT INTO oauth_accounts (user_id, provider, provider_account_id, email) VALUES ($1, 'google', 'google-subject-1', 'first@example.com')",
      [firstUser.id],
    );

    await expect(
      client.query(
        "INSERT INTO oauth_accounts (user_id, provider, provider_account_id, email) VALUES ($1, 'google', 'google-subject-1', 'second@example.com')",
        [secondUser.id],
      ),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      client.query(
        "INSERT INTO oauth_accounts (user_id, provider, provider_account_id, email) VALUES ($1, 'google', 'google-subject-2', 'first@example.com')",
        [firstUser.id],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("keeps center registration codes tenant-scoped and bounded", async () => {
    const firstOrganization = await createOrganization(`registration-first-${Date.now()}`);
    const secondOrganization = await createOrganization(`registration-second-${Date.now()}`);
    const admin = await createUser(`registration-admin-${Date.now()}@example.com`);
    const membership = await client.query<{ id: string }>(
      "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES ($1, $2, 'center_admin') RETURNING id",
      [firstOrganization.id, admin.id],
    );
    const membershipId = membership.rows[0]?.id;
    if (!membershipId) throw new Error("Expected a center-admin membership from the integration test setup.");

    const code = await client.query<{ id: string }>(
      `
        INSERT INTO organization_registration_codes (
          organization_id, code_hash, role, max_uses, created_by_membership_id
        )
        VALUES ($1, $2, 'student', 1, $3)
        RETURNING id
      `,
      [firstOrganization.id, `registration-code-${Date.now()}`, membershipId],
    );
    const codeId = code.rows[0]?.id;
    if (!codeId) throw new Error("Expected a registration code from the integration test setup.");

    await client.query("UPDATE organization_registration_codes SET used_count = 1 WHERE id = $1", [codeId]);
    await expect(
      client.query("UPDATE organization_registration_codes SET used_count = 2 WHERE id = $1", [codeId]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query(
        `
          INSERT INTO organization_registration_codes (
            organization_id, code_hash, role, max_uses, created_by_membership_id
          )
          VALUES ($1, $2, 'guardian', 1, $3)
        `,
        [secondOrganization.id, `cross-center-code-${Date.now()}`, membershipId],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
