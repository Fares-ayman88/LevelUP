import dotenv from "dotenv";

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = resolve(currentDirectory, "..", "db", "migrations");

function checksum(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required before checking database readiness.");

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => /^\d{4}_.+\.sql$/.test(fileName))
    .sort();
  const expectedChecksums = new Map(
    await Promise.all(
      migrationFiles.map(async (fileName) => [
        fileName,
        checksum(await readFile(resolve(migrationsDirectory, fileName), "utf8")),
      ]),
    ),
  );

  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
  await client.connect();

  try {
    await client.query("SELECT 1");
    const migrationTable = await client.query("SELECT to_regclass('public.schema_migrations') AS table_name");
    if (!migrationTable.rows[0]?.table_name) {
      throw new Error("schema_migrations does not exist. Run npm run db:migrate first.");
    }

    const appliedResult = await client.query("SELECT id, checksum FROM schema_migrations ORDER BY id");
    const appliedChecksums = new Map(appliedResult.rows.map((row) => [row.id, row.checksum]));
    const missing = migrationFiles.filter((fileName) => !appliedChecksums.has(fileName));
    const changed = migrationFiles.filter(
      (fileName) => appliedChecksums.get(fileName) && appliedChecksums.get(fileName) !== expectedChecksums.get(fileName),
    );
    const unknown = [...appliedChecksums.keys()].filter((fileName) => !expectedChecksums.has(fileName));

    if (missing.length || changed.length || unknown.length) {
      const issues = [
        missing.length ? `missing: ${missing.join(", ")}` : null,
        changed.length ? `checksum mismatch: ${changed.join(", ")}` : null,
        unknown.length ? `unknown applied migrations: ${unknown.join(", ")}` : null,
      ].filter(Boolean);
      throw new Error(`Database migration state is not deployable (${issues.join("; ")}).`);
    }

    console.info(`Database ready. Connectivity verified and ${migrationFiles.length} migrations are current.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Database readiness check failed.", error);
  process.exitCode = 1;
});
