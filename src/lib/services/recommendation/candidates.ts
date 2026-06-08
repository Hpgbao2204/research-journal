import { openAlex } from "@/lib/providers/openalex";
import { scimago } from "@/lib/providers/scimago";
import type { AnalyzeRequest, VenueType } from "@/lib/schemas";

/**
 * A venue candidate. Recommendations may ONLY reference candidates returned
 * here — the service never invents venues (grounding).
 *
 * Candidates are REAL journals only (Scimago, OpenAlex fallback). We do not
 * recommend the sample/mock conferences and special issues, because suggesting
 * fabricated venues would violate the project's data-integrity principle. When
 * real conference/CFP sources are integrated they can be added here.
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

/** Split multi-word category/area labels into lowercase tokens for matching. */
function tokenizeLabels(labels: string[]): string[] {
  const out = new Set<string>();
  for (const label of labels) {
    out.add(label.toLowerCase());
    for (const w of label.toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length > 2) out.add(w);
    }
  }
  return [...out];
}

export async function queryCandidates(request: AnalyzeRequest): Promise<Candidate[]> {
  // Only journals are recommendable today (real, verified data).
  if (request.preferredVenueType && request.preferredVenueType !== "JOURNAL") return [];

  const candidates: Candidate[] = [];
  const query = [request.field, ...request.keywords].filter(Boolean).join(" ") || request.title;

  if (scimago.isLoaded()) {
    const { items } = scimago.searchJournals({
      q: query,
      openAccess: request.openAccess,
      sort: "sjr",
      page: 1,
      pageSize: 30,
    });
    for (const j of items) {
      candidates.push({
        venueType: "JOURNAL",
        id: j.id,
        name: j.name,
        field: j.field,
        scope: j.scope,
        keywords: tokenizeLabels([...j.categories, ...j.areas]),
        indexing: j.indexing,
        submissionDeadline: null,
        submissionUrl: j.officialUrl,
        isUnverified: false,
        missingFields: j.quartile ? [] : ["quartile"],
      });
    }
  } else {
    try {
      const journals = await openAlex.searchJournals({ q: query, openAccess: request.openAccess, perPage: 30 });
      for (const j of journals) {
        candidates.push({
          venueType: "JOURNAL",
          id: j.id,
          name: j.name,
          field: j.field,
          scope: j.scope,
          keywords: tokenizeLabels(j.keywords),
          indexing: j.indexing,
          submissionDeadline: null,
          submissionUrl: j.officialUrl,
          isUnverified: false,
          missingFields: j.quartile ? [] : ["quartile"],
        });
      }
    } catch {
      // OpenAlex unavailable: no candidates.
    }
  }

  return candidates;
}
