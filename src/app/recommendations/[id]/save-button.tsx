"use client";

import { useState } from "react";

export function SaveButton({
  resultId,
  initiallySaved,
}: {
  resultId: string;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/saved-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      });
      if (!res.ok) throw new Error("Could not save");
      setSaved(true);
    } catch {
      setError("Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return <span className="text-sm text-[var(--accent)]">✓ Saved</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <button
        onClick={save}
        disabled={busy}
        className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--muted)] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {error && <span className="text-xs text-[var(--warning)]">{error}</span>}
    </span>
  );
}
