"use client";

import { useState } from "react";

export default function LasPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      location.href = "/dagar";
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error ?? "Något gick fel.");
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="text-center">
        <p className="kicker">Familjens app · 10–24 juli 2026</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">
          Montpellier
        </h1>
      </div>
      <form onSubmit={unlock} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Lösenord"
          autoFocus
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-base outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Öppna
        </button>
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}
      </form>
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Fråga i familjechatten om du inte fått lösenordet.
      </p>
    </div>
  );
}
