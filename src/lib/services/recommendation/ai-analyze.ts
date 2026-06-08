import { z } from "zod";
import { logger } from "@/lib/http/logger";
import type { AnalyzeRequest, Analysis } from "@/lib/schemas";
import { aiClient } from "./ai-client";
import { extractAnalysis } from "./extract";

/**
 * AI-assisted paper analysis for small local models (e.g. Ollama llama3.2).
 *
 * Design rationale: small models are unreliable at emitting a large, deeply
 * nested JSON (the full result with dozens of grounded venue items). They ARE
 * good at the focused NLP task of reading an abstract and naming its topic,
 * methodology, contribution type and keywords. So the AI only produces the
 * compact `analysis` object plus title/abstract suggestions; the venue ranking
 * stays deterministic and grounded (see buildItems). Every AI field is merged
 * over a deterministic baseline, so partial/invalid model output degrades
 * gracefully instead of failing the whole request.
 */

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? "120000");

// Lenient schema: every field optional so we can salvage partial output and
// fall back to the deterministic value per-field.
const AiAnalysisSchema = z.object({
  mainTopic: z.string().trim().min(1).optional(),
  subfield: z.string().trim().min(1).optional(),
  methodology: z.string().trim().min(1).optional(),
  contributionType: z.string().trim().min(1).optional(),
  extractedKeywords: z.array(z.string().trim().min(1)).optional(),
  suitableDisciplines: z.array(z.string().trim().min(1)).optional(),
  suggestedTitle: z.string().trim().min(1).optional(),
  suggestedAbstract: z.string().trim().min(1).optional(),
});

export interface AiAnalysis {
  analysis: Analysis;
  suggestedTitle: string;
  suggestedAbstract: string;
}

function buildAnalysisPrompt(request: AnalyzeRequest): string {
  return `You are an expert academic editor. Read the paper below and analyze it.

TITLE:
${request.title}

ABSTRACT:
${request.abstract}

AUTHOR KEYWORDS: ${request.keywords.join(", ") || "(none)"}
DECLARED FIELD: ${request.field ?? "(none)"}

Return a single JSON object with EXACTLY these keys (no extra keys, no prose):
{
  "mainTopic": string,            // the single primary research topic
  "subfield": string,             // the more specific subfield
  "methodology": string,          // e.g. "Experimental evaluation", "Theoretical analysis"
  "contributionType": string,     // e.g. "System / framework", "Empirical / dataset", "Survey / review"
  "extractedKeywords": string[],  // 5-10 concise technical keywords drawn from the text
  "suitableDisciplines": string[],// 1-3 academic disciplines this paper fits
  "suggestedTitle": string,       // one concrete suggestion to improve the title for venue fit
  "suggestedAbstract": string     // one concrete suggestion to improve the abstract for venue fit
}`;
}

/**
 * Try to obtain an AI-enriched analysis. Returns null when AI is not configured
 * or the call fails entirely. On partial output, missing fields are filled from
 * the deterministic baseline so the result is always complete and schema-valid.
 */
export async function aiAnalyze(request: AnalyzeRequest): Promise<AiAnalysis | null> {
  if (!aiClient.isConfigured()) return null;

  const baseline = extractAnalysis(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const raw = await aiClient.complete(buildAnalysisPrompt(request), controller.signal);
    const parsed = JSON.parse(extractJsonObject(raw)) as unknown;
    const result = AiAnalysisSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn("recommendation.aiAnalyze.invalidSchema", { issues: result.error.issues.length });
      return null;
    }
    const a = result.data;
    const dedupeKeywords = (kws: string[]) =>
      [...new Set(kws.map((k) => k.toLowerCase().trim()).filter(Boolean))].slice(0, 12);

    const analysis: Analysis = {
      mainTopic: a.mainTopic ?? baseline.mainTopic,
      subfield: a.subfield ?? baseline.subfield,
      methodology: a.methodology ?? baseline.methodology,
      contributionType: a.contributionType ?? baseline.contributionType,
      extractedKeywords:
        a.extractedKeywords && a.extractedKeywords.length > 0
          ? dedupeKeywords([...request.keywords, ...a.extractedKeywords])
          : baseline.extractedKeywords,
      suitableDisciplines:
        a.suitableDisciplines && a.suitableDisciplines.length > 0
          ? a.suitableDisciplines.slice(0, 3)
          : baseline.suitableDisciplines,
    };

    return {
      analysis,
      suggestedTitle:
        a.suggestedTitle ??
        `Consider foregrounding "${analysis.mainTopic}" and your contribution type (${analysis.contributionType}) in the title.`,
      suggestedAbstract:
        a.suggestedAbstract ??
        `State the problem, method (${analysis.methodology}), and quantified results explicitly, and include the key terms: ${analysis.extractedKeywords.slice(0, 5).join(", ")}.`,
    };
  } catch (err) {
    logger.error("recommendation.aiAnalyze.failed", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Small models sometimes wrap JSON in prose or code fences. Extract the first
 * balanced top-level object so JSON.parse has the best chance of succeeding.
 */
function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) return body.slice(start, end + 1);
  return body.trim();
}
