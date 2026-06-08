import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  computeSignals,
  scoreFromSignals,
  ruleBasedAnalyze,
} from "@/lib/services/recommendation/fallback";
import type { Candidate } from "@/lib/services/recommendation/candidates";
import type { AnalyzeRequest } from "@/lib/schemas";

const RUNS = 200;

function arbCandidate(): fc.Arbitrary<Candidate> {
  return fc.record({
    venueType: fc.constantFrom("JOURNAL", "CONFERENCE", "SPECIAL_ISSUE") as fc.Arbitrary<Candidate["venueType"]>,
    id: fc.string({ minLength: 1, maxLength: 8 }).map((s) => "V" + s),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    field: fc.option(fc.string({ minLength: 1, maxLength: 12 }), { nil: null }),
    scope: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
    keywords: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 6 }),
    indexing: fc.array(fc.constantFrom("Scopus", "IEEE", "ACM"), { maxLength: 3 }),
    submissionDeadline: fc.option(fc.date({ min: new Date(2000, 0, 1), max: new Date(2030, 0, 1) }), { nil: null }),
    submissionUrl: fc.option(fc.webUrl(), { nil: null }),
    isUnverified: fc.boolean(),
    missingFields: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 4 }),
  });
}

function arbRequest(): fc.Arbitrary<AnalyzeRequest> {
  return fc.record({
    title: fc.string({ minLength: 1, maxLength: 50 }),
    abstract: fc.string({ minLength: 1, maxLength: 300 }),
    keywords: fc.array(fc.string({ minLength: 1, maxLength: 12 }), { maxLength: 8 }),
    field: fc.option(fc.string({ minLength: 1, maxLength: 12 }), { nil: undefined }),
    preferredVenueType: fc.constant(undefined),
    preferredIndexing: fc.array(fc.constantFrom("Scopus", "IEEE"), { maxLength: 2 }),
    preferredDeadlineFrom: fc.constant(undefined),
    preferredDeadlineTo: fc.constant(undefined),
    openAccess: fc.constant(undefined),
  }) as fc.Arbitrary<AnalyzeRequest>;
}

describe("rule-based fallback", () => {
  // Feature: paperscout-ai, Property 9: Match score is an integer in [0, 100]
  it("Property 9: every match score is an integer in [0,100]", () => {
    fc.assert(
      fc.property(arbRequest(), fc.array(arbCandidate(), { maxLength: 10 }), (req, cands) => {
        const result = ruleBasedAnalyze(req, cands);
        for (const item of result.items) {
          expect(Number.isInteger(item.matchScore)).toBe(true);
          expect(item.matchScore).toBeGreaterThanOrEqual(0);
          expect(item.matchScore).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: RUNS },
    );
  });

  // Feature: paperscout-ai, Property 14: Recommendation items are ordered by descending match score
  it("Property 14: items are ordered by descending match score", () => {
    fc.assert(
      fc.property(arbRequest(), fc.array(arbCandidate(), { maxLength: 10 }), (req, cands) => {
        const result = ruleBasedAnalyze(req, cands);
        for (let i = 1; i < result.items.length; i++) {
          expect(result.items[i - 1].matchScore).toBeGreaterThanOrEqual(result.items[i].matchScore);
        }
      }),
      { numRuns: RUNS },
    );
  });

  // Feature: paperscout-ai, Property 16: Fallback scoring determinism and monotonicity
  it("Property 16: identical inputs produce identical results (determinism)", () => {
    fc.assert(
      fc.property(arbRequest(), fc.array(arbCandidate(), { maxLength: 8 }), (req, cands) => {
        const now = new Date(2025, 0, 1);
        const a = ruleBasedAnalyze(req, cands, now);
        const b = ruleBasedAnalyze(req, cands, now);
        expect(a).toEqual(b);
      }),
      { numRuns: RUNS },
    );
  });

  // Feature: paperscout-ai, Property 16: Fallback scoring determinism and monotonicity
  it("Property 16: increasing keyword overlap does not decrease score (other signals fixed)", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 2, maxLength: 8 }),
        (kws) => {
          const disciplines = ["X"];
          const preferred: string[] = [];
          const now = new Date(2025, 0, 1);
          const base: Candidate = {
            venueType: "JOURNAL",
            id: "V1",
            name: "V",
            field: "Y",
            scope: null,
            keywords: [],
            indexing: [],
            submissionDeadline: null,
            submissionUrl: null,
            isUnverified: false,
            missingFields: [],
          };
          // Same field/deadline/indexing signals; only keyword overlap grows.
          const few = { ...base, keywords: kws.slice(0, 1) };
          const many = { ...base, keywords: kws };
          const sFew = scoreFromSignals(computeSignals(kws, disciplines, preferred, few, now));
          const sMany = scoreFromSignals(computeSignals(kws, disciplines, preferred, many, now));
          expect(sMany).toBeGreaterThanOrEqual(sFew);
        },
      ),
      { numRuns: RUNS },
    );
  });

  // Feature: paperscout-ai, Property 8: Recommendations are grounded in the database
  it("Property 8: every item references a candidate id", () => {
    fc.assert(
      fc.property(arbRequest(), fc.array(arbCandidate(), { maxLength: 10 }), (req, cands) => {
        const ids = new Set(cands.map((c) => c.id));
        const result = ruleBasedAnalyze(req, cands);
        for (const item of result.items) {
          expect(ids.has(item.venueId)).toBe(true);
        }
      }),
      { numRuns: RUNS },
    );
  });
});
