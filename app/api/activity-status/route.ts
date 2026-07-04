import { and, eq } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { activityStatus } from "@/lib/db/schema";
import { FAMILY_NAMES } from "@/lib/family";

export async function POST(req: Request) {
  if (!hasDb()) {
    return Response.json({ error: "Databas saknas." }, { status: 503 });
  }
  const { activityId, person, status } = await req.json();

  if (!FAMILY_NAMES.includes(person)) {
    return Response.json({ error: "Okänd person." }, { status: 400 });
  }
  if (![0, 1, 2].includes(status)) {
    return Response.json({ error: "Status måste vara 0, 1 eller 2." }, { status: 400 });
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
    await db
      .insert(activityStatus)
      .values({ activityId, person, status })
      .onConflictDoUpdate({
        target: [activityStatus.activityId, activityStatus.person],
        set: { status },
      });
  }
  return Response.json({ ok: true });
}
