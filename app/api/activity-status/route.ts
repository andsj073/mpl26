import { and, eq } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { activityStatus, dayActivities, days } from "@/lib/db/schema";
import { FAMILY_NAMES } from "@/lib/family";
import { TRIP_END, TRIP_START } from "@/lib/trip";

export async function POST(req: Request) {
  if (!hasDb()) {
    return Response.json({ error: "Databas saknas." }, { status: 503 });
  }
  const { activityId, person, status, dayDate } = await req.json();

  if (!FAMILY_NAMES.includes(person)) {
    return Response.json({ error: "Okänd person." }, { status: 400 });
  }
  if (![0, 1, 2].includes(status)) {
    return Response.json({ error: "Status måste vara 0, 1 eller 2." }, { status: 400 });
  }
  if (status > 0) {
    if (
      typeof dayDate !== "string" ||
      dayDate < TRIP_START ||
      dayDate > TRIP_END
    ) {
      return Response.json(
        { error: "Välj en dag mellan 10 och 24 juli." },
        { status: 400 }
      );
    }
  }

  const db = getDb();
  if (status === 0) {
    await db
      .delete(activityStatus)
      .where(
        and(
          eq(activityStatus.activityId, activityId),
          eq(activityStatus.person, person)
        )
      );
  } else {
    // Se till att dagen finns och att aktiviteten ligger på dagen
    await db.insert(days).values({ date: dayDate }).onConflictDoNothing();
    await db
      .insert(dayActivities)
      .values({ dayDate, activityId })
      .onConflictDoNothing();
    await db
      .insert(activityStatus)
      .values({ activityId, person, status, dayDate })
      .onConflictDoUpdate({
        target: [activityStatus.activityId, activityStatus.person],
        set: { status, dayDate },
      });
  }
  return Response.json({ ok: true });
}
