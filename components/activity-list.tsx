"use client";

import { useState } from "react";
import type { Activity } from "@/lib/db/schema";
import { CATEGORIES, pillStyle, type Category } from "@/lib/categories";

export function ActivityList({ items }: { items: Activity[] }) {
  const [filter, setFilter] = useState<Category | null>(null);

  const present = Object.entries(CATEGORIES).filter(([key]) =>
    items.some((a) => a.category === key)
  );
  const shown = filter ? items.filter((a) => a.category === filter) : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
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

      <ul className="space-y-2.5">
        {shown.map((a) => (
          <ActivityCard key={a.id} a={a} />
        ))}
      </ul>
    </div>
  );
}

function ActivityCard({ a }: { a: Activity }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORIES[a.category];

  const meta: string[] = [];
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
      {open && (
        <div className="mt-2 space-y-1.5 border-t border-border pt-2 text-sm">
          {a.description && (
            <p className="leading-relaxed text-foreground/90">
              {a.description}
            </p>
          )}
          {a.address && (
            <p className="text-xs text-muted-foreground">{a.address}</p>
          )}
          {a.tags.length > 0 && (
            <p className="flex flex-wrap gap-1 pt-0.5">
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
