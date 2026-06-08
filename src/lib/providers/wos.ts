import { readFileSync } from "node:fs";
import path from "node:path";
import { logger } from "@/lib/http/logger";

/**
 * Web of Science Master Journal List provider.
 *
 * Loads `data/wos_master_journal_list.csv` (Title, Publisher, Address, Core
 * Collection) once into memory and exposes, per normalized journal title, the
 * set of WoS Core Collection indexes the journal belongs to (SCIE, SSCI, AHCI,
 * ESCI, …). This lets the catalogue report REAL indexing rather than a static
 * "Scopus" label, which in turn makes the "preferred indexing" filter and the
 * recommendation indexing signal meaningful.
 *
 * The WoS file has no ISSN, so journals are joined to the Scimago catalogue by
 * normalized title. This is a best-effort, real-data enrichment: an unmatched
 * title simply yields no extra indexing.
 */

interface WosData {
  byTitle: Map<string, string[]>;
}

const globalForWos = globalThis as unknown as { __wos?: WosData };

/** Map a full WoS Core Collection name to its common abbreviation. */
const INDEX_ABBREV: Array<[RegExp, string]> = [
  [/science citation index expanded/i, "SCIE"],
  [/social sciences citation index/i, "SSCI"],
  [/arts\s*&?\s*humanities citation index/i, "AHCI"],
  [/emerging sources citation index/i, "ESCI"],
];

function abbreviateCollection(raw: string): string[] {
  const out = new Set<string>();
  // Multiple memberships are pipe-separated in the source file.
  for (const part of raw.split("|").map((p) => p.trim()).filter(Boolean)) {
    const known = INDEX_ABBREV.find(([re]) => re.test(part));
    if (known) out.add(known[1]);
    else out.add(part); // keep specialized indexes (Zoological Record, BIOSIS…) verbatim
  }
  return [...out];
}

/** Normalize a journal title for cross-source joining (case/punctuation-insensitive). */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function build(): WosData {
  const data: WosData = { byTitle: new Map() };
  const csvPath = path.join(process.cwd(), "data", "wos_master_journal_list.csv");
  let content: string;
  try {
    content = readFileSync(csvPath, "utf8");
  } catch {
    logger.warn("wos.noCsv", { hint: "place wos_master_journal_list.csv in /data" });
    return data;
  }

  try {
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) return data;
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const titleIdx = headers.indexOf("title");
    const collIdx = headers.indexOf("core collection");
    if (titleIdx < 0 || collIdx < 0) {
      logger.warn("wos.badHeaders", { headers });
      return data;
    }

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCsvLine(lines[i]);
      const title = cols[titleIdx];
      const coll = cols[collIdx];
      if (!title || !coll) continue;
      const key = normalizeTitle(title);
      if (!key) continue;
      const indexes = abbreviateCollection(coll);
      const existing = data.byTitle.get(key);
      if (existing) {
        for (const ix of indexes) if (!existing.includes(ix)) existing.push(ix);
      } else {
        data.byTitle.set(key, indexes);
      }
    }
    logger.info("wos.loaded", { journals: data.byTitle.size });
  } catch (err) {
    logger.error("wos.load", err);
  }
  return data;
}

function getData(): WosData {
  if (!globalForWos.__wos) globalForWos.__wos = build();
  return globalForWos.__wos;
}

export const wos = {
  isLoaded(): boolean {
    return getData().byTitle.size > 0;
  },

  /** WoS Core Collection indexes for a journal title, or [] if not found. */
  indexesForTitle(title: string): string[] {
    return getData().byTitle.get(normalizeTitle(title)) ?? [];
  },
};
