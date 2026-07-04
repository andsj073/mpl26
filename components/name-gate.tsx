"use client";

import { useEffect, useState } from "react";
import { FAMILY } from "@/lib/family";

const STORAGE_KEY = "mpl26:name";

/** Första besöket: välj vem du är. Sparas i localStorage. */
export function NameGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="text-center">
        <p className="kicker">10–24 juli 2026</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">
          Montpellier
        </h1>
      </div>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Vem är du? Valet sparas på den här telefonen.
      </p>
      <div className="grid w-full max-w-xs grid-cols-2 gap-2">
        {FAMILY.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, p.name);
              setOpen(false);
            }}
            className="rounded-xl border border-border bg-card py-3 text-base font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
