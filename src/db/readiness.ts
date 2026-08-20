import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "./client";

/** Keeps liveness independent from the database while exposing a real readiness probe. */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    await getDatabase().execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
