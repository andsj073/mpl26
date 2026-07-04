"use client";

import { useEffect, useState } from "react";
import { StatusChip } from "@/components/status-chip";

export type DayPlanEntry = {
  activityId: string;
  title: string;
  categoryColor: string;
  statuses: { person: string; status: number }[];
};

/** Dagens planerade aktiviteter: de jag är inblandad i överst,
 *  med allas status-chips under varje aktivitet. */
export function DayPlan({ entries }: { entries: DayPlanEntry[] }) {
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setMe(localStorage.getItem("mpl26:name"));
  }, []);

  const sorted = [...entries].sort((a, b) => {
    const mineA = a.statuses.find((s) => s.person === me)?.status ?? 0;
    const mineB = b.statuses.find((s) => s.person === me)?.status ?? 0;
    if ((mineA > 0) !== (mineB > 0)) return mineA > 0 ? -1 : 1;
    return a.title.localeCompare(b.title, "sv");
  });

  return (
    <ul className="mt-2 space-y-1.5">
      {sorted.map((e) => (
        <li key={e.activityId} className="text-sm">
          <span className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: e.categoryColor }}
            />
            {e.title}
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
      ))}
    </ul>
  );
}
