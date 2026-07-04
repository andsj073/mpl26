import { sql } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import { activities, activityStatus, messages } from "@/lib/db/schema";
import { FAMILY } from "@/lib/family";
import { kmFromHome } from "@/lib/geo";

// Seedningen gjordes 4 juli 2026 med addedBy "Andreas" — bara aktiviteter
// tillagda därefter räknas som personliga bidrag.
const SEED_CUTOFF = new Date("2026-07-05T00:00:00Z");

export type Badge = { emoji: string; label: string };

export type PersonScore = {
  name: string;
  color: string;
  points: number;
  badges: Badge[];
  added: number;
  planning: number;
  done: number;
};

export async function computeScoreboard(
  db: ReturnType<typeof getDb>
): Promise<PersonScore[]> {
  const [acts, statuses, msgCounts] = await Promise.all([
    db.select().from(activities),
    db.select().from(activityStatus),
    db
      .select({
        owner: messages.owner,
        count: sql<number>`count(*)::int`,
      })
      .from(messages)
      .where(sql`${messages.role} = 'user'`)
      .groupBy(messages.owner),
  ]);

  const actById = new Map(acts.map((a) => [a.id, a]));

  return FAMILY.map((p) => {
    const added = acts.filter(
      (a) => a.addedBy === p.name && a.createdAt > SEED_CUTOFF
    ).length;
    const mine = statuses.filter((s) => s.person === p.name);
    const planning = mine.filter((s) => s.status === 1).length;
    const doneRows = mine.filter((s) => s.status === 2);
    const done = doneRows.length;
    const msgs = msgCounts.find((m) => m.owner === p.name)?.count ?? 0;

    const farDone = doneRows.some((s) => {
      const a = actById.get(s.activityId);
      return a?.lat != null && a.lng != null && kmFromHome(a.lat, a.lng) > 50;
    });
    const pearlDone = doneRows.some(
      (s) => actById.get(s.activityId)?.featured
    );

    const badges: Badge[] = [];
    if (added >= 1) badges.push({ emoji: "✍️", label: "Bidragsgivare" });
    if (added >= 3) badges.push({ emoji: "🧭", label: "Upptäckare" });
    if (planning >= 3) badges.push({ emoji: "📅", label: "Planerare" });
    if (done >= 1) badges.push({ emoji: "✅", label: "Igångsättare" });
    if (done >= 5) badges.push({ emoji: "🏆", label: "Doer" });
    if (farDone) badges.push({ emoji: "🚗", label: "Långfärdare" });
    if (pearlDone) badges.push({ emoji: "⭐", label: "Pärljägare" });
    if (msgs >= 10) badges.push({ emoji: "💬", label: "Chattstjärna" });

    const points = done * 3 + planning + added * 2 + (msgs >= 10 ? 2 : 0);

    return { name: p.name, color: p.color, points, badges, added, planning, done };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "sv"));
}
