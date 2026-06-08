"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataSourceBadge } from "@/components/data-source-badge";
import { MockDataNotice } from "@/components/mock-data-notice";
import type { SearchResults } from "@/lib/dto";

type ContentType = "" | "JOURNAL" | "CONFERENCE" | "SPECIAL_ISSUE" | "PAPER";

const INDEXING_OPTIONS = [
  "Scopus",
  "Web of Science",
  "IEEE",
  "ACM",
  "Springer",
  "Elsevier",
  "MDPI",
  "Frontiers",
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [contentType, setContentType] = useState<ContentType>("");
  const [field, setField] = useState("");
  const [indexing, setIndexing] = useState("");
  const [openAccess, setOpenAccess] = useState<"" | "true" | "false">("");
  const [quartile, setQuartile] = useState("");
  const [publisher, setPublisher] = useState("");
  const [country, setCountry] = useState("");
  const [apcMin, setApcMin] = useState("");
  const [apcMax, setApcMax] = useState("");

  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const add = (k: string, v: string) => {
          if (v.trim() !== "") params.set(k, v.trim());
        };
        add("q", q);
        add("contentType", contentType);
        add("field", field);
        add("indexing", indexing);
        add("openAccess", openAccess);
        add("quartile", quartile);
        add("publisher", publisher);
        add("country", country);
        add("apcMin", apcMin);
        add("apcMax", apcMax);

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error === "validation" ? "Invalid filters." : "Search failed.");
        }
        const data: SearchResults = await res.json();
        setResults(data);
        setSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed.");
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [q, contentType, field, indexing, openAccess, quartile, publisher, country, apcMin, apcMax],
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <MockDataNotice />

      <form onSubmit={runSearch} className="flex flex-col gap-4 lg:flex-row">
        {/* Filters sidebar */}
        <aside className="flex w-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 lg:w-72">
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            Content type
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
            >
              <option value="">All types</option>
              <option value="JOURNAL">Journals</option>
              <option value="CONFERENCE">Conferences</option>
              <option value="SPECIAL_ISSUE">Special issues</option>
              <option value="PAPER">Papers</option>
            </select>
          </label>

          <FilterText label="Field / discipline" value={field} onChange={setField} />

          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            Indexing
            <select
              value={indexing}
              onChange={(e) => setIndexing(e.target.value)}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
            >
              <option value="">Any</option>
              {INDEXING_OPTIONS.map((ix) => (
                <option key={ix} value={ix}>
                  {ix}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            Open access
            <select
              value={openAccess}
              onChange={(e) => setOpenAccess(e.target.value as "" | "true" | "false")}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
            >
              <option value="">Any</option>
              <option value="true">Open access</option>
              <option value="false">Subscription</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            Quartile (journals)
            <select
              value={quartile}
              onChange={(e) => setQuartile(e.target.value)}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
            >
              <option value="">Any</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </label>

          <FilterText label="Publisher / organizer" value={publisher} onChange={setPublisher} />
          <FilterText label="Country / region" value={country} onChange={setCountry} />

          <div className="flex gap-2">
            <FilterText label="APC min" value={apcMin} onChange={setApcMin} type="number" />
            <FilterText label="APC max" value={apcMax} onChange={setApcMax} type="number" />
          </div>
        </aside>

        {/* Query + results */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by keyword, title, scope…"
              className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading results…</p>}
          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-bg)] px-3 py-2 text-sm text-[var(--warning)]">
              {error}
            </p>
          )}

          {!loading && !error && searched && results && results.total === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">
              No results match your search. Try broadening your filters.
            </p>
          )}

          {!loading && !error && results && results.total > 0 && (
            <ResultsList results={results} />
          )}

          {!searched && !loading && (
            <p className="text-sm text-[var(--muted-foreground)]">
              Enter a query or apply filters, then press Search.
            </p>
          )}
        </div>
      </form>
    </main>
  );
}

function FilterText({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
      />
    </label>
  );
}

function ResultsList({ results }: { results: SearchResults }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-[var(--muted-foreground)]">{results.total} result(s)</p>

      <ResultGroup title="Journals">
        {results.journals.map((j) => (
          <ResultCard
            key={j.id}
            href={`/journals/${j.id}`}
            title={j.name}
            subtitle={[j.publisher, j.field].filter(Boolean).join(" · ")}
            badges={[j.quartile, ...j.indexing.slice(0, 2)].filter(Boolean) as string[]}
            dataSource={j.dataSource}
            isUnverified={j.isUnverified}
          />
        ))}
      </ResultGroup>

      <ResultGroup title="Conferences">
        {results.conferences.map((c) => (
          <ResultCard
            key={c.id}
            href={`/conferences/${c.id}`}
            title={c.acronym ? `${c.acronym} — ${c.name}` : c.name}
            subtitle={[c.organizer, c.location].filter(Boolean).join(" · ")}
            badges={[c.lifecycleStatus, c.mode].filter(Boolean) as string[]}
            dataSource={c.dataSource}
            isUnverified={c.isUnverified}
          />
        ))}
      </ResultGroup>

      <ResultGroup title="Special issues">
        {results.specialIssues.map((s) => (
          <ResultCard
            key={s.id}
            href={`/special-issues/${s.id}`}
            title={s.title}
            subtitle={[s.journalName, s.field].filter(Boolean).join(" · ")}
            badges={[s.lifecycleStatus].filter(Boolean) as string[]}
            dataSource={s.dataSource}
            isUnverified={s.isUnverified}
          />
        ))}
      </ResultGroup>

      <ResultGroup title="Papers">
        {results.papers.map((p) => (
          <ResultCard
            key={p.id}
            title={p.title}
            subtitle={[p.authors, p.year ? String(p.year) : null].filter(Boolean).join(" · ")}
            badges={p.keywords.slice(0, 3)}
            dataSource={p.dataSource}
            isUnverified={p.isUnverified}
          />
        ))}
      </ResultGroup>
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some((c) => c);
  if (!hasItems) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  );
}

function ResultCard({
  href,
  title,
  subtitle,
  badges,
  dataSource,
  isUnverified,
}: {
  href?: string;
  title: string;
  subtitle: string;
  badges: string[];
  dataSource: SearchResults["journals"][number]["dataSource"];
  isUnverified: boolean;
}) {
  const inner = (
    <div className="flex h-full flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
      <span className="font-semibold leading-tight">{title}</span>
      {subtitle && <span className="text-xs text-[var(--muted-foreground)]">{subtitle}</span>}
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <Badge key={b} variant="outline">
            {b}
          </Badge>
        ))}
      </div>
      <DataSourceBadge dataSource={dataSource} isUnverified={isUnverified} />
    </div>
  );
  return <li>{href ? <Link href={href} className="block h-full transition-colors hover:opacity-90">{inner}</Link> : inner}</li>;
}
