import { prisma } from "@/lib/db/prisma";
import type { AnalyzeRequest, VenueType } from "@/lib/schemas";

/**
 * A venue candidate drawn from the database. Recommendations may ONLY reference
 * candidates returned here — the service never invents venues (grounding).
 */
export interface Candidate {
  venueType: VenueType;
  id: string;
  name: string;
  field: string | null;
  scope: string | null;
  keywords: string[];
  indexing: string[];
  submissionDeadline: Date | null;
  submissionUrl: string | null;
  isUnverified: boolean;
  /** Names of fields that are null/unverified (used to derive warnings). */
  missingFields: string[];
}

function missing(record: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((f) => {
    const v = record[f];
    return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  });
}

/**
 * Load candidate venues from the database, restricted to the preferred venue
 * type when supplied (Req 6.5, 7.2). Candidates are the only universe from
 * which recommendations may be drawn.
 */
export async function queryCandidates(request: AnalyzeRequest): Promise<Candidate[]> {
  const want = (t: VenueType) => !request.preferredVenueType || request.preferredVenueType === t;
  const candidates: Candidate[] = [];

  if (want("JOURNAL")) {
    const rows = await prisma.journal.findMany({
      include: { field: true, keywords: true },
    });
    for (const j of rows) {
      candidates.push({
        venueType: "JOURNAL",
        id: j.id,
        name: j.name,
        field: j.field?.name ?? null,
        scope: j.scope,
        keywords: j.keywords.map((k) => k.term),
        indexing: j.indexing,
        submissionDeadline: j.submissionDeadline,
        submissionUrl: j.submissionUrl,
        isUnverified: j.verificationStatus === "UNVERIFIED_MOCK",
        missingFields: missing(j as unknown as Record<string, unknown>, [
          "publisher", "issn", "quartile", "impactFactor", "apc", "submissionDeadline",
        ]),
      });
    }
  }

  if (want("CONFERENCE")) {
    const rows = await prisma.conference.findMany({
      include: { field: true, keywords: true },
    });
    for (const c of rows) {
      candidates.push({
        venueType: "CONFERENCE",
        id: c.id,
        name: c.name,
        field: c.field?.name ?? null,
        scope: null,
        keywords: c.keywords.map((k) => k.term),
        indexing: c.indexing,
        submissionDeadline: c.submissionDeadline,
        submissionUrl: c.cfpUrl,
        isUnverified: c.verificationStatus === "UNVERIFIED_MOCK",
        missingFields: missing(c as unknown as Record<string, unknown>, [
          "organizer", "location", "ranking", "submissionDeadline", "conferenceDate",
        ]),
      });
    }
  }

  if (want("SPECIAL_ISSUE")) {
    const rows = await prisma.specialIssue.findMany({
      include: { field: true, keywords: true },
    });
    for (const s of rows) {
      candidates.push({
        venueType: "SPECIAL_ISSUE",
        id: s.id,
        name: s.title,
        field: s.field?.name ?? null,
        scope: s.topicScope,
        keywords: s.keywords.map((k) => k.term),
        indexing: [],
        submissionDeadline: s.submissionDeadline,
        submissionUrl: s.submissionUrl,
        isUnverified: s.verificationStatus === "UNVERIFIED_MOCK",
        missingFields: missing(s as unknown as Record<string, unknown>, [
          "publisher", "guestEditors", "submissionDeadline", "publicationTimeline",
        ]),
      });
    }
  }

  return candidates;
}
