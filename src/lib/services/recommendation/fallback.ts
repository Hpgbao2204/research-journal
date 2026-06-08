import type { AnalyzeRequest, Analysis, AnalysisResult, RecommendationItemDTO } from "@/lib/schemas";
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

const W_KEYWORD = 0.5;
const W_FIELD = 0.15;
const W_DEADLINE = 0.1;
const W_INDEXING = 0.1;
const W_QUARTILE = 0.15;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

const QUARTILE_SCORE: Record<string, number> = { Q1: 1, Q2: 0.7, Q3: 0.4, Q4: 0.2 };

export interface ScoreSignals {
  keywordOverlap: number;
  fieldMatch: number;
  deadlineAvail: number;
  indexingMatch: number;
  quartileScore: number;
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

  const quartileScore = candidate.quartile ? (QUARTILE_SCORE[candidate.quartile] ?? 0) : 0;

  return { keywordOverlap, fieldMatch, deadlineAvail, indexingMatch, quartileScore };
}

export function scoreFromSignals(s: ScoreSignals): number {
  const raw =
    W_KEYWORD * s.keywordOverlap +
    W_FIELD * s.fieldMatch +
    W_DEADLINE * s.deadlineAvail +
    W_INDEXING * s.indexingMatch +
    W_QUARTILE * s.quartileScore;
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

/**
 * Score and rank candidates against a given analysis. Shared by the rule-based
 * fallback and the AI path (which only supplies a richer `analysis`), so the
 * venue list is always grounded, deterministic, and schema-valid regardless of
 * whether the LLM was used. Returns items sorted by descending matchScore.
 */
export function buildItems(
  request: AnalyzeRequest,
  candidates: Candidate[],
  analysis: Analysis,
  now: Date = new Date(),
): RecommendationItemDTO[] {
  const items: RecommendationItemDTO[] = candidates.map((c) => {
    const signals = computeSignals(
      analysis.extractedKeywords,
      analysis.suitableDisciplines,
      request.preferredIndexing,
      c,
      now,
    );
    let score = scoreFromSignals(signals);
    // Bonus when the venue matches the author's preferred quartile.
    if (request.preferredQuartile && c.quartile === request.preferredQuartile) {
      score = Math.min(100, score + 8);
    }
    return {
      venueType: c.venueType,
      venueId: c.id,
      venueName: c.name,
      matchScore: score,
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
  return items;
}

/** Produce a full, schema-valid AnalysisResult deterministically. */
export function ruleBasedAnalyze(
  request: AnalyzeRequest,
  candidates: Candidate[],
  now: Date = new Date(),
): AnalysisResult {
  const analysis = extractAnalysis(request);
  const items = buildItems(request, candidates, analysis, now);

  const topField = analysis.suitableDisciplines[0] ?? request.field ?? "your field";
  return {
    analysis,
    items,
    suggestedTitle: `Consider foregrounding "${analysis.mainTopic}" and your contribution type (${analysis.contributionType}) in the title.`,
    suggestedAbstract: `To better match ${topField} venues, state the problem, method (${analysis.methodology}), and quantified results explicitly in the abstract, and include the key terms: ${analysis.extractedKeywords.slice(0, 5).join(", ")}.`,
    method: "RULE_BASED",
  };
}
