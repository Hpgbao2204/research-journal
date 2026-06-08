import { logger } from "@/lib/http/logger";
import { aiClient } from "./ai-client";
import type { Candidate } from "./candidates";
import type { AnalyzeRequest, RecommendationItemDTO } from "@/lib/schemas";

/**
 * Optional semantic re-ranking using embeddings (e.g. Ollama nomic-embed-text).
 * Embeds the abstract and each candidate's topic profile, then blends cosine
 * similarity with the deterministic score. Best-effort: returns the items
 * unchanged if embeddings are unavailable or fail.
 */

const SEMANTIC_TIMEOUT_MS = Number(process.env.AI_EMBED_TIMEOUT_MS ?? "20000");

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function candidateProfile(c: Candidate): string {
  return [c.name, c.field, c.scope, c.keywords.join(", ")].filter(Boolean).join(". ");
}

export async function semanticRerank(
  request: AnalyzeRequest,
  candidates: Candidate[],
  items: RecommendationItemDTO[],
): Promise<{ items: RecommendationItemDTO[]; applied: boolean }> {
  if (!aiClient.isEmbeddingConfigured() || candidates.length === 0) {
    return { items, applied: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEMANTIC_TIMEOUT_MS);
  try {
    const queryText = `${request.title}. ${request.abstract}`;
    const inputs = [queryText, ...candidates.map(candidateProfile)];
    const vectors = await aiClient.embed(inputs, controller.signal);
    const [queryVec, ...candVecs] = vectors;

    const simById = new Map<string, number>();
    candidates.forEach((c, i) => {
      const sim = (cosine(queryVec, candVecs[i]) + 1) / 2; // map [-1,1] -> [0,1]
      simById.set(c.id, sim);
    });

    const reranked = items.map((it) => {
      const sim = simById.get(it.venueId) ?? 0;
      // Blend: 60% semantic similarity, 40% deterministic score.
      const blended = Math.round(0.6 * sim * 100 + 0.4 * it.matchScore);
      return { ...it, matchScore: Math.max(0, Math.min(100, blended)) };
    });
    reranked.sort((a, b) => b.matchScore - a.matchScore || a.venueName.localeCompare(b.venueName));
    return { items: reranked, applied: true };
  } catch (err) {
    logger.error("semanticRerank", err);
    return { items, applied: false };
  } finally {
    clearTimeout(timer);
  }
}
