import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  activities,
  dayActivities,
  days,
  messages,
  type Activity,
  type Message,
} from "@/lib/db/schema";
import { FAMILY, HOME_ADDRESS } from "@/lib/family";
import { getTripDays, todayInFrance, tripStatus } from "@/lib/trip";
import { getForecast, weatherIcon, type DailyWeather } from "@/lib/weather";
import { CATEGORIES } from "@/lib/categories";

export type ChatContext = {
  system: string;
  history: Message[];
};

function fmtWeather(w: DailyWeather | undefined): string {
  if (!w) return "ingen prognos ännu";
  return `${weatherIcon(w.weathercode)} ${w.tempMax}°/${w.tempMin}°`;
}

function fmtActivity(a: Activity): string {
  const parts = [
    `- ${a.title} [${CATEGORIES[a.category].label}] (id: ${a.id})`,
  ];
  if (a.description) parts.push(`  ${a.description}`);
  const meta: string[] = [];
  if (a.budgetMin != null || a.budgetMax != null)
    meta.push(`budget ${a.budgetMin ?? "?"}–${a.budgetMax ?? "?"} €/person`);
  if (a.durationMin != null) meta.push(`ca ${Math.round(a.durationMin / 60)} h`);
  if (a.address) meta.push(a.address);
  if (a.tags.length) meta.push(`taggar: ${a.tags.join(", ")}`);
  if (meta.length) parts.push(`  (${meta.join(" · ")})`);
  return parts.join("\n");
}

/** Bygger systemprompt + senaste historik enligt kraven i CLAUDE.md. */
export async function buildChatContext(
  senderName: string
): Promise<ChatContext> {
  const db = getDb();
  const today = todayInFrance();
  const status = tripStatus(today);
  const tripDays = getTripDays();

  const [forecast, allActivities, planRows, dayRows, history] =
    await Promise.all([
      getForecast(),
      db.select().from(activities).orderBy(asc(activities.title)),
      db
        .select({
          dayDate: dayActivities.dayDate,
          sortOrder: dayActivities.sortOrder,
          activity: activities,
        })
        .from(dayActivities)
        .innerJoin(activities, eq(dayActivities.activityId, activities.id)),
      db.select().from(days),
      db
        .select()
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(10),
    ]);

  const tomorrow = new Date(Date.parse(today) + 86_400_000)
    .toISOString()
    .slice(0, 10);

  const planByDay = new Map<string, Activity[]>();
  for (const row of planRows) {
    const list = planByDay.get(row.dayDate) ?? [];
    list.push(row.activity);
    planByDay.set(row.dayDate, list);
  }
  const dayMeta = new Map(dayRows.map((d) => [d.date, d]));

  const whereAreWe =
    status.phase === "innan"
      ? `Resan har inte börjat än — ${status.daysLeft} dagar kvar till avresa. Familjen är hemma i Sverige.`
      : status.phase === "efter"
        ? "Resan är över, familjen är hemma igen."
        : `Dag ${status.dayNumber} av 15 — ni är i Montpellier.`;

  const dayLines = tripDays
    .map((d) => {
      const planned = planByDay.get(d.date) ?? [];
      const meta = dayMeta.get(d.date);
      const parts = [
        `${d.date} (${d.weekday})${d.special ? ` — ${d.special}` : ""}: väder ${fmtWeather(forecast.get(d.date))}`,
      ];
      if (planned.length)
        parts.push(`  planerat: ${planned.map((a) => a.title).join("; ")}`);
      if (meta?.participants.length)
        parts.push(`  med: ${meta.participants.join(", ")}`);
      if (meta?.notes) parts.push(`  anteckningar: ${meta.notes}`);
      return parts.join("\n");
    })
    .join("\n");

  const system = `Du är familjens reseassistent i appen "Montpellier 2026". Familjen bor på ${HOME_ADDRESS} under resan 10–24 juli 2026. Egen bil med 5 platser finns på plats — fler personer än platser, alltid ett pussel. Obs: alla är inte där hela perioden — se ankomst-/hemresedatum i profilerna nedan.

DAGENS DATUM: ${today}. ${whereAreWe}
VÄDER IDAG: ${fmtWeather(forecast.get(today))}. IMORGON: ${fmtWeather(forecast.get(tomorrow))}.

DEN SOM SKRIVER JUST NU ÄR: ${senderName}. Chatten är gemensam för hela familjen — meddelanden från andra är märkta med avsändarnamn.

FAMILJEN:
${FAMILY.map((p) => `- ${p.name}${p.age != null ? `, ${p.age} år` : ""}: ${p.profile}`).join("\n")}

RESANS DAGAR (med väder, planering, deltagare):
${dayLines}

ALLA AKTIVITETER I IDÉBANKEN (referensmaterial):
${allActivities.map(fmtActivity).join("\n")}

DINA VERKTYG: du kan lägga till/uppdatera aktiviteter i idébanken, planera in aktiviteter på dagar, ta bort planering och uppdatera en dags deltagare/anteckningar. Använd dem när familjen ber om det eller när det uppenbart hjälper — och berätta alltid kort vad du gjort. Gissa inte id:n: använd id från listan ovan. Ändra inget destruktivt utan att det är tydligt önskat.

TON: svensk, varm, konkret, kortfattad — mobilskärm. Ge hellre ett tydligt förslag än fem vaga. Tänk på: Elin gillar kultur/vin/mat men inte strapatser; Leo är 17 till 17 juli (alkohol 18+ i Frankrike); Elton är 9; Andreas tränar inför halvmaraton; bilen tar bara 5.`;

  return { system, history: history.reverse() };
}
