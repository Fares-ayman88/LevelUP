import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnvironment } from "@/lib/env/server";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

type DatabaseGlobals = {
  database?: Database;
  pool?: Pool;
};

const globalForDatabase = globalThis as typeof globalThis & DatabaseGlobals;

/** Creates one reusable server-side pool; browser bundles can never import it. */
export function getDatabase(): Database {
  if (!globalForDatabase.database) {
    const environment = getServerEnvironment();
    const isRemote =
      environment.DATABASE_URL.includes("supabase.com")
      || environment.DATABASE_URL.includes("neon.tech")
      || environment.DATABASE_URL.includes("sslmode=");

    const pool = new Pool({
      connectionString: environment.DATABASE_URL,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      max: environment.DATABASE_POOL_MAX,
      ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    globalForDatabase.pool = pool;
    globalForDatabase.database = drizzle(pool, { schema });
  }

  return globalForDatabase.database;
}
