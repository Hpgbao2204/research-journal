import type { AnalyzeRequest } from "@/lib/schemas";
import type { Candidate } from "./candidates";

/**
 * Builds the user prompt for the AI model. The model is instructed to choose
 * ONLY from the supplied candidate IDs and to return JSON matching the schema.
 * Grounding is also enforced in code after the response (hallucinated IDs are
 * dropped), so the prompt is defense-in-depth, not the sole guard.
 */
export function buildPrompt(request: AnalyzeRequest, candidates: Candidate[]): string {
  const candidateLines = candidates
    .map((c) =>
      JSON.stringify({
        venueId: c.id,
        venueType: c.venueType,
        venueName: c.name,
        field: c.field,
        keywords: c.keywords,
        indexing: c.indexing,
        submissionDeadline: c.submissionDeadline,
        submissionUrl: c.submissionUrl,
      }),
    )
    .join("\n");

  return `Analyze the following paper and recommend suitable venues.

PAPER TITLE:
${request.title}

ABSTRACT:
${request.abstract}

USER KEYWORDS: ${request.keywords.join(", ") || "(none)"}
DECLARED FIELD: ${request.field ?? "(none)"}
PREFERRED VENUE TYPE: ${request.preferredVenueType ?? "ANY"}
PREFERRED INDEXING: ${request.preferredIndexing.join(", ") || "(none)"}

CANDIDATE VENUES (choose recommendations ONLY from these venueId values):
${candidateLines || "(no candidates available)"}

Return a single JSON object with EXACTLY this shape:
{
  "analysis": {
    "mainTopic": string,
    "subfield": string,
    "methodology": string,
    "contributionType": string,
    "extractedKeywords": string[],
    "suitableDisciplines": string[]
  },
  "items": [
    {
      "venueType": "JOURNAL" | "CONFERENCE" | "SPECIAL_ISSUE",
      "venueId": string,            // MUST be one of the candidate venueId values
      "venueName": string,
      "matchScore": integer 0-100,
      "reason": string,
      "scopeAlignment": string,
      "submissionDeadline": string | null,
      "indexing": string[],
      "submissionUrl": string | null,
      "warnings": string[]
    }
  ],
  "suggestedTitle": string,
  "suggestedAbstract": string,
  "method": "AI"
}

Rules:
- Only include venues whose venueId is in the candidate list. Never invent venues.
- Order items by descending matchScore.
- Keep matchScore an integer between 0 and 100.`;
}
