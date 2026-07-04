export const TRIP_START = "2026-07-10";
export const TRIP_END = "2026-07-24";

export type TripDay = {
  date: string; // YYYY-MM-DD
  dayNumber: number; // 1–15
  weekday: string; // "fredag"
  label: string; // "10 juli"
  special?: string;
};

const SPECIALS: Record<string, string> = {
  "2026-07-10": "Ankomst",
  "2026-07-12": "Elin fyller 50 🎉",
  "2026-07-14": "Frankrikes nationaldag — fyrverkerier",
  "2026-07-15": "Viktor landar 14.00 ✈️",
  "2026-07-17": "Leo fyller 18 🎂",
  "2026-07-20": "William & Anna reser hem 14.50 ✈️",
  "2026-07-22": "Leja, Leo & Viktor reser hem 14.50 ✈️",
  "2026-07-24": "Hemresa",
};

const weekdayFmt = new Intl.DateTimeFormat("sv-SE", {
  weekday: "long",
  timeZone: "Europe/Paris",
});
const labelFmt = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

export function getTripDays(): TripDay[] {
  const days: TripDay[] = [];
  const start = new Date(`${TRIP_START}T12:00:00Z`);
  for (let i = 0; ; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    days.push({
      date,
      dayNumber: i + 1,
      weekday: weekdayFmt.format(d),
      label: labelFmt.format(d),
      special: SPECIALS[date],
    });
    if (date === TRIP_END) break;
  }
  return days;
}

/** Dagens datum i Montpelliers tidszon. */
export function todayInFrance(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
  }).format(new Date());
}

/** Negativt = dagar kvar till avresa, 1–15 = dag N av resan, null = resan är över. */
export function tripStatus(today = todayInFrance()) {
  if (today > TRIP_END) return { phase: "efter" as const };
  if (today < TRIP_START) {
    const diff = Math.round(
      (Date.parse(TRIP_START) - Date.parse(today)) / 86_400_000
    );
    return { phase: "innan" as const, daysLeft: diff };
  }
  const dayNumber =
    Math.round((Date.parse(today) - Date.parse(TRIP_START)) / 86_400_000) + 1;
  return { phase: "under" as const, dayNumber };
}
