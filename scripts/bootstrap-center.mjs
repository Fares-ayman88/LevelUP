import dotenv from "dotenv";

import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const scryptAsync = promisify(scrypt);

function readOption(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function requireOption(name, maxLength) {
  const value = readOption(name);
  if (!value || value.length > maxLength) {
    throw new Error(`--${name} is required and must be at most ${maxLength} characters.`);
  }
  return value;
}

function readInput() {
  const organizationName = requireOption("organization-name", 160);
  const organizationSlug = requireOption("organization-slug", 80).toLowerCase();
  const adminEmail = requireOption("admin-email", 320).toLowerCase();
  const adminName = requireOption("admin-name", 160);
  const adminPassword = requireOption("admin-password", 256);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationSlug)) {
    throw new Error("--organization-slug must use lowercase letters, numbers, and single hyphens.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error("--admin-email must be a valid email address.");
  }
  if (adminPassword.length < 8) throw new Error("--admin-password must be at least 8 characters.");

  return { adminEmail, adminName, adminPassword, organizationName, organizationSlug };
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scryptAsync(password, salt, 64, {
    N: 16_384,
    maxmem: 32 * 1024 * 1024,
    p: 1,
    r: 8,
  });
  return ["scrypt", "16384", "8", "1", salt, Buffer.from(derivedKey).toString("base64url")].join("$");
}

async function main() {
  if (process.argv.includes("--help")) {
    console.info("Usage: npm run db:bootstrap-center -- --organization-name \"LevelUp Ismailia\" --organization-slug levelup-ismailia --admin-name \"Admin Name\" --admin-email admin@example.com --admin-password \"A long initial password\"");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required before creating a center.");

  const input = readInput();
  const adminPasswordHash = await hashPassword(input.adminPassword);
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
  await client.connect();

  try {
    const migrationTable = await client.query("SELECT to_regclass('public.schema_migrations') AS table_name");
    if (!migrationTable.rows[0]?.table_name) {
      throw new Error("Run npm run db:migrate before creating a center.");
    }

    await client.query("BEGIN");
    try {
      const createdOrganization = await client.query(
        "INSERT INTO organizations (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING RETURNING id",
        [input.organizationName, input.organizationSlug],
      );
      const organization = createdOrganization.rows[0]
        ?? (await client.query("SELECT id FROM organizations WHERE slug = $1", [input.organizationSlug])).rows[0];
      if (!organization) throw new Error("Could not load the center after creating it.");

      const existingUser = await client.query("SELECT id, password_hash, status FROM users WHERE email = $1", [input.adminEmail]);
      let user = existingUser.rows[0];
      if (user?.status === "suspended") {
        throw new Error("The requested center admin email belongs to a suspended user.");
      }
      if (!user) {
        user = (
          await client.query(
            "INSERT INTO users (email, password_hash, full_name, status) VALUES ($1, $2, $3, 'active') RETURNING id, password_hash, status",
            [input.adminEmail, adminPasswordHash, input.adminName],
          )
        ).rows[0];
      } else if (!user.password_hash) {
        await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [adminPasswordHash, user.id]);
      }
      if (!user) throw new Error("Could not create the center admin user.");

      const membership = await client.query(
        `
          INSERT INTO organization_memberships (organization_id, user_id, role, status)
          VALUES ($1, $2, 'center_admin', 'active')
          ON CONFLICT (organization_id, user_id, role) DO UPDATE SET status = 'active'
          RETURNING id
        `,
        [organization.id, user.id],
      );
      const membershipId = membership.rows[0]?.id;
      if (!membershipId) throw new Error("Could not create the center admin membership.");

      await client.query(
        `
          INSERT INTO audit_logs (organization_id, actor_membership_id, action, entity_type, entity_id, metadata)
          VALUES ($1, $2, 'organization.bootstrap_admin_created', 'organization', $1, $3::jsonb)
        `,
        [organization.id, membershipId, JSON.stringify({ source: "bootstrap-center-script" })],
      );

      await client.query("COMMIT");
      console.info(`Center ready: ${input.organizationSlug}. A center admin can now sign in with ${input.adminEmail}.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Center bootstrap failed.", error);
  process.exitCode = 1;
});
