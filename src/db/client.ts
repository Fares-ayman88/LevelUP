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
    const pool = new Pool({
      connectionString: environment.DATABASE_URL,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      max: environment.DATABASE_POOL_MAX,
    });

    globalForDatabase.pool = pool;
    globalForDatabase.database = drizzle(pool, { schema });
  }

  return globalForDatabase.database;
}
