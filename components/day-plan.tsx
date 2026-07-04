"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { cn } from "@/lib/utils";

export type DayPlanEntry = {
  activityId: string;
  title: string;
  categoryColor: string;
  // Endast statusar som gäller just denna dag
  statuses: { person: string; status: number }[];
};

export type ActivityOption = {
  id: string;
  title: string;
  color: string;
};

/** Dagens planerade aktiviteter + möjlighet att lägga till från
 *  idébanken. Mina aktiviteter överst; knappen per rad cyklar min
 *  status för dagen (planerar → gjort → av). */
export function DayPlan({
  dayDate,
  entries,
  allActivities,
}: {
  dayDate: string;
  entries: DayPlanEntry[];
  allActivities: ActivityOption[];
}) {
  const [me, setMe] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    setMe(localStorage.getItem("mpl26:name"));
  }, []);

  async function setStatus(activityId: string, status: number) {
    if (!me || busyId) return;
    setBusyId(activityId);
    await fetch("/api/activity-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId,
        person: me,
        status,
        dayDate: status === 0 ? null : dayDate,
      }),
    }).catch(() => null);
    setBusyId(null);
    setPicking(false);
    setQuery("");
    router.refresh();
  }

  const sorted = [...entries].sort((a, b) => {
    const mineA = a.statuses.find((s) => s.person === me)?.status ?? 0;
    const mineB = b.statuses.find((s) => s.person === me)?.status ?? 0;
    if ((mineA > 0) !== (mineB > 0)) return mineA > 0 ? -1 : 1;
    return a.title.localeCompare(b.title, "sv");
  });

  const onDay = new Set(entries.map((e) => e.activityId));
  const pickable = allActivities
    .filter((a) => !onDay.has(a.id))
    .filter((a) => a.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      {sorted.length > 0 && (
        <ul className="space-y-1.5">
          {sorted.map((e) => {
            const mine = e.statuses.find((s) => s.person === me)?.status ?? 0;
            return (
              <li key={e.activityId} className="text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: e.categoryColor }}
                  />
                  <span className="flex-1">{e.title}</span>
                  {me && (
                    <button
                      onClick={() => setStatus(e.activityId, (mine + 1) % 3)}
                      disabled={busyId === e.activityId}
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-50",
                        mine === 0 && "border-border text-muted-foreground",
                        mine === 1 && "border-primary/60 text-primary",
                        mine === 2 &&
                          "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      {mine === 0 ? "+ jag" : mine === 1 ? "planerar" : "gjort ✓"}
                    </button>
                  )}
                </span>
                {e.statuses.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1 pl-4">
                    {[...e.statuses]
                      .sort(
                        (x, y) =>
                          y.status - x.status ||
                          x.person.localeCompare(y.person)
                      )
                      .map((s) => (
                        <StatusChip
                          key={s.person}
                          person={s.person}
                          status={s.status}
                        />
                      ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {me && (
        <div className="mt-1.5">
          <button
            onClick={() => setPicking(!picking)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <Plus className="size-3.5" /> Lägg till aktivitet
          </button>
          {picking && (
            <div className="mt-1.5 rounded-lg border border-border bg-popover p-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök i idébanken …"
                autoFocus
                className="mb-1.5 w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <ul className="max-h-44 space-y-0.5 overflow-y-auto">
                {pickable.slice(0, 30).map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => setStatus(a.id, 1)}
                      disabled={busyId === a.id}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      {a.title}
                    </button>
                  </li>
                ))}
                {pickable.length === 0 && (
                  <li className="px-1.5 py-1 text-xs text-muted-foreground">
                    Inget matchar.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
