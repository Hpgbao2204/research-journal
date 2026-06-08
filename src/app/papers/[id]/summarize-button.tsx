"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

/** AI TL;DR summary button (uses the configured model; graceful if unavailable). */
export function SummarizeButton({ title, abstract }: { title: string; abstract: string | null }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!abstract) return null;

  async function run() {
    setLoading(true);
    setMessage(null);
    setSummary(null);
    try {
      const res = await fetch("/api/papers/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, abstract }),
      });
      const data = await res.json();
      if (data.available) setSummary(data.summary);
      else setMessage(data.message ?? "AI not available.");
    } catch {
      setMessage("Could not generate summary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius)] border border-[var(--primary)] px-3 py-1.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--muted)] disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" /> {loading ? "Summarizing…" : "AI TL;DR"}
      </button>
      {summary && (
        <pre className="whitespace-pre-wrap rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm">
          {summary}
        </pre>
      )}
      {message && <p className="text-xs text-[var(--muted-foreground)]">{message}</p>}
    </div>
  );
}
