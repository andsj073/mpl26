import { eq } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import {
  activities,
  dayActivities,
  days,
  type Activity,
  type Day,
} from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/categories";
import { getTripDays, todayInFrance, tripStatus } from "@/lib/trip";
import { getForecast, weatherIcon, type DailyWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function DagarPage() {
  const tripDays = getTripDays();
  const status = tripStatus();
  const today = todayInFrance();

  const planByDay = new Map<string, Activity[]>();
  const dayMeta = new Map<string, Day>();
  let forecast = new Map<string, DailyWeather>();

  if (hasDb()) {
    const db = getDb();
    const [f, planRows, dayRows] = await Promise.all([
      getForecast(),
      db
        .select({ dayDate: dayActivities.dayDate, activity: activities })
        .from(dayActivities)
        .innerJoin(activities, eq(dayActivities.activityId, activities.id)),
      db.select().from(days),
    ]);
    forecast = f;
    for (const row of planRows) {
      const list = planByDay.get(row.dayDate) ?? [];
      list.push(row.activity);
      planByDay.set(row.dayDate, list);
    }
    for (const d of dayRows) dayMeta.set(d.date, d);
  } else {
    forecast = await getForecast();
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="kicker">10–24 juli 2026 · hela familjen</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Montpellier
        </h1>
      </header>

      {status.phase === "innan" && (
        <div className="goldnote px-4 py-3 text-sm font-bold uppercase tracking-widest">
          {status.daysLeft} dagar kvar till avresa
        </div>
      )}

      <ol className="space-y-3">
        {tripDays.map((day) => {
          const w = forecast.get(day.date);
          const isToday = day.date === today;
          const planned = planByDay.get(day.date) ?? [];
          const meta = dayMeta.get(day.date);
          return (
            <li
              key={day.date}
              className={
                "rounded-xl border bg-card p-3 shadow-sm " +
                (isToday ? "border-primary" : "border-border")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <div className="daylabel">
                  {day.weekday} {day.label}
                </div>
                {w ? (
                  <div className="shrink-0 text-right text-sm">
                    <span className="mr-1">{weatherIcon(w.weathercode)}</span>
                    <span className="font-semibold">{w.tempMax}°</span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {w.tempMin}°
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    väder saknas än
                  </span>
                )}
              </div>

              {day.special && (
                <p className="goldnote mt-2 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider">
                  {day.special}
                </p>
              )}

              {planned.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {planned.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: CATEGORIES[a.category].color,
                        }}
                      />
                      {a.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Inget planerat än — dag {day.dayNumber} av 15
                  {isToday && " · idag"}
                </p>
              )}

              {meta && meta.participants.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1">
                  {meta.participants.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"
                    >
                      {p}
                    </span>
                  ))}
                </p>
              )}
              {meta?.notes && (
                <p className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  {meta.notes}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
