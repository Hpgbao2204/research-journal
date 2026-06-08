"use client";

import { useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { QuartileBadge } from "@/components/quartile-badge";
import type { JournalDTO, SearchResults } from "@/lib/dto";

const MAX = 4;

export default function ComparePage() {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<JournalDTO[]>([]);
  const [selected, setSelected] = useState<JournalDTO[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?contentType=JOURNAL&q=${encodeURIComponent(q)}&pageSize=8`);
      const data: SearchResults = await res.json();
      setOptions(data.journals ?? []);
    } finally {
      setLoading(false);
    }
  }

  function add(j: JournalDTO) {
    if (selected.length >= MAX || selected.some((s) => s.id === j.id)) return;
    setSelected([...selected, j]);
  }
  function remove(id: string) {
    setSelected(selected.filter((s) => s.id !== id));
  }

  const rows: Array<[string, (j: JournalDTO) => React.ReactNode]> = [
    ["Quartile", (j) => <QuartileBadge quartile={j.quartile} />],
    ["SJR", (j) => j.sjr ?? "—"],
    ["H-index", (j) => j.hIndex ?? "—"],
    ["Publisher", (j) => j.publisher ?? "—"],
    ["Country", (j) => j.country ?? "—"],
    ["Open access", (j) => (j.openAccess == null ? "—" : j.openAccess ? "Yes" : "No")],
    ["Subject area", (j) => j.areas.join(", ") || "—"],
    ["ISSN", (j) => j.issn ?? "—"],
  ];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Compare journals</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Add up to {MAX} journals to compare SJR, quartile, H-index, and more side by side.
      </p>

      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a journal to add…"
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <button type="submit" disabled={loading} className="rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60">
          {loading ? "…" : "Search"}
        </button>
      </form>

      {options.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-2">
          {options.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-[var(--muted)]">
              <span className="flex items-center gap-2 text-sm">
                <QuartileBadge quartile={j.quartile} /> {j.name}
              </span>
              <button
                onClick={() => add(j)}
                disabled={selected.length >= MAX || selected.some((s) => s.id === j.id)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs disabled:opacity-40"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--muted)]">
                <th className="p-3 text-left font-medium text-[var(--muted-foreground)]">Metric</th>
                {selected.map((j) => (
                  <th key={j.id} className="min-w-40 p-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-snug">{j.name}</span>
                      <button onClick={() => remove(j.id)} className="text-[var(--muted-foreground)] hover:text-[var(--warning)]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, render]) => (
                <tr key={label} className="border-t border-[var(--border)]">
                  <td className="p-3 font-medium text-[var(--muted-foreground)]">{label}</td>
                  {selected.map((j) => (
                    <td key={j.id} className="p-3">
                      {render(j)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
