import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/http/logger";
import { AppError, NotFoundError } from "@/lib/http/errors";
import {
  AnalysisResultSchema,
  type AnalyzeRequest,
  type AnalysisResult,
} from "@/lib/schemas";
import type { RecommendationResultDTO } from "@/lib/dto";
import { aiClient } from "./recommendation/ai-client";
import { queryCandidates, type Candidate } from "./recommendation/candidates";
import { ruleBasedAnalyze } from "./recommendation/fallback";
import { buildPrompt } from "./recommendation/prompt";

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? "20000");

/**
 * Try the AI path. Returns a schema-valid, GROUNDED AnalysisResult or null if
 * anything goes wrong (no key, error, timeout, invalid output). Non-conforming
 * output is rejected (never persisted) per Req 7.8.
 */
async function tryAi(
  request: AnalyzeRequest,
  candidates: Candidate[],
): Promise<AnalysisResult | null> {
  if (!aiClient.isConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const raw = await aiClient.complete(buildPrompt(request, candidates), controller.signal);
    const parsed = JSON.parse(raw) as unknown;
    const result = AnalysisResultSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn("recommendation.ai.invalidSchema", { issues: result.error.issues.length });
      return null;
    }
    // Grounding: drop any item that does not reference a real candidate id.
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const grounded = result.data.items.filter((it) => byId.has(it.venueId));
    grounded.sort((a, b) => b.matchScore - a.matchScore || a.venueName.localeCompare(b.venueName));
    return { ...result.data, items: grounded, method: "AI" };
  } catch (err) {
    logger.error("recommendation.ai.failed", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function persist(
  request: AnalyzeRequest,
  result: AnalysisResult,
): Promise<string> {
  const created = await prisma.recommendationResult.create({
    data: {
      inputTitle: request.title,
      inputAbstract: request.abstract,
      inputKeywords: request.keywords,
      inputField: request.field ?? null,
      preferredVenueType: request.preferredVenueType ?? null,
      mainTopic: result.analysis.mainTopic,
      subfield: result.analysis.subfield,
      methodology: result.analysis.methodology,
      contributionType: result.analysis.contributionType,
      extractedKeywords: result.analysis.extractedKeywords,
      suitableDisciplines: result.analysis.suitableDisciplines,
      suggestedTitle: result.suggestedTitle,
      suggestedAbstract: result.suggestedAbstract,
      method: result.method,
      items: {
        create: result.items.map((it, idx) => ({
          venueType: it.venueType,
          venueId: it.venueId,
          venueName: it.venueName,
          matchScore: it.matchScore,
          reason: it.reason,
          scopeAlignment: it.scopeAlignment,
          submissionDeadline: it.submissionDeadline,
          indexing: it.indexing,
          submissionUrl: it.submissionUrl,
          warnings: it.warnings,
          rank: idx + 1,
        })),
      },
    },
  });
  return created.id;
}

function toResultDTO(row: {
  id: string;
  inputTitle: string;
  inputAbstract: string;
  inputKeywords: string[];
  inputField: string | null;
  preferredVenueType: string | null;
  mainTopic: string | null;
  subfield: string | null;
  methodology: string | null;
  contributionType: string | null;
  extractedKeywords: string[];
  suitableDisciplines: string[];
  suggestedTitle: string | null;
  suggestedAbstract: string | null;
  method: "AI" | "RULE_BASED";
  saved: boolean;
  createdAt: Date;
  items: Array<{
    id: string;
    venueType: string;
    venueId: string;
    venueName: string;
    matchScore: number;
    reason: string;
    scopeAlignment: string | null;
    submissionDeadline: Date | null;
    indexing: string[];
    submissionUrl: string | null;
    warnings: string[];
    rank: number;
  }>;
}): RecommendationResultDTO {
  return {
    id: row.id,
    inputTitle: row.inputTitle,
    inputAbstract: row.inputAbstract,
    inputKeywords: row.inputKeywords,
    inputField: row.inputField,
    preferredVenueType: row.preferredVenueType,
    mainTopic: row.mainTopic,
    subfield: row.subfield,
    methodology: row.methodology,
    contributionType: row.contributionType,
    extractedKeywords: row.extractedKeywords,
    suitableDisciplines: row.suitableDisciplines,
    suggestedTitle: row.suggestedTitle,
    suggestedAbstract: row.suggestedAbstract,
    method: row.method,
    saved: row.saved,
    createdAt: row.createdAt.toISOString(),
    items: row.items
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((it) => ({
        id: it.id,
        venueType: it.venueType,
        venueId: it.venueId,
        venueName: it.venueName,
        matchScore: it.matchScore,
        reason: it.reason,
        scopeAlignment: it.scopeAlignment,
        submissionDeadline: it.submissionDeadline ? it.submissionDeadline.toISOString() : null,
        indexing: it.indexing,
        submissionUrl: it.submissionUrl,
        warnings: it.warnings,
        rank: it.rank,
      })),
  };
}

export const recommendationService = {
  /**
   * Validate → query candidates → AI (grounded, schema-checked) or rule-based
   * fallback → persist → return id. Never throws on AI failure (Req 15.2).
   */
  async analyze(request: AnalyzeRequest): Promise<RecommendationResultDTO> {
    const candidates = await queryCandidates(request);

    let result = await tryAi(request, candidates);
    if (!result) {
      result = ruleBasedAnalyze(request, candidates);
    }

    // Final schema gate before persistence (defense-in-depth).
    const validated = AnalysisResultSchema.safeParse(result);
    if (!validated.success) {
      throw new AppError("Failed to produce a valid recommendation result", 500, "recommendation_error");
    }

    const id = await persist(request, validated.data);
    const dto = await this.getById(id);
    if (!dto) throw new AppError("Recommendation could not be retrieved after saving", 500, "recommendation_error");
    return dto;
  },

  async getById(id: string): Promise<RecommendationResultDTO | null> {
    const row = await prisma.recommendationResult.findUnique({
      where: { id },
      include: { items: true },
    });
    return row ? toResultDTO(row) : null;
  },

  async getByIdOrThrow(id: string): Promise<RecommendationResultDTO> {
    const dto = await this.getById(id);
    if (!dto) throw new NotFoundError(`Recommendation ${id} not found`);
    return dto;
  },

  async save(id: string): Promise<RecommendationResultDTO> {
    const existing = await prisma.recommendationResult.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError(`Recommendation ${id} not found`);
    await prisma.recommendationResult.update({ where: { id }, data: { saved: true } });
    return this.getByIdOrThrow(id);
  },

  async listSaved(): Promise<RecommendationResultDTO[]> {
    const rows = await prisma.recommendationResult.findMany({
      where: { saved: true },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toResultDTO);
  },
};
