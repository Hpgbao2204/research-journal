"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function seed() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      if (!res.ok) throw new Error("Seed failed");
      const data = (await res.json()) as {
        created: { journals: number; conferences: number; specialIssues: number; papers: number };
      };
      setMsg(
        `Seeded: ${data.created.conferences} conferences, ${data.created.specialIssues} special issues, ${data.created.papers} papers.`,
      );
      router.refresh();
    } catch {
      setMsg("Seed failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-sm text-[var(--muted-foreground)]">{msg}</span>}
      <button
        onClick={seed}
        disabled={busy}
        className="rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60"
      >
        {busy ? "Seeding…" : "Run seed"}
      </button>
    </div>
  );
}
