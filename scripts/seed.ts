import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { getDb } from "../lib/db";
import { activities, days } from "../lib/db/schema";
import { SEED_ACTIVITIES } from "../lib/seed-data";
import { getTripDays } from "../lib/trip";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL saknas — kör `vercel env pull .env.local` först.");
    process.exit(1);
  }
  const db = getDb();

  // Dagarna: idempotent, hoppar över befintliga
  const tripDays = getTripDays().map((d) => ({ date: d.date }));
  await db.insert(days).values(tripDays).onConflictDoNothing();
  console.log(`✓ ${tripDays.length} dagar (befintliga orörda)`);

  const existing = await db.select({ id: activities.id }).from(activities);
  if (existing.length > 0) {
    console.log(
      `Aktiviteter finns redan (${existing.length} st) — seedar inte igen.`
    );
    return;
  }
  await db.insert(activities).values(SEED_ACTIVITIES);
  console.log(`✓ ${SEED_ACTIVITIES.length} aktiviteter seedade`);
}

main().then(() => process.exit(0));
