import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { logger } from "@/lib/http/logger";
import type { JournalDTO } from "@/lib/dto";

/**
 * Scimago (SJR) provider — the primary journal catalogue.
 *
 * Loads the Scimago Journal Rank CSV from /data (e.g. "scimagojr 2024.csv") once
 * into memory. Provides:
 *   - lookup(issns)        : enrich OpenAlex journals by ISSN
 *   - searchJournals(...)  : filter/sort/paginate the full 30k+ journal catalogue
 *   - getById(sourceId)    : journal detail
 *   - areas()              : distinct subject areas for filter dropdowns
 *
 * This is real, verified data attributed to Scimago (Scopus-based).
 */

export interface ScimagoEntry {
  sourceId: string;
  title: string;
  issns: string[];
  quartile: "Q1" | "Q2" | "Q3" | "Q4" | null;
  sjr: number | null;
  hIndex: number | null;
  country: string | null;
  region: string | null;
  publisher: string | null;
  categories: string[];
  areas: string[];
  type: string | null;
  openAccess: boolean | null;
  coverage: string | null;
}

interface ScimagoData {
  byIssn: Map<string, ScimagoEntry>;
  byId: Map<string, ScimagoEntry>;
  list: ScimagoEntry[];
  areas: string[];
}

const SCIMAGO_SOURCE = {
  id: "scimago",
  name: "Scimago (SJR)",
  reliability: "external-scimago-csv",
};

const globalForScimago = globalThis as unknown as { __scimago?: ScimagoData };

function normIssn(raw: string): string {
  return raw.replace(/[^0-9xX]/g, "").toUpperCase();
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ";" && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim().replace(/^"|"$/g, ""));
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseCategories(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((c) => c.replace(/\s*\(Q[1-4]\)\s*$/i, "").trim())
    .filter(Boolean);
}

function findCsvPath(): string | null {
  try {
    const dir = path.join(process.cwd(), "data");
    const file = readdirSync(dir).find((f) => /scimago.*\.csv$/i.test(f));
    return file ? path.join(dir, file) : null;
  } catch {
    return null;
  }
}

function build(): ScimagoData {
  const data: ScimagoData = { byIssn: new Map(), byId: new Map(), list: [], areas: [] };
  const csvPath = findCsvPath();
  if (!csvPath) {
    logger.warn("scimago.noCsv", { hint: "place scimagojr <year>.csv in /data" });
    return data;
  }

  try {
    const content = readFileSync(csvPath, "utf8");
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) return data;

    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const col = (name: string) => headers.findIndex((h) => h === name.toLowerCase());
    const idx = {
      sourceId: col("Sourceid"),
      title: col("Title"),
      type: col("Type"),
      issn: col("Issn"),
      publisher: col("Publisher"),
      openAccess: col("Open Access"),
      sjr: col("SJR"),
      quartile: col("SJR Best Quartile"),
      hIndex: col("H index"),
      country: col("Country"),
      region: col("Region"),
      coverage: col("Coverage"),
      categories: col("Categories"),
      areas: col("Areas"),
    };

    const areaSet = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const c = splitCsvLine(lines[i]);
      const q = (c[idx.quartile] ?? "").toUpperCase();
      const issns = (c[idx.issn] ?? "")
        .split(/[,\s]+/)
        .map(normIssn)
        .filter((s) => s.length >= 8);
      const areas = (c[idx.areas] ?? "").split(";").map((a) => a.trim()).filter(Boolean);
      const entry: ScimagoEntry = {
        sourceId: c[idx.sourceId] ?? "",
        title: c[idx.title] ?? "",
        issns,
        quartile: /^Q[1-4]$/.test(q) ? (q as ScimagoEntry["quartile"]) : null,
        sjr: parseNumber(c[idx.sjr]),
        hIndex: parseNumber(c[idx.hIndex]),
        country: c[idx.country] || null,
        region: c[idx.region] || null,
        publisher: c[idx.publisher] || null,
        categories: parseCategories(c[idx.categories]),
        areas,
        type: c[idx.type] || null,
        openAccess: c[idx.openAccess] ? /yes/i.test(c[idx.openAccess]) : null,
        coverage: c[idx.coverage] || null,
      };
      if (!entry.sourceId || !entry.title) continue;
      data.list.push(entry);
      data.byId.set(entry.sourceId, entry);
      for (const issn of issns) if (!data.byIssn.has(issn)) data.byIssn.set(issn, entry);
      for (const a of areas) areaSet.add(a);
    }
    data.areas = [...areaSet].sort();
    logger.info("scimago.loaded", { journals: data.list.length, areas: data.areas.length });
  } catch (err) {
    logger.error("scimago.load", err);
  }
  return data;
}

function getData(): ScimagoData {
  if (!globalForScimago.__scimago) globalForScimago.__scimago = build();
  return globalForScimago.__scimago;
}

function toJournalDTO(e: ScimagoEntry): JournalDTO {
  const now = new Date().toISOString();
  return {
    id: e.sourceId,
    name: e.title,
    publisher: e.publisher,
    issn: e.issns[0] ? e.issns[0].replace(/^(\w{4})(\w{4})$/, "$1-$2") : null,
    eissn: e.issns[1] ? e.issns[1].replace(/^(\w{4})(\w{4})$/, "$1-$2") : null,
    field: e.areas[0] ?? null,
    scope: e.categories.length > 0 ? `Categories: ${e.categories.join(", ")}.` : null,
    indexing: ["Scopus"],
    quartile: e.quartile,
    impactFactor: null,
    sjr: e.sjr,
    hIndex: e.hIndex,
    areas: e.areas,
    categories: e.categories,
    apc: null,
    openAccess: e.openAccess,
    submissionUrl: null,
    submissionDeadline: null,
    country: e.country,
    notes: e.coverage ? `Coverage: ${e.coverage}.` : null,
    keywords: e.categories.slice(0, 10),
    sourceUrl: `https://www.scimagojr.com/journalsearch.php?q=${e.sourceId}&tip=sid`,
    officialUrl: null,
    dataSource: SCIMAGO_SOURCE,
    verificationStatus: "VERIFIED",
    isUnverified: false,
    lastCheckedAt: now,
    updatedAt: now,
  };
}

export type JournalSort = "sjr" | "hindex" | "title";

export interface ScimagoQuery {
  q?: string;
  area?: string;
  quartile?: string;
  openAccess?: boolean;
  country?: string;
  publisher?: string;
  sort?: JournalSort;
  page?: number;
  pageSize?: number;
}

export const scimago = {
  lookup(issns: Array<string | null | undefined>): ScimagoEntry | null {
    const { byIssn } = getData();
    for (const issn of issns) {
      if (!issn) continue;
      const hit = byIssn.get(normIssn(issn));
      if (hit) return hit;
    }
    return null;
  },

  isLoaded(): boolean {
    return getData().list.length > 0;
  },

  areas(): string[] {
    return getData().areas;
  },

  getById(sourceId: string): JournalDTO | null {
    const e = getData().byId.get(sourceId);
    return e ? toJournalDTO(e) : null;
  },

  /** Filter, sort, and paginate the journal catalogue. */
  searchJournals(query: ScimagoQuery): { items: JournalDTO[]; total: number } {
    const { list } = getData();
    const tokens = (query.q ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2);
    const area = query.area?.toLowerCase();
    const country = query.country?.toLowerCase();
    const publisher = query.publisher?.toLowerCase();

    const scored: Array<{ e: ScimagoEntry; rel: number }> = [];
    for (const e of list) {
      if (area && !e.areas.some((a) => a.toLowerCase() === area)) continue;
      if (query.quartile && e.quartile !== query.quartile) continue;
      if (query.openAccess !== undefined && e.openAccess !== query.openAccess) continue;
      if (country && e.country?.toLowerCase() !== country) continue;
      if (publisher && !e.publisher?.toLowerCase().includes(publisher)) continue;

      let rel = 0;
      if (tokens.length > 0) {
        const haystack = `${e.title} ${e.categories.join(" ")} ${e.areas.join(" ")} ${e.publisher ?? ""}`.toLowerCase();
        for (const t of tokens) if (haystack.includes(t)) rel += 1;
        if (rel === 0) continue; // must match at least one query token
      }
      scored.push({ e, rel });
    }

    const sort = query.sort ?? "sjr";
    scored.sort((a, b) => {
      // When a text query is present, rank by relevance first.
      if (b.rel !== a.rel) return b.rel - a.rel;
      if (sort === "title") return a.e.title.localeCompare(b.e.title);
      if (sort === "hindex") return (b.e.hIndex ?? 0) - (a.e.hIndex ?? 0);
      return (b.e.sjr ?? 0) - (a.e.sjr ?? 0);
    });

    const total = scored.length;
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 50);
    const start = (page - 1) * pageSize;
    return { items: scored.slice(start, start + pageSize).map((s) => toJournalDTO(s.e)), total };
  },
};
