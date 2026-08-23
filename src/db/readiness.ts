import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "./client";

function summarizeReadinessFailure(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") return { kind: "unknown" };

  const failure = error as {
    code?: unknown;
    issues?: unknown;
    name?: unknown;
  };
  const configurationFields = Array.isArray(failure.issues)
    ? failure.issues
        .flatMap((issue) => {
          if (!issue || typeof issue !== "object") return [];
          const path = (issue as { path?: unknown }).path;
          return Array.isArray(path) && path.length ? [path.map(String).join(".")] : [];
        })
        .slice(0, 10)
    : [];

  return {
    kind: typeof failure.name === "string" ? failure.name : "Error",
    ...(typeof failure.code === "string" ? { code: failure.code } : {}),
    ...(configurationFields.length ? { configurationFields } : {}),
  };
}

/** Keeps liveness independent from the database while exposing a real readiness probe. */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    await getDatabase().execute(sql`select 1`);
    return true;
  } catch (error) {
    console.error("Database readiness probe failed.", summarizeReadinessFailure(error));
    return false;
  }
}
