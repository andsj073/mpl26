import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { eq } from "drizzle-orm";
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

  const existing = await db.select().from(activities);
  if (existing.length === 0) {
    await db.insert(activities).values(SEED_ACTIVITIES);
    console.log(`✓ ${SEED_ACTIVITIES.length} aktiviteter seedade`);
    return;
  }

  // Synk-pass: befintliga rader som matchar seed på titel får
  // koordinater/adress ifyllda om de saknas (körs vid varje build).
  let synced = 0;
  for (const seed of SEED_ACTIVITIES) {
    const row = existing.find((a) => a.title === seed.title);
    if (!row) continue;
    if (row.lat == null && seed.lat != null) {
      await db
        .update(activities)
        .set({ lat: seed.lat, lng: seed.lng, address: seed.address })
        .where(eq(activities.id, row.id));
      synced++;
    }
  }
  console.log(
    `Aktiviteter finns redan (${existing.length} st) — seedar inte igen.` +
      (synced ? ` Synkade koordinater på ${synced} rader.` : "")
  );
}

main().then(() => process.exit(0));
