import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/http/logger";

/**
 * Data ingestion module (Req 14).
 *
 * Provides the interfaces and a working core so real data sources can be added
 * later without redesign: CSV import, JSON import, source normalization,
 * duplicate detection by source URL, last-checked updates, and a stubbed future
 * crawler. The MVP wires this for Conference records (DB-backed venue type);
 * the same normalize/upsert pipeline generalizes to other venue types.
 *
 * Nothing here fabricates data — every imported record must carry a sourceUrl
 * and is tied to a DataSource.
 */

export const NormalizedVenueRecordSchema = z.object({
  kind: z.enum(["CONFERENCE", "SPECIAL_ISSUE"]),
  name: z.string().min(1),
  sourceUrl: z.string().url(),
  officialUrl: z.string().url().optional(),
  field: z.string().optional(),
  country: z.string().optional(),
  organizer: z.string().optional(),
  submissionDeadline: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NormalizedVenueRecord = z.infer<typeof NormalizedVenueRecordSchema>;
export type RawVenueRecord = Record<string, unknown>;

export interface ImportReport {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/** Map an arbitrary raw record to the normalized schema. Pure & idempotent. */
export function normalize(raw: RawVenueRecord): NormalizedVenueRecord {
  const get = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "string" && v.trim() !== "") return v.trim();
    }
    return undefined;
  };

  const candidate = {
    kind: (get("kind", "type")?.toUpperCase() === "SPECIAL_ISSUE"
      ? "SPECIAL_ISSUE"
      : "CONFERENCE") as NormalizedVenueRecord["kind"],
    name: get("name", "title") ?? "",
    sourceUrl: get("sourceUrl", "source_url", "url") ?? "",
    officialUrl: get("officialUrl", "official_url", "website"),
    field: get("field", "discipline"),
    country: get("country", "region"),
    organizer: get("organizer", "publisher"),
    submissionDeadline: get("submissionDeadline", "submission_deadline", "deadline"),
    metadata: undefined,
  };

  return NormalizedVenueRecordSchema.parse(candidate);
}

/** Resolve (or create) a DataSource by name. */
async function resolveDataSource(sourceId: string, reliability: string): Promise<string> {
  const existing = await prisma.dataSource.findFirst({ where: { name: sourceId } });
  if (existing) return existing.id;
  const created = await prisma.dataSource.create({
    data: { name: sourceId, reliability },
  });
  return created.id;
}

/**
 * Upsert a normalized record by (dataSourceId, sourceUrl). Updates an existing
 * record (and lastCheckedAt) rather than creating a duplicate (Req 14.4, 14.5).
 */
export async function upsertBySourceUrl(
  record: NormalizedVenueRecord,
  dataSourceId: string,
): Promise<"created" | "updated"> {
  const now = new Date();
  if (record.kind === "CONFERENCE") {
    const existing = await prisma.conference.findUnique({
      where: { dataSourceId_sourceUrl: { dataSourceId, sourceUrl: record.sourceUrl } },
    });
    const data = {
      name: record.name,
      organizer: record.organizer ?? null,
      country: record.country ?? null,
      submissionDeadline: record.submissionDeadline ?? null,
      officialUrl: record.officialUrl ?? record.sourceUrl,
      lastCheckedAt: now,
      verificationStatus: "IMPORTED" as const,
    };
    if (existing) {
      await prisma.conference.update({ where: { id: existing.id }, data });
      return "updated";
    }
    await prisma.conference.create({
      data: { ...data, sourceUrl: record.sourceUrl, dataSourceId },
    });
    return "created";
  }

  // SPECIAL_ISSUE
  const existing = await prisma.specialIssue.findUnique({
    where: { dataSourceId_sourceUrl: { dataSourceId, sourceUrl: record.sourceUrl } },
  });
  const data = {
    title: record.name,
    publisher: record.organizer ?? null,
    submissionDeadline: record.submissionDeadline ?? null,
    officialUrl: record.officialUrl ?? record.sourceUrl,
    lastCheckedAt: now,
    verificationStatus: "IMPORTED" as const,
  };
  if (existing) {
    await prisma.specialIssue.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.specialIssue.create({
    data: { ...data, sourceUrl: record.sourceUrl, dataSourceId },
  });
  return "created";
}

async function importRecords(
  rawRecords: RawVenueRecord[],
  sourceName: string,
  reliability: string,
): Promise<ImportReport> {
  const report: ImportReport = { created: 0, updated: 0, skipped: 0, errors: [] };
  const dataSourceId = await resolveDataSource(sourceName, reliability);

  for (const raw of rawRecords) {
    try {
      const normalized = normalize(raw);
      const result = await upsertBySourceUrl(normalized, dataSourceId);
      report[result] += 1;
    } catch (err) {
      report.skipped += 1;
      report.errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  logger.info("ingestion.import", { sourceName, ...report, errors: report.errors.length });
  return report;
}

/** Parse a CSV string (header row + comma-separated values) into raw records. */
export function parseCsv(csv: string): RawVenueRecord[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const rec: RawVenueRecord = {};
    headers.forEach((h, i) => (rec[h] = cells[i] ?? ""));
    return rec;
  });
}

export const ingestion = {
  normalize,
  parseCsv,
  upsertBySourceUrl,

  /** Import venue records from a CSV string (Req 14.1). */
  importCsv(csv: string, sourceName = "imported-csv"): Promise<ImportReport> {
    return importRecords(parseCsv(csv), sourceName, "imported-csv");
  },

  /** Import venue records from a JSON array (Req 14.2). */
  importJson(records: unknown[], sourceName = "imported-json"): Promise<ImportReport> {
    return importRecords(records as RawVenueRecord[], sourceName, "imported-json");
  },

  /**
   * Future crawler entry point. Returns raw records to feed the same
   * normalize/upsert pipeline. Intentionally NOT implemented in the MVP — it
   * must never fabricate data. Wire a real source (e.g. an authorized CFP feed)
   * here later.
   */
  async fetchAndParse(_sourceConfig: { url: string }): Promise<RawVenueRecord[]> {
    throw new Error(
      "Crawler not implemented. Provide an authorized data source before enabling crawling.",
    );
  },
};
