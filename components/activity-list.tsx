"use client";

import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import type { Activity } from "@/lib/db/schema";
import { CATEGORIES, pillStyle, type Category } from "@/lib/categories";
import { DISTANCE_FILTERS, kmFromHome } from "@/lib/geo";
import { cn } from "@/lib/utils";

function mapsUrl(a: Activity): string {
  const q =
    a.lat != null && a.lng != null
      ? `${a.lat},${a.lng}`
      : encodeURIComponent(a.address ?? a.title);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function ActivityList({ items }: { items: Activity[] }) {
  const [filter, setFilter] = useState<Category | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  const present = Object.entries(CATEGORIES).filter(([key]) =>
    items.some((a) => a.category === key)
  );

  const distFilter = DISTANCE_FILTERS.find((d) => d.key === distance);
  let hiddenNoCoords = 0;
  const shown = items.filter((a) => {
    if (filter && a.category !== filter) return false;
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

      <ul className="space-y-2.5">
        {shown.map((a) => (
          <ActivityCard key={a.id} a={a} />
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

function ActivityCard({ a }: { a: Activity }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORIES[a.category];

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
      {open && (
        <div className="mt-2 space-y-2 border-t border-border pt-2 text-sm">
          {a.description && (
            <p className="leading-relaxed text-foreground/90">
              {a.description}
            </p>
          )}
          {a.address && (
            <p className="text-xs text-muted-foreground">{a.address}</p>
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
