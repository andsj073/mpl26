"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  author: string | null;
  createdAt: string;
};

type StreamItem =
  | { type: "text"; text: string }
  | { type: "tool"; label: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ChattPage() {
  const [name, setName] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");
  const [toolLabels, setToolLabels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<{ messages: Msg[]; dbMissing?: boolean }>(
    "/api/messages",
    fetcher,
    { refreshInterval: 30_000 }
  );

  useEffect(() => {
    setName(localStorage.getItem("mpl26:name"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length, streamText, pending]);

  const busy = pending !== null;
  const dbMissing = data?.dbMissing;

  async function send() {
    const content = input.trim();
    if (!content || !name || busy) return;
    setInput("");
    setPending(content);
    setStreamText("");
    setToolLabels([]);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author: name }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Fel ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6)) as
            | StreamItem
            | { type: "done" }
            | { type: "error"; message: string };
          if (evt.type === "text") setStreamText((t) => t + evt.text);
          else if (evt.type === "tool")
            setToolLabels((l) => [...l, evt.label]);
          else if (evt.type === "error") setError(evt.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel.");
    } finally {
      setPending(null);
      setStreamText("");
      setToolLabels([]);
      await mutate();
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
      <header className="flex items-end justify-between gap-2 pb-3">
        <div>
          <p className="kicker">Hela familjen + AI</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            Chatt
          </h1>
        </div>
        {name && (
          <button
            onClick={() => {
              localStorage.removeItem("mpl26:name");
              location.reload();
            }}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Du är {name} — byt
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3">
        {dbMissing && (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Databasen är inte inkopplad än — chatten aktiveras när
            DATABASE_URL finns.
          </p>
        )}
        {data?.messages.length === 0 && !dbMissing && (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            Familjens gemensamma tråd. AI:n känner till dagarna, vädret och
            idébanken — och kan planera in aktiviteter åt er.
          </p>
        )}
        {data?.messages.map((m) => (
          <MessageBubble key={m.id} msg={m} me={name} />
        ))}

        {pending && (
          <MessageBubble
            msg={{
              id: "pending",
              role: "user",
              content: pending,
              author: name,
              createdAt: "",
            }}
            me={name}
          />
        )}
        {toolLabels.map((label, i) => (
          <p key={i} className="text-center text-xs font-medium text-primary">
            ✓ {label}
          </p>
        ))}
        {streamText && (
          <MessageBubble
            msg={{
              id: "stream",
              role: "assistant",
              content: streamText,
              author: null,
              createdAt: "",
            }}
            me={name}
          />
        )}
        {busy && !streamText && (
          <p className="text-center text-xs text-muted-foreground">
            AI:n tänker …
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-[4.5rem] mt-4 bg-background pb-1 pt-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={
              dbMissing
                ? "Väntar på databasen …"
                : `Skriv som ${name ?? "…"}`
            }
            disabled={dbMissing || busy}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={dbMissing || busy || !input.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
          >
            Skicka
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ msg, me }: { msg: Msg; me: string | null }) {
  if (msg.role === "assistant") {
    return (
      <div className="rounded-xl rounded-bl-sm border border-border bg-card p-3 text-sm shadow-sm">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Assistenten
        </p>
        <div className="whitespace-pre-wrap">{msg.content}</div>
      </div>
    );
  }
  const mine = msg.author === me;
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl p-3 text-sm shadow-sm",
          mine
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-secondary"
        )}
      >
        {!mine && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
            {msg.author}
          </p>
        )}
        <div className="whitespace-pre-wrap">{msg.content}</div>
      </div>
    </div>
  );
}
