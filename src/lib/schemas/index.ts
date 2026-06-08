import { z } from "zod";

/**
 * Shared Zod schemas — the single source of truth for API input validation,
 * AI output validation, and form validation (React Hook Form). These are
 * imported by both client and server code, so they must not import server-only
 * modules.
 */

// ---------------------------------------------------------------------------
// Enums (mirror the Prisma enums)
// ---------------------------------------------------------------------------

export const VenueTypeSchema = z.enum([
  "JOURNAL",
  "CONFERENCE",
  "SPECIAL_ISSUE",
]);
export type VenueType = z.infer<typeof VenueTypeSchema>;

export const ContentTypeSchema = z.enum([
  "JOURNAL",
  "CONFERENCE",
  "SPECIAL_ISSUE",
  "PAPER",
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const QuartileSchema = z.enum(["Q1", "Q2", "Q3", "Q4"]);
export const RecommendationMethodSchema = z.enum(["AI", "RULE_BASED"]);
export type RecommendationMethod = z.infer<typeof RecommendationMethodSchema>;

export const VerificationStatusSchema = z.enum([
  "UNVERIFIED_MOCK",
  "IMPORTED",
  "VERIFIED",
]);

export const LifecycleStatusSchema = z.enum(["OPEN", "CLOSED", "UPCOMING"]);

// ---------------------------------------------------------------------------
// Search params (GET /api/search)
// ---------------------------------------------------------------------------

export const SearchParamsSchema = z
  .object({
    q: z.string().trim().optional(),
    contentType: ContentTypeSchema.optional(),
    field: z.string().trim().optional(),
    indexing: z.string().trim().optional(),
    openAccess: z.coerce.boolean().optional(),
    apcMin: z.coerce.number().int().nonnegative().optional(),
    apcMax: z.coerce.number().int().nonnegative().optional(),
    quartile: QuartileSchema.optional(),
    publisher: z.string().trim().optional(),
    country: z.string().trim().optional(),
    deadlineFrom: z.coerce.date().optional(),
    deadlineTo: z.coerce.date().optional(),
    confDateFrom: z.coerce.date().optional(),
    confDateTo: z.coerce.date().optional(),
  })
  .refine(
    (p) => p.apcMin == null || p.apcMax == null || p.apcMin <= p.apcMax,
    { message: "apcMin must be <= apcMax", path: ["apcMin"] },
  )
  .refine(
    (p) =>
      p.deadlineFrom == null ||
      p.deadlineTo == null ||
      p.deadlineFrom <= p.deadlineTo,
    { message: "deadlineFrom must be <= deadlineTo", path: ["deadlineFrom"] },
  );

export type SearchParams = z.infer<typeof SearchParamsSchema>;

// ---------------------------------------------------------------------------
// Abstract analyzer request (POST /api/analyze-abstract)
// ---------------------------------------------------------------------------

export const MAX_ABSTRACT_LENGTH = 8000;

export const AnalyzeRequestSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  abstract: z
    .string()
    .trim()
    .min(1, "Abstract is required")
    .max(MAX_ABSTRACT_LENGTH, `Abstract must be at most ${MAX_ABSTRACT_LENGTH} characters`),
  keywords: z.array(z.string().trim().min(1)).max(50).default([]),
  field: z.string().trim().optional(),
  preferredVenueType: VenueTypeSchema.optional(),
  preferredIndexing: z.array(z.string().trim().min(1)).max(20).default([]),
  preferredDeadlineFrom: z.coerce.date().optional(),
  preferredDeadlineTo: z.coerce.date().optional(),
  openAccess: z.boolean().optional(),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// ---------------------------------------------------------------------------
// Analysis result (AI output + rule-based output share this shape)
// ---------------------------------------------------------------------------

export const RecommendationItemSchema = z.object({
  venueType: VenueTypeSchema,
  venueId: z.string().min(1),
  venueName: z.string().min(1),
  matchScore: z.number().int().min(0).max(100),
  reason: z.string().min(1),
  scopeAlignment: z.string(),
  submissionDeadline: z.coerce.date().nullable(),
  indexing: z.array(z.string()),
  submissionUrl: z.string().nullable(),
  warnings: z.array(z.string()),
});

export type RecommendationItemDTO = z.infer<typeof RecommendationItemSchema>;

export const AnalysisSchema = z.object({
  mainTopic: z.string(),
  subfield: z.string(),
  methodology: z.string(),
  contributionType: z.string(),
  extractedKeywords: z.array(z.string()),
  suitableDisciplines: z.array(z.string()),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export const AnalysisResultSchema = z.object({
  analysis: AnalysisSchema,
  items: z.array(RecommendationItemSchema),
  suggestedTitle: z.string(),
  suggestedAbstract: z.string(),
  method: RecommendationMethodSchema,
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ---------------------------------------------------------------------------
// Saved recommendation request (POST /api/saved-recommendations)
// ---------------------------------------------------------------------------

export const SaveRecommendationSchema = z.object({
  resultId: z.string().min(1),
});
