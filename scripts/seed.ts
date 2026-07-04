import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { and, eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import {
  activities,
  activityStatus,
  dayActivities,
  days,
} from "../lib/db/schema";
import { SEED_ACTIVITIES } from "../lib/seed-data";
import { getTripDays, TRIP_START } from "../lib/trip";

/** Smoke test för dagbunden status: "Ankomst" på 10 juli med alla som
 *  landar den dagen inplanerade. Idempotent. */
async function ensureArrival(db: ReturnType<typeof getDb>) {
  const title = "Ankomst till Montpellier";
  let [arrival] = await db
    .select()
    .from(activities)
    .where(eq(activities.title, title));
  if (!arrival) {
    [arrival] = await db
      .insert(activities)
      .values({
        title,
        description:
          "Flyg landar 14.00, hämtning av nycklar och installation på 12 Rue Nicolas Copernic. Middag hemma, planera veckan, lugn start.",
        category: "annat",
        tags: ["resa"],
        address: "12 Rue Nicolas Copernic, 34000 Montpellier",
        lat: 43.5951,
        lng: 3.8991,
        addedBy: "Andreas",
      })
      .returning();
  }
  await db
    .insert(dayActivities)
    .values({ dayDate: TRIP_START, activityId: arrival.id })
    .onConflictDoNothing();
  // Alla utom Viktor landar den 10:e
  const arrivers = [
    "Andreas",
    "Elin",
    "William",
    "Anna",
    "Leja",
    "Leo",
    "Elton",
  ];
  for (const person of arrivers) {
    const [existing] = await db
      .select()
      .from(activityStatus)
      .where(
        and(
          eq(activityStatus.activityId, arrival.id),
          eq(activityStatus.person, person)
        )
      );
    if (!existing) {
      await db
        .insert(activityStatus)
        .values({
          activityId: arrival.id,
          person,
          status: 1,
          dayDate: TRIP_START,
        })
        .onConflictDoNothing();
    }
  }
  console.log("✓ Ankomst-aktiviteten säkrad på 10 juli");
}

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
    await ensureArrival(db);
    return;
  }
  await ensureArrival(db);

  // Synk-pass: befintliga rader som matchar seed på titel får
  // koordinater/adress ifyllda om de saknas (körs vid varje build).
  let synced = 0;
  for (const seed of SEED_ACTIVITIES) {
    const row = existing.find((a) => a.title === seed.title);
    if (!row) continue;
    const patch: Record<string, unknown> = {};
    if (row.lat == null && seed.lat != null) {
      patch.lat = seed.lat;
      patch.lng = seed.lng;
      patch.address = seed.address;
    }
    if (seed.featured && !row.featured) patch.featured = true;
    if (Object.keys(patch).length) {
      await db.update(activities).set(patch).where(eq(activities.id, row.id));
      synced++;
    }
  }
  console.log(
    `Aktiviteter finns redan (${existing.length} st) — seedar inte igen.` +
      (synced ? ` Synkade koordinater på ${synced} rader.` : "")
  );
}

main().then(() => process.exit(0));
