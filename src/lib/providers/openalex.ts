import { logger } from "@/lib/http/logger";
import { scimago } from "@/lib/providers/scimago";
import type { JournalDTO, PaperDTO, DataSourceDTO } from "@/lib/dto";

/**
 * OpenAlex provider (https://openalex.org) — a free, no-API-key catalogue of
 * hundreds of millions of scholarly sources and works. We use it as a LIVE
 * data source for journals and papers so the app reflects the real corpus
 * rather than hand-built sample data.
 *
 * Data integrity: every record is attributed to OpenAlex (its source/work URL
 * is the sourceUrl) and is real data, so it is NOT labelled unverified mock.
 * We use the "polite pool" by sending a mailto parameter.
 */

const BASE = "https://api.openalex.org";
const MAILTO = process.env.OPENALEX_MAILTO?.trim() || "paperscout@example.org";
const TIMEOUT_MS = Number(process.env.OPENALEX_TIMEOUT_MS ?? "12000");

const OPENALEX_SOURCE: DataSourceDTO = {
  id: "openalex",
  name: "OpenAlex",
  reliability: "external-api-openalex",
};

/** Short id from an OpenAlex URL, e.g. "https://openalex.org/S123" -> "S123". */
export function shortId(openAlexId: string | null | undefined): string {
  if (!openAlexId) return "";
  return openAlexId.replace(/^https?:\/\/openalex\.org\//, "");
}

function isOpenAlexId(id: string): boolean {
  return /^[SW]\d+$/i.test(id);
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": `PaperScout/0.1 (mailto:${MAILTO})` },
    });
    if (!res.ok) {
      logger.warn("openalex.http", { status: res.status });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    logger.error("openalex.fetch", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// OpenAlex response shapes (only fields we use)
// ---------------------------------------------------------------------------

interface OASource {
  id: string;
  display_name: string;
  issn_l?: string | null;
  issn?: string[] | null;
  host_organization_name?: string | null;
  homepage_url?: string | null;
  is_oa?: boolean | null;
  country_code?: string | null;
  apc_usd?: number | null;
  summary_stats?: { h_index?: number; "2yr_mean_citedness"?: number } | null;
  topics?: Array<{ display_name: string }> | null;
  x_concepts?: Array<{ display_name: string }> | null;
}

interface OAWork {
  id: string;
  display_name?: string | null;
  title?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  authorships?: Array<{ author?: { display_name?: string } }> | null;
  primary_location?: { source?: { display_name?: string } | null } | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  topics?: Array<{ display_name: string }> | null;
}

interface OAList<T> {
  results?: T[];
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function sourceToJournalDTO(s: OASource): JournalDTO {
  const id = shortId(s.id);
  const concepts = (s.topics ?? s.x_concepts ?? []).map((c) => c.display_name).filter(Boolean);
  const if2yr = s.summary_stats?.["2yr_mean_citedness"];

  // Enrich with Scimago (SJR) by ISSN: real quartile, SJR score, H-index.
  const sjr = scimago.lookup([s.issn_l, ...(s.issn ?? [])]);
  const indexing = ["OpenAlex"];
  if (sjr) indexing.unshift("Scopus"); // Scimago is built on Scopus coverage
  const keywords = [...new Set([...(sjr?.categories ?? []), ...concepts])].slice(0, 12);

  return {
    id,
    name: s.display_name,
    publisher: s.host_organization_name ?? sjr?.publisher ?? null,
    issn: s.issn_l ?? (s.issn?.[0] ?? null),
    eissn: s.issn && s.issn.length > 1 ? s.issn[1] : null,
    field: sjr?.areas[0] ?? concepts[0] ?? null,
    scope:
      sjr && sjr.categories.length > 0
        ? `Scimago categories: ${sjr.categories.slice(0, 6).join(", ")}.`
        : concepts.length > 0
          ? `Topics: ${concepts.slice(0, 6).join(", ")}.`
          : null,
    indexing,
    quartile: sjr?.quartile ?? null,
    impactFactor: typeof if2yr === "number" ? Math.round(if2yr * 100) / 100 : null,
    sjr: sjr?.sjr ?? null,
    hIndex: sjr?.hIndex ?? null,
    areas: sjr?.areas ?? [],
    categories: sjr?.categories ?? [],
    apc: s.apc_usd ?? null,
    openAccess: s.is_oa ?? sjr?.openAccess ?? null,
    submissionUrl: null,
    submissionDeadline: null,
    country: s.country_code ?? sjr?.country ?? null,
    notes:
      sjr?.sjr != null || sjr?.hIndex != null
        ? `SJR: ${sjr?.sjr ?? "n/a"} · H-index: ${sjr?.hIndex ?? "n/a"} (Scimago).`
        : null,
    keywords,
    // provenance
    sourceUrl: s.id,
    officialUrl: s.homepage_url ?? null,
    dataSource: sjr
      ? { id: "openalex-scimago", name: "OpenAlex + Scimago", reliability: "external-api" }
      : OPENALEX_SOURCE,
    verificationStatus: "IMPORTED",
    isUnverified: false,
    lastCheckedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function reconstructAbstract(inv: Record<string, number[]> | null | undefined): string | null {
  if (!inv) return null;
  const words: Array<{ pos: number; word: string }> = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const p of positions) words.push({ pos: p, word });
  }
  if (words.length === 0) return null;
  words.sort((a, b) => a.pos - b.pos);
  return words.map((w) => w.word).join(" ").slice(0, 2000);
}

function workToPaperDTO(w: OAWork): PaperDTO {
  const id = shortId(w.id);
  const authors = (w.authorships ?? [])
    .map((a) => a.author?.display_name)
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");
  const concepts = (w.topics ?? []).map((c) => c.display_name).filter(Boolean);
  return {
    id,
    title: w.display_name ?? w.title ?? "Untitled",
    abstract: reconstructAbstract(w.abstract_inverted_index),
    authors: authors || null,
    field: concepts[0] ?? null,
    venueName: w.primary_location?.source?.display_name ?? null,
    year: w.publication_year ?? null,
    doi: w.doi ?? null,
    keywords: concepts.slice(0, 8),
    sourceUrl: w.id,
    officialUrl: w.doi ?? null,
    dataSource: OPENALEX_SOURCE,
    verificationStatus: "IMPORTED",
    isUnverified: false,
    lastCheckedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface JournalQuery {
  q?: string;
  field?: string;
  openAccess?: boolean;
  country?: string;
  publisher?: string;
  perPage?: number;
}

export const openAlex = {
  isOpenAlexId,

  async searchJournals(query: JournalQuery): Promise<JournalDTO[]> {
    const filters = ["type:journal"];
    if (query.openAccess !== undefined) filters.push(`is_oa:${query.openAccess}`);
    if (query.country) filters.push(`country_code:${query.country.toLowerCase()}`);

    const params = new URLSearchParams();
    params.set("filter", filters.join(","));
    if (query.q) params.set("search", query.q);
    params.set("per-page", String(Math.min(query.perPage ?? 25, 50)));
    params.set("sort", "works_count:desc");
    params.set("mailto", MAILTO);

    const data = await getJson<OAList<OASource>>(`${BASE}/sources?${params.toString()}`);
    let journals = (data?.results ?? []).map(sourceToJournalDTO);

    // Post-filter for fields OpenAlex can't filter precisely.
    if (query.field) {
      const f = query.field.toLowerCase();
      journals = journals.filter(
        (j) => j.field?.toLowerCase().includes(f) || j.keywords.some((k) => k.toLowerCase().includes(f)),
      );
    }
    if (query.publisher) {
      const p = query.publisher.toLowerCase();
      journals = journals.filter((j) => j.publisher?.toLowerCase().includes(p));
    }
    return journals;
  },

  async getJournal(id: string): Promise<JournalDTO | null> {
    if (!isOpenAlexId(id)) return null;
    const s = await getJson<OASource>(`${BASE}/sources/${id}?mailto=${MAILTO}`);
    return s ? sourceToJournalDTO(s) : null;
  },

  /** Find an OpenAlex source by ISSN (for homepage/scope enrichment). */
  async findJournalByIssn(issn: string): Promise<JournalDTO | null> {
    const clean = issn.trim();
    if (!clean) return null;
    const data = await getJson<OAList<OASource>>(
      `${BASE}/sources?filter=issn:${encodeURIComponent(clean)}&per-page=1&mailto=${MAILTO}`,
    );
    const s = data?.results?.[0];
    return s ? sourceToJournalDTO(s) : null;
  },

  async searchPapers(q: string | undefined, perPage = 25): Promise<PaperDTO[]> {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    params.set("per-page", String(Math.min(perPage, 50)));
    params.set("mailto", MAILTO);
    const data = await getJson<OAList<OAWork>>(`${BASE}/works?${params.toString()}`);
    return (data?.results ?? []).map(workToPaperDTO);
  },
};
