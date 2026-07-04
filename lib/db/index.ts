import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

// postgres.js-klienten cachas globalt så att hot reload i dev inte
// läcker anslutningar.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

/**
 * Neon (HTTP) i produktion, vanlig Postgres (t.ex. lokal Docker) i dev.
 * Query-API:t är identiskt; typen normaliseras till Neon-varianten.
 */
export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL saknas. Provisionera Neon via Vercel Marketplace, eller starta lokal Postgres (se ARCHITECTURE.md)."
    );
  }
  if (url.includes("neon.tech")) {
    return drizzleNeon(neon(url), { schema });
  }
  const client = (globalForDb.pgClient ??= postgres(url, { max: 5 }));
  return drizzlePg(client, { schema }) as unknown as Db;
}

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}
