"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataSourceBadge } from "@/components/data-source-badge";
import { JournalCard } from "@/components/journal-card";
import { PaperCard } from "@/components/paper-card";
import { MockDataNotice } from "@/components/mock-data-notice";
import type { SearchResults } from "@/lib/dto";

type ContentType = "JOURNAL" | "CONFERENCE" | "SPECIAL_ISSUE" | "PAPER";

const PAGE_SIZE = 18;

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [contentType, setContentType] = useState<ContentType>("JOURNAL");
  const [area, setArea] = useState("");
  const [openAccess, setOpenAccess] = useState<"" | "true" | "false">("");
  const [quartile, setQuartile] = useState("");
  const [publisher, setPublisher] = useState("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState<"sjr" | "hindex" | "title">("sjr");
  const [page, setPage] = useState(1);

  const [areas, setAreas] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/api/meta/areas")
      .then((r) => r.json())
      .then((d) => setAreas(d.areas ?? []))
      .catch(() => setAreas([]));
  }, []);

  const runSearch = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const add = (k: string, v: string) => {
          if (v.trim() !== "") params.set(k, v.trim());
        };
        add("q", q);
        add("contentType", contentType);
        add("field", area);
        add("openAccess", openAccess);
        add("quartile", quartile);
        add("publisher", publisher);
        add("country", country);
        add("sort", sort);
        params.set("page", String(nextPage));
        params.set("pageSize", String(PAGE_SIZE));

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error("Search failed.");
        const data: SearchResults = await res.json();
        setResults(data);
        setPage(nextPage);
        setSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed.");
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [q, contentType, area, openAccess, quartile, publisher, country, sort],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(1);
  };

  const totalPages = results?.journalsTotal
    ? Math.ceil(results.journalsTotal / PAGE_SIZE)
    : 1;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Search venues</h1>
      <MockDataNotice />

      <form onSubmit={onSubmit} className="flex flex-col gap-4 lg:flex-row">
        {/* Filters sidebar */}
        <aside className="flex w-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm lg:w-72">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" /> Filters
          </div>

          <Select label="Content type" value={contentType} onChange={(v) => setContentType(v as ContentType)}
            options={[["JOURNAL", "Journals"], ["CONFERENCE", "Conferences"], ["SPECIAL_ISSUE", "Special issues"], ["PAPER", "Papers"]]} />

          <Select label="Subject area" value={area} onChange={setArea}
            options={[["", "Any area"], ...areas.map((a) => [a, a] as [string, string])]} />

          <Select label="Quartile" value={quartile} onChange={setQuartile}
            options={[["", "Any"], ["Q1", "Q1"], ["Q2", "Q2"], ["Q3", "Q3"], ["Q4", "Q4"]]} />

          <Select label="Open access" value={openAccess} onChange={(v) => setOpenAccess(v as "" | "true" | "false")}
            options={[["", "Any"], ["true", "Open access"], ["false", "Subscription"]]} />

          <Select label="Sort by" value={sort} onChange={(v) => setSort(v as typeof sort)}
            options={[["sjr", "SJR (high → low)"], ["hindex", "H-index"], ["title", "Title (A–Z)"]]} />

          <Text label="Publisher" value={publisher} onChange={setPublisher} />
          <Text label="Country" value={country} onChange={setCountry} />
        </aside>

        {/* Query + results */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, topic, publisher…"
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-[var(--radius)] bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {loading && <SkeletonGrid />}
          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-bg)] px-3 py-2 text-sm text-[var(--warning)]">
              {error}
            </p>
          )}

          {!loading && !searched && (
            <p className="text-sm text-[var(--muted-foreground)]">
              Enter a query or pick filters, then press Search. Try area “Computer Science” + Quartile Q1.
            </p>
          )}

          {!loading && !error && searched && results && results.total === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius)] border border-dashed border-[var(--border)] py-16 text-center">
              <SearchIcon className="h-8 w-8 text-[var(--muted-foreground)]" />
              <p className="text-sm text-[var(--muted-foreground)]">No results. Try broadening your filters.</p>
            </div>
          )}

          {!loading && !error && results && results.total > 0 && (
            <Results results={results} />
          )}

          {!loading && contentType === "JOURNAL" && results && (results.journalsTotal ?? 0) > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => runSearch(page - 1)}
                disabled={page <= 1}
                className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-[var(--muted-foreground)]">
                Page {page} / {totalPages} · {results.journalsTotal} journals
              </span>
              <button
                onClick={() => runSearch(page + 1)}
                disabled={page >= totalPages}
                className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </form>
    </main>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
      />
    </label>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)]" />
      ))}
    </div>
  );
}

function Results({ results }: { results: SearchResults }) {
  return (
    <div className="flex flex-col gap-6">
      {results.journals.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.journals.map((j) => (
            <li key={j.id}>
              <JournalCard journal={j} />
            </li>
          ))}
        </ul>
      )}

      {results.conferences.length > 0 && (
        <Group title="Conferences">
          {results.conferences.map((c) => (
            <SimpleCard key={c.id} href={`/conferences/${c.id}`} title={c.acronym ? `${c.acronym} — ${c.name}` : c.name}
              subtitle={[c.organizer, c.location].filter(Boolean).join(" · ")} badges={[c.lifecycleStatus]} ds={c.dataSource} unv={c.isUnverified} />
          ))}
        </Group>
      )}

      {results.specialIssues.length > 0 && (
        <Group title="Special issues">
          {results.specialIssues.map((s) => (
            <SimpleCard key={s.id} href={`/special-issues/${s.id}`} title={s.title}
              subtitle={[s.journalName, s.field].filter(Boolean).join(" · ")} badges={[s.lifecycleStatus]} ds={s.dataSource} unv={s.isUnverified} />
          ))}
        </Group>
      )}

      {results.papers.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Papers</h2>
          <ul className="flex flex-col gap-3">
            {results.papers.map((p) => (
              <li key={p.id}>
                <PaperCard paper={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  );
}

function SimpleCard({
  href,
  title,
  subtitle,
  badges,
  ds,
  unv,
}: {
  href?: string;
  title: string;
  subtitle: string;
  badges: string[];
  ds: SearchResults["journals"][number]["dataSource"];
  unv: boolean;
}) {
  const inner = (
    <div className="flex h-full flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <span className="font-semibold leading-snug">{title}</span>
      {subtitle && <span className="text-xs text-[var(--muted-foreground)]">{subtitle}</span>}
      <div className="flex flex-wrap gap-1.5">
        {badges.filter(Boolean).map((b) => (
          <Badge key={b} variant="outline">
            {b}
          </Badge>
        ))}
      </div>
      <DataSourceBadge dataSource={ds} isUnverified={unv} />
    </div>
  );
  return <li>{href ? <Link href={href} className="block h-full transition-transform hover:-translate-y-0.5">{inner}</Link> : inner}</li>;
}
