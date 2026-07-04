import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, hasDb } from "@/lib/db";
import { activities, dayActivities, days } from "@/lib/db/schema";
import { computeScoreboard, type PersonScore } from "@/lib/badges";
import { CATEGORIES, pillStyle } from "@/lib/categories";
import { getTripDays, todayInFrance, tripStatus } from "@/lib/trip";
import { getForecast, weatherIcon } from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = todayInFrance();
  const tomorrow = new Date(Date.parse(today) + 86_400_000)
    .toISOString()
    .slice(0, 10);
  const status = tripStatus(today);
  const tripDays = getTripDays();
  const forecast = await getForecast();

  let scoreboard: PersonScore[] = [];
  let planByDay = new Map<
    string,
    { title: string; color: string }[]
  >();
  const notesByDay = new Map<string, string>();
  let activityCount = 0;

  if (hasDb()) {
    const db = getDb();
    const [board, planRows, dayRows, actCount] = await Promise.all([
      computeScoreboard(db),
      db
        .select({ dayDate: dayActivities.dayDate, activity: activities })
        .from(dayActivities)
        .innerJoin(activities, eq(dayActivities.activityId, activities.id)),
      db.select().from(days),
      db.select({ id: activities.id }).from(activities),
    ]);
    scoreboard = board;
    planByDay = planRows.reduce((m, r) => {
      const list = m.get(r.dayDate) ?? [];
      list.push({
        title: r.activity.title,
        color: CATEGORIES[r.activity.category].color,
      });
      m.set(r.dayDate, list);
      return m;
    }, planByDay);
    for (const d of dayRows) if (d.notes) notesByDay.set(d.date, d.notes);
    activityCount = actCount.length;
  }

  const highlightDays = [today, tomorrow]
    .map((date) => tripDays.find((d) => d.date === date))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Familjens resa · 10–24 juli 2026</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Montpellier
        </h1>
      </header>

      {status.phase === "innan" && (
        <div className="goldnote px-4 py-3 text-sm font-bold uppercase tracking-widest">
          {status.daysLeft} dagar kvar till avresa
        </div>
      )}
      {status.phase === "under" && (
        <div className="goldnote px-4 py-3 text-sm font-bold uppercase tracking-widest">
          Dag {status.dayNumber} av 15 — ni är i Montpellier
        </div>
      )}

      {highlightDays.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="kicker">Idag & imorgon</h2>
          {highlightDays.map((day) => {
            const w = forecast.get(day!.date);
            const planned = planByDay.get(day!.date) ?? [];
            const notes = notesByDay.get(day!.date);
            return (
              <Link
                key={day!.date}
                href="/dagar"
                className="block rounded-xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="daylabel">
                    {day!.weekday} {day!.label}
                  </span>
                  {w && (
                    <span className="text-sm">
                      {weatherIcon(w.weathercode)}{" "}
                      <span className="font-semibold">{w.tempMax}°</span>
                    </span>
                  )}
                </div>
                {day!.special && (
                  <p className="goldnote mt-2 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider">
                    {day!.special}
                  </p>
                )}
                {planned.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {planned.map((p) => (
                      <li
                        key={p.title}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  !notes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Inget planerat — fråga chatten om förslag!
                    </p>
                  )
                )}
                {notes && (
                  <p className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    {notes}
                  </p>
                )}
              </Link>
            );
          })}
        </section>
      )}

      {scoreboard.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="kicker">Topplista & badges</h2>
          <ol className="space-y-1.5">
            {scoreboard.map((p, i) => (
              <li
                key={p.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
              >
                <span className="w-5 text-center text-sm font-extrabold text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                  style={pillStyle(p.color)}
                >
                  {p.name}
                </span>
                <span className="flex-1 truncate text-sm" title={p.badges.map((b) => b.label).join(", ")}>
                  {p.badges.map((b) => b.emoji).join(" ") || (
                    <span className="text-xs text-muted-foreground">
                      inga badges än
                    </span>
                  )}
                </span>
                <span className="text-sm font-extrabold text-primary">
                  {p.points} p
                </span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Poäng: gjort ×3 · tillagd aktivitet ×2 · planerar ×1 · flitig
            chattare +2. Badges: ✍️ bidragit · 🧭 3+ tillagda · 📅 3+
            planerade · ✅ första gjorda · 🏆 5+ gjorda · 🚗 gjort &gt;50 km
            bort · ⭐ gjort en pärla · 💬 10+ meddelanden.
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2.5">
        <Link
          href="/aktiviteter"
          className="rounded-xl border border-border bg-card p-3 shadow-sm"
        >
          <p className="text-2xl font-extrabold text-primary">
            {activityCount}
          </p>
          <p className="text-xs text-muted-foreground">
            aktiviteter i idébanken
          </p>
        </Link>
        <Link
          href="/chatt"
          className="rounded-xl border border-border bg-card p-3 shadow-sm"
        >
          <p className="text-2xl font-extrabold text-primary">AI</p>
          <p className="text-xs text-muted-foreground">
            fråga assistenten — den kan planera åt dig
          </p>
        </Link>
      </section>
    </div>
  );
}
