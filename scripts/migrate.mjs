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

export async function runMigrations(databaseUrl = process.env.DATABASE_URL) {

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before running database migrations.");
  }

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => /^\d{4}_.+\.sql$/.test(fileName))
    .sort();

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id varchar(255) PRIMARY KEY,
        checksum varchar(64) NOT NULL,
        executed_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const appliedResult = await client.query("SELECT id, checksum FROM schema_migrations");
    const applied = new Map(appliedResult.rows.map((row) => [row.id, row.checksum]));

    for (const fileName of migrationFiles) {
      const contents = await readFile(resolve(migrationsDirectory, fileName), "utf8");
      const fileChecksum = checksum(contents);
      const existingChecksum = applied.get(fileName);

      if (existingChecksum) {
        if (existingChecksum !== fileChecksum) {
          throw new Error(`Migration ${fileName} was changed after it had already run.`);
        }

        continue;
      }

      await client.query("BEGIN");

      try {
        await client.query(contents);
        await client.query("INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)", [fileName, fileChecksum]);
        await client.query("COMMIT");
        console.info(`Applied ${fileName}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  runMigrations().catch((error) => {
    console.error("Migration failed.", error);
    process.exitCode = 1;
  });
}
