import type { AnalyzeRequest, AnalysisResult, RecommendationItemDTO } from "@/lib/schemas";
import { extractAnalysis, tokenize } from "./extract";
import type { Candidate } from "./candidates";

/**
 * Deterministic rule-based recommendation. Pure: identical inputs yield
 * identical output. Match score is a weighted, normalized integer in [0,100]:
 *
 *   keywordOverlap = |abstractKw ∩ venueKw| / max(1, |abstractKw|)
 *   fieldMatch     = 1 if venue.field ∈ suitableDisciplines else 0
 *   deadlineAvail  = 1 if venue has a future submission deadline else 0
 *   indexingMatch  = 1 if preferredIndexing ⊆ venue.indexing (or no preference)
 *
 *   raw   = 0.45*kw + 0.25*field + 0.15*deadline + 0.15*indexing
 *   score = round(clamp(raw,0,1) * 100)
 */

const W_KEYWORD = 0.45;
const W_FIELD = 0.25;
const W_DEADLINE = 0.15;
const W_INDEXING = 0.15;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export interface ScoreSignals {
  keywordOverlap: number;
  fieldMatch: number;
  deadlineAvail: number;
  indexingMatch: number;
}

export function computeSignals(
  abstractKeywords: string[],
  suitableDisciplines: string[],
  preferredIndexing: string[],
  candidate: Candidate,
  now: Date,
): ScoreSignals {
  const abstractSet = new Set(abstractKeywords.map((k) => k.toLowerCase()));
  const venueTokens = new Set(
    [...candidate.keywords, ...(candidate.scope ? tokenize(candidate.scope) : [])].map((k) =>
      k.toLowerCase(),
    ),
  );
  let overlap = 0;
  for (const k of abstractSet) if (venueTokens.has(k)) overlap += 1;
  const keywordOverlap = abstractSet.size === 0 ? 0 : overlap / abstractSet.size;

  const fieldMatch = candidate.field && suitableDisciplines.includes(candidate.field) ? 1 : 0;

  const deadlineAvail =
    candidate.submissionDeadline && candidate.submissionDeadline.getTime() > now.getTime() ? 1 : 0;

  const indexingMatch =
    preferredIndexing.length === 0
      ? 1
      : preferredIndexing.every((ix) =>
        candidate.indexing.some((c) => c.toLowerCase() === ix.toLowerCase()),
      )
        ? 1
        : 0;

  return { keywordOverlap, fieldMatch, deadlineAvail, indexingMatch };
}

export function scoreFromSignals(s: ScoreSignals): number {
  const raw =
    W_KEYWORD * s.keywordOverlap +
    W_FIELD * s.fieldMatch +
    W_DEADLINE * s.deadlineAvail +
    W_INDEXING * s.indexingMatch;
  return Math.round(clamp01(raw) * 100);
}

function warningsFor(candidate: Candidate): string[] {
  const w: string[] = [];
  if (candidate.isUnverified) {
    w.push("This venue is unverified sample data — confirm details on the official site.");
  }
  for (const f of candidate.missingFields) {
    w.push(`Missing or unverified field: ${f}.`);
  }
  return w;
}

function reasonFor(s: ScoreSignals, candidate: Candidate): string {
  const parts: string[] = [];
  if (s.keywordOverlap > 0) parts.push(`overlapping keywords with the venue's topics`);
  if (s.fieldMatch) parts.push(`field match (${candidate.field})`);
  if (s.deadlineAvail) parts.push("an open future submission deadline");
  if (s.indexingMatch && candidate.indexing.length > 0)
    parts.push(`indexing in ${candidate.indexing.join(", ")}`);
  return parts.length > 0
    ? `Recommended due to ${parts.join(", ")}.`
    : "Weak match; listed for completeness.";
}

/** Produce a full, schema-valid AnalysisResult deterministically. */
export function ruleBasedAnalyze(
  request: AnalyzeRequest,
  candidates: Candidate[],
  now: Date = new Date(),
): AnalysisResult {
  const analysis = extractAnalysis(request);

  const items: RecommendationItemDTO[] = candidates.map((c) => {
    const signals = computeSignals(
      analysis.extractedKeywords,
      analysis.suitableDisciplines,
      request.preferredIndexing,
      c,
      now,
    );
    return {
      venueType: c.venueType,
      venueId: c.id,
      venueName: c.name,
      matchScore: scoreFromSignals(signals),
      reason: reasonFor(signals, c),
      scopeAlignment: c.scope ?? c.field ?? "Scope information unavailable.",
      submissionDeadline: c.submissionDeadline,
      indexing: c.indexing,
      submissionUrl: c.submissionUrl,
      warnings: warningsFor(c),
    };
  });

  // Order by descending match score (stable on name for ties).
  items.sort((a, b) => b.matchScore - a.matchScore || a.venueName.localeCompare(b.venueName));

  const topField = analysis.suitableDisciplines[0] ?? request.field ?? "your field";
  return {
    analysis,
    items,
    suggestedTitle: `Consider foregrounding "${analysis.mainTopic}" and your contribution type (${analysis.contributionType}) in the title.`,
    suggestedAbstract: `To better match ${topField} venues, state the problem, method (${analysis.methodology}), and quantified results explicitly in the abstract, and include the key terms: ${analysis.extractedKeywords.slice(0, 5).join(", ")}.`,
    method: "RULE_BASED",
  };
}
