"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import type { Activity } from "@/lib/db/schema";
import { CATEGORIES, pillStyle, type Category } from "@/lib/categories";
import { DISTANCE_FILTERS, kmFromHome } from "@/lib/geo";
import { getTripDays } from "@/lib/trip";
import { personColor } from "@/lib/family";
import { cn } from "@/lib/utils";

type StatusRow = {
  activityId: string;
  person: string;
  status: number;
  dayDate: string | null;
};

function mapsUrl(a: Activity): string {
  const q =
    a.lat != null && a.lng != null
      ? `${a.lat},${a.lng}`
      : encodeURIComponent(a.address ?? a.title);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function ActivityList({
  items,
  initialStatuses,
}: {
  items: Activity[];
  initialStatuses: StatusRow[];
}) {
  const [filter, setFilter] = useState<Category | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [mineFilter, setMineFilter] = useState<"planerar" | "oplanerade" | null>(
    null
  );
  const [pearlsOnly, setPearlsOnly] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<StatusRow[]>(initialStatuses);

  useEffect(() => {
    setMe(localStorage.getItem("mpl26:name"));
  }, []);

  async function setStatus(
    activityId: string,
    status: number,
    dayDate: string | null
  ) {
    if (!me) return;
    // Optimistisk uppdatering, backas vid fel
    const prev = statuses;
    setStatuses((rows) => {
      const rest = rows.filter(
        (s) => !(s.activityId === activityId && s.person === me)
      );
      return status === 0
        ? rest
        : [...rest, { activityId, person: me, status, dayDate }];
    });
    const res = await fetch("/api/activity-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId, person: me, status, dayDate }),
    }).catch(() => null);
    if (!res?.ok) setStatuses(prev);
  }

  const present = Object.entries(CATEGORIES).filter(([key]) =>
    items.some((a) => a.category === key)
  );

  const distFilter = DISTANCE_FILTERS.find((d) => d.key === distance);
  let hiddenNoCoords = 0;
  const shown = items.filter((a) => {
    if (pearlsOnly && !a.featured) return false;
    if (filter && a.category !== filter) return false;
    if (mineFilter && me) {
      const mine =
        statuses.find((s) => s.activityId === a.id && s.person === me)
          ?.status ?? 0;
      if (mineFilter === "planerar" && mine !== 1) return false;
      if (mineFilter === "oplanerade" && mine !== 0) return false;
    }
    if (distFilter) {
      if (a.lat == null || a.lng == null) {
        hiddenNoCoords++;
        return false;
      }
      return distFilter.match(kmFromHome(a.lat, a.lng));
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setPearlsOnly(!pearlsOnly)}
          className={cn(
            "rounded-full border px-3 py-1 text-[12px] font-bold uppercase tracking-wider transition-colors",
            pearlsOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "goldnote"
          )}
        >
          ⭐ Pärlor
        </button>
        {present.map(([key, { label, color }]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(active ? null : (key as Category))}
              className="rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wider transition-colors"
              style={
                active
                  ? {
                      backgroundColor: color,
                      color: "#0d0f14",
                      border: `1px solid ${color}`,
                    }
                  : pillStyle(color)
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          Från huset:
        </span>
        {DISTANCE_FILTERS.map((d) => {
          const active = distance === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setDistance(active ? null : d.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-bold tracking-wider transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {me && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            Mina:
          </span>
          {(
            [
              { key: "planerar", label: "Jag planerar" },
              { key: "oplanerade", label: "Oplanerade" },
            ] as const
          ).map(({ key, label }) => {
            const active = mineFilter === key;
            return (
              <button
                key={key}
                onClick={() => setMineFilter(active ? null : key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] font-bold tracking-wider transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <ul className="space-y-2.5">
        {shown.map((a) => (
          <ActivityCard
            key={a.id}
            a={a}
            statuses={statuses.filter((s) => s.activityId === a.id)}
            me={me}
            onSet={(status, dayDate) => setStatus(a.id, status, dayDate)}
          />
        ))}
      </ul>
      {shown.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Inget matchar filtren.
        </p>
      )}
      {distFilter && hiddenNoCoords > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {hiddenNoCoords} aktiviteter utan kartposition visas inte vid
          avståndsfiltrering.
        </p>
      )}
    </div>
  );
}

/** Chip för en persons status: tonad = planerar, solid = har gjort. */
function StatusChip({ person, status }: { person: string; status: number }) {
  const color = personColor(person);
  const style =
    status === 2
      ? { backgroundColor: color, color: "#0d0f14", border: `1px solid ${color}` }
      : pillStyle(color);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={style}
    >
      {person}
      {status === 2 && " ✓"}
    </span>
  );
}

const TRIP_DAYS = getTripDays();

function fmtDay(date: string | null): string {
  if (!date) return "";
  const d = TRIP_DAYS.find((t) => t.date === date);
  return d ? `${d.weekday.slice(0, 3)} ${d.label.replace(" juli", "/7")}` : date;
}

function ActivityCard({
  a,
  statuses,
  me,
  onSet,
}: {
  a: Activity;
  statuses: StatusRow[];
  me: string | null;
  onSet: (status: number, dayDate: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const cat = CATEGORIES[a.category];
  const myRow = statuses.find((s) => s.person === me);
  const myStatus = myRow?.status ?? 0;

  const meta: string[] = [];
  if (a.lat != null && a.lng != null) {
    const km = kmFromHome(a.lat, a.lng);
    meta.push(km < 1 ? "vid huset" : `~${Math.round(km)} km`);
  }
  if (a.durationMin != null) {
    const h = a.durationMin / 60;
    meta.push(h >= 1 ? `~${Math.round(h)} h` : `${a.durationMin} min`);
  }
  if (a.budgetMax != null && a.budgetMax > 0)
    meta.push(`${a.budgetMin ?? 0}–${a.budgetMax} €`);
  else if (a.budgetMax === 0) meta.push("gratis");

  return (
    <li
      className="cursor-pointer rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/50"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-snug">{a.title}</p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
          style={pillStyle(cat.color)}
        >
          {cat.label}
        </span>
      </div>
      {meta.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {meta.join(" · ")}
        </p>
      )}
      {statuses.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1">
          {[...statuses]
            .sort((x, y) => y.status - x.status || x.person.localeCompare(y.person))
            .map((s) => (
              <StatusChip key={s.person} person={s.person} status={s.status} />
            ))}
        </p>
      )}
      {open && (
        <div className="mt-2 space-y-2 border-t border-border pt-2 text-sm">
          {a.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.imageUrl}
              alt={a.title}
              loading="lazy"
              className="max-h-48 w-full rounded-lg object-cover"
            />
          )}
          {a.description && (
            <p className="leading-relaxed text-foreground/90">
              {a.description}
            </p>
          )}
          {a.address && (
            <p className="text-xs text-muted-foreground">{a.address}</p>
          )}
          {me && (
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  if (myStatus === 2) {
                    onSet(0, null);
                    setChoosing(false);
                  } else {
                    setChoosing(!choosing);
                  }
                }}
                className="w-full rounded-lg border py-2 text-sm font-bold transition-colors"
                style={
                  myStatus === 0
                    ? { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                    : myStatus === 1
                      ? pillStyle(personColor(me))
                      : {
                          backgroundColor: personColor(me),
                          color: "#0d0f14",
                          border: `1px solid ${personColor(me)}`,
                        }
                }
              >
                {myStatus === 0 && "Planerar inte — tryck för att välja dag"}
                {myStatus === 1 &&
                  `${me} planerar ${fmtDay(myRow?.dayDate ?? null)} — tryck när du gjort det`}
                {myStatus === 2 &&
                  `${me} har gjort det här ✓ — tryck för att nollställa`}
              </button>
              {choosing && (
                <div className="mt-1.5 rounded-lg border border-border bg-popover p-2">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {myStatus === 0
                      ? "Vilken dag planerar du det?"
                      : "Vilken dag gjorde du det?"}
                  </p>
                  <div className="grid grid-cols-5 gap-1">
                    {TRIP_DAYS.map((d) => {
                      const selected = myRow?.dayDate === d.date;
                      return (
                        <button
                          key={d.date}
                          onClick={() => {
                            onSet(myStatus === 0 ? 1 : 2, d.date);
                            setChoosing(false);
                          }}
                          className={cn(
                            "rounded-md border px-1 py-1.5 text-center text-[11px] font-bold leading-tight",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card"
                          )}
                        >
                          {d.weekday.slice(0, 3)}
                          <br />
                          {d.dayNumber + 9}/7
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <p
            className="flex flex-wrap gap-3 pt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={mapsUrl(a)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <MapPin className="size-3.5" /> Karta
            </a>
            {a.websiteUrl && (
              <a
                href={a.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                <ExternalLink className="size-3.5" /> Webbplats
              </a>
            )}
            {a.tripadvisorUrl && (
              <a
                href={a.tripadvisorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                <ExternalLink className="size-3.5" /> Tripadvisor
              </a>
            )}
          </p>
          {a.tags.length > 0 && (
            <p className="flex flex-wrap gap-1">
              {a.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
