import dotenv from "dotenv";

import { runMigrations } from "./migrate.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_TEST or DATABASE_URL is required before running test migrations.");
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");

if (!databaseName.endsWith("_test")) {
  throw new Error("Test migrations require a database name ending in _test.");
}

runMigrations(databaseUrl).catch((error) => {
  console.error("Test migration failed.", error);
  process.exitCode = 1;
});
