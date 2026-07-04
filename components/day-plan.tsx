"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/status-chip";
import { cn } from "@/lib/utils";

export type DayPlanEntry = {
  activityId: string;
  title: string;
  categoryColor: string;
  // Endast statusar som gäller just denna dag
  statuses: { person: string; status: number }[];
};

/** Dagens planerade aktiviteter: de jag är inblandad i överst, allas
 *  chips under, och en knapp per rad som cyklar min status för dagen
 *  (planerar → gjort → av). */
export function DayPlan({
  dayDate,
  entries,
}: {
  dayDate: string;
  entries: DayPlanEntry[];
}) {
  const [me, setMe] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMe(localStorage.getItem("mpl26:name"));
  }, []);

  async function cycle(activityId: string, current: number) {
    if (!me || busyId) return;
    const next = (current + 1) % 3;
    setBusyId(activityId);
    await fetch("/api/activity-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId,
        person: me,
        status: next,
        dayDate: next === 0 ? null : dayDate,
      }),
    }).catch(() => null);
    setBusyId(null);
    router.refresh();
  }

  const sorted = [...entries].sort((a, b) => {
    const mineA = a.statuses.find((s) => s.person === me)?.status ?? 0;
    const mineB = b.statuses.find((s) => s.person === me)?.status ?? 0;
    if ((mineA > 0) !== (mineB > 0)) return mineA > 0 ? -1 : 1;
    return a.title.localeCompare(b.title, "sv");
  });

  return (
    <ul className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
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
                  onClick={() => cycle(e.activityId, mine)}
                  disabled={busyId === e.activityId}
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-50",
                    mine === 0 && "border-border text-muted-foreground",
                    mine === 1 && "border-primary/60 text-primary",
                    mine === 2 && "border-primary bg-primary text-primary-foreground"
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
                      y.status - x.status || x.person.localeCompare(y.person)
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
  );
}
