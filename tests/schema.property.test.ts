import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AnalyzeRequestSchema, AnalysisResultSchema, MAX_ABSTRACT_LENGTH } from "@/lib/schemas";
import { ruleBasedAnalyze } from "@/lib/services/recommendation/fallback";

const RUNS = 200;

describe("analyzer input validation", () => {
  // Feature: paperscout-ai, Property 6: Empty and over-length abstracts are rejected
  it("Property 6: empty/whitespace abstracts are rejected", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\s*$/), (blank) => {
        const res = AnalyzeRequestSchema.safeParse({ title: "T", abstract: blank });
        expect(res.success).toBe(false);
      }),
      { numRuns: RUNS },
    );
  });

  // Feature: paperscout-ai, Property 6: Empty and over-length abstracts are rejected
  it("Property 6: over-length abstracts are rejected", () => {
    const tooLong = "a".repeat(MAX_ABSTRACT_LENGTH + 1);
    const res = AnalyzeRequestSchema.safeParse({ title: "T", abstract: tooLong });
    expect(res.success).toBe(false);
  });

  // Feature: paperscout-ai, Property 5: Analyzer input validation
  it("Property 5: valid requests are accepted", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        (title, abstract) => {
          const res = AnalyzeRequestSchema.safeParse({ title, abstract });
          expect(res.success).toBe(true);
        },
      ),
      { numRuns: RUNS },
    );
  });
});

describe("analysis result schema", () => {
  // Feature: paperscout-ai, Property 12: Result conforms to the analysis schema
  it("Property 12: rule-based output conforms to AnalysisResultSchema", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 300 }),
        (title, abstract) => {
          const result = ruleBasedAnalyze(
            {
              title,
              abstract,
              keywords: [],
              preferredIndexing: [],
            } as never,
            [],
          );
          expect(AnalysisResultSchema.safeParse(result).success).toBe(true);
          expect(result.method).toBe("RULE_BASED");
        },
      ),
      { numRuns: RUNS },
    );
  });
});
