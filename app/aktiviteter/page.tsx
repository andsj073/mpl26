import { asc } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import {
  activities,
  activityStatus,
  type Activity,
} from "@/lib/db/schema";
import { ActivityList } from "@/components/activity-list";

export const dynamic = "force-dynamic";

export default async function AktiviteterPage() {
  let items: Activity[] = [];
  let statuses: (typeof activityStatus.$inferSelect)[] = [];
  if (hasDb()) {
    const db = getDb();
    [items, statuses] = await Promise.all([
      db.select().from(activities).orderBy(asc(activities.title)),
      db.select().from(activityStatus),
    ]);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="kicker">Idébanken · {items.length} förslag</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Aktiviteter
        </h1>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="font-medium">Idébanken är tom</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Koppla in databasen och kör <code>npm run db:seed</code> så läses
            researchen från PPT-filerna in — 44 aktiviteter att börja med.
          </p>
        </div>
      ) : (
        <ActivityList items={items} initialStatuses={statuses} />
      )}
    </div>
  );
}
