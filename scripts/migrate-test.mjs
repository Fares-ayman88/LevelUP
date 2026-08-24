import dotenv from "dotenv";

import { runMigrations } from "./migrate.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL_TEST;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_TEST is required before running test migrations. Never fall back to DATABASE_URL.");
}

function databaseTarget(connectionString) {
  const url = new URL(connectionString);
  return `${url.protocol}//${url.hostname}:${url.port || "5432"}${url.pathname}`;
}

if (process.env.DATABASE_URL && databaseTarget(databaseUrl) === databaseTarget(process.env.DATABASE_URL)) {
  throw new Error("DATABASE_URL_TEST must point to a separate test database or Supabase project, never the production database.");
}

runMigrations(databaseUrl).catch((error) => {
  console.error("Test migration failed.", error);
  process.exitCode = 1;
});
