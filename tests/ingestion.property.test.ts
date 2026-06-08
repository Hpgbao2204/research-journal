import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { normalize, NormalizedVenueRecordSchema } from "@/lib/ingestion";

const RUNS = 200;

function arbRaw(): fc.Arbitrary<Record<string, unknown>> {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    sourceUrl: fc.webUrl(),
    type: fc.constantFrom("CONFERENCE", "SPECIAL_ISSUE", "conference"),
    organizer: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    country: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
  });
}

describe("ingestion normalize", () => {
  // Feature: paperscout-ai, Property 21: Source normalization conforms to schema and is idempotent
  it("Property 21: normalize output conforms to the schema", () => {
    fc.assert(
      fc.property(arbRaw(), (raw) => {
        const normalized = normalize(raw);
        expect(NormalizedVenueRecordSchema.safeParse(normalized).success).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  // Feature: paperscout-ai, Property 21: Source normalization conforms to schema and is idempotent
  it("Property 21: normalize is idempotent", () => {
    fc.assert(
      fc.property(arbRaw(), (raw) => {
        const once = normalize(raw);
        const twice = normalize(once as unknown as Record<string, unknown>);
        expect(twice).toEqual(once);
      }),
      { numRuns: RUNS },
    );
  });
});
