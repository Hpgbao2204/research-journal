import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { logger } from "@/lib/http/logger";

/**
 * Scimago (SJR) provider.
 *
 * Loads the Scimago Journal Rank CSV from /data (e.g. "scimagojr 2024.csv") into
 * an in-memory index keyed by ISSN. OpenAlex provides journal discovery but no
 * SJR quartile/score; we enrich OpenAlex journals with REAL quartile, SJR, and
 * H-index by matching ISSN. This is verified data attributed to Scimago.
 *
 * The CSV is semicolon-delimited with quoted fields that may contain
 * semicolons/commas, so we parse with quote awareness. Parsed once and cached.
 */

export interface ScimagoEntry {
  sourceId: string;
  title: string;
  quartile: "Q1" | "Q2" | "Q3" | "Q4" | null;
  sjr: number | null;
  hIndex: number | null;
  country: string | null;
  publisher: string | null;
  categories: string[];
  areas: string[];
  openAccess: boolean | null;
}

const globalForScimago = globalThis as unknown as {
  __scimagoIndex?: Map<string, ScimagoEntry>;
};

function normIssn(raw: string): string {
  return raw.replace(/[^0-9xX]/g, "").toUpperCase();
}

/** Split a single CSV line on `;`, honoring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ";" && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
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
  // e.g. "Hematology (Q1); Oncology (Q1)"
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

function buildIndex(): Map<string, ScimagoEntry> {
  const index = new Map<string, ScimagoEntry>();
  const csvPath = findCsvPath();
  if (!csvPath) {
    logger.warn("scimago.noCsv", { hint: "place scimagojr <year>.csv in /data" });
    return index;
  }

  try {
    const content = readFileSync(csvPath, "utf8");
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) return index;

    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const col = (name: string) => headers.findIndex((h) => h === name.toLowerCase());
    const idx = {
      sourceId: col("Sourceid"),
      title: col("Title"),
      issn: col("Issn"),
      publisher: col("Publisher"),
      openAccess: col("Open Access"),
      sjr: col("SJR"),
      quartile: col("SJR Best Quartile"),
      hIndex: col("H index"),
      country: col("Country"),
      categories: col("Categories"),
      areas: col("Areas"),
    };

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cells = splitCsvLine(lines[i]);
      const q = (cells[idx.quartile] ?? "").toUpperCase();
      const entry: ScimagoEntry = {
        sourceId: cells[idx.sourceId] ?? "",
        title: cells[idx.title] ?? "",
        quartile: /^Q[1-4]$/.test(q) ? (q as ScimagoEntry["quartile"]) : null,
        sjr: parseNumber(cells[idx.sjr]),
        hIndex: parseNumber(cells[idx.hIndex]),
        country: cells[idx.country] || null,
        publisher: cells[idx.publisher] || null,
        categories: parseCategories(cells[idx.categories]),
        areas: (cells[idx.areas] ?? "").split(";").map((a) => a.trim()).filter(Boolean),
        openAccess: cells[idx.openAccess] ? /yes/i.test(cells[idx.openAccess]) : null,
      };
      const issnRaw = cells[idx.issn] ?? "";
      for (const part of issnRaw.split(/[,\s]+/)) {
        const key = normIssn(part);
        if (key.length >= 8 && !index.has(key)) index.set(key, entry);
      }
    }
    logger.info("scimago.loaded", { entries: index.size });
  } catch (err) {
    logger.error("scimago.load", err);
  }
  return index;
}

function getIndex(): Map<string, ScimagoEntry> {
  if (!globalForScimago.__scimagoIndex) {
    globalForScimago.__scimagoIndex = buildIndex();
  }
  return globalForScimago.__scimagoIndex;
}

export const scimago = {
  /** Look up SJR data by any of the provided ISSNs (dashed or not). */
  lookup(issns: Array<string | null | undefined>): ScimagoEntry | null {
    const index = getIndex();
    for (const issn of issns) {
      if (!issn) continue;
      const hit = index.get(normIssn(issn));
      if (hit) return hit;
    }
    return null;
  },
  isLoaded(): boolean {
    return getIndex().size > 0;
  },
};
