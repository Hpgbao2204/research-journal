import { logger } from "@/lib/http/logger";

/**
 * OpenAI-compatible chat client (server-only).
 *
 * Works with the OpenAI API and with any OpenAI-compatible endpoint, including
 * locally self-hosted small models via Ollama or LM Studio:
 *   - Ollama:   AI_API_BASE_URL=http://localhost:11434/v1   AI_MODEL=llama3.2
 *   - LM Studio: AI_API_BASE_URL=http://localhost:1234/v1   AI_MODEL=<loaded model>
 *
 * When AI_API_KEY is empty AND no local base URL is reachable, the
 * recommendation service falls back to the deterministic rule-based algorithm.
 * Local servers (Ollama/LM Studio) usually do not require a key, so the client
 * is considered "configured" when either a key or a non-default base URL is set.
 */
export interface AiClient {
  isConfigured(): boolean;
  /** Returns the raw model text (expected to be JSON). Throws on error/timeout. */
  complete(prompt: string, signal: AbortSignal): Promise<string>;
  /** Plain-text completion (no JSON formatting) — e.g. summaries. */
  completeText(system: string, user: string, signal: AbortSignal): Promise<string>;
  /** Whether an embedding model is configured for semantic matching. */
  isEmbeddingConfigured(): boolean;
  /** Embed texts; returns one vector per input. Throws on error. */
  embed(texts: string[], signal: AbortSignal): Promise<number[][]>;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function readConfig() {
  const apiKey = process.env.AI_API_KEY?.trim() ?? "";
  const baseUrl = (process.env.AI_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
  const embedModel = process.env.AI_EMBED_MODEL?.trim() ?? "";
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal/.test(baseUrl);
  return { apiKey, baseUrl, model, embedModel, isLocal };
}

async function chat(messages: Array<{ role: string; content: string }>, jsonMode: boolean, signal: AbortSignal): Promise<string> {
  const { apiKey, baseUrl, model } = readConfig();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("aiClient.chat", new Error(`HTTP ${res.status}`), { status: res.status, bodyPreview: text.slice(0, 200) });
    throw new Error(`AI provider returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty completion");
  return content;
}

export const aiClient: AiClient = {
  isConfigured(): boolean {
    const { apiKey, baseUrl } = readConfig();
    return apiKey.length > 0 || baseUrl !== DEFAULT_BASE_URL;
  },

  isEmbeddingConfigured(): boolean {
    return readConfig().embedModel.length > 0;
  },

  async complete(prompt: string, signal: AbortSignal): Promise<string> {
    return chat(
      [
        {
          role: "system",
          content:
            "You are PaperScout AI, an assistant that recommends academic venues. You must only recommend venues from the provided candidate list and must reply with a single valid JSON object that matches the requested schema. Never invent venues.",
        },
        { role: "user", content: prompt },
      ],
      true,
      signal,
    );
  },

  async completeText(system: string, user: string, signal: AbortSignal): Promise<string> {
    return chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      false,
      signal,
    );
  },

  async embed(texts: string[], signal: AbortSignal): Promise<number[][]> {
    const { apiKey, baseUrl, embedModel } = readConfig();
    if (!embedModel) throw new Error("No embedding model configured (AI_EMBED_MODEL)");
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ model: embedModel, input: texts }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("aiClient.embed", new Error(`HTTP ${res.status}`), { status: res.status, bodyPreview: text.slice(0, 200) });
      throw new Error(`Embedding provider returned HTTP ${res.status}`);
    }
    const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    const vectors = (data.data ?? []).map((d) => d.embedding);
    if (vectors.length !== texts.length) throw new Error("Embedding count mismatch");
    return vectors;
  },
};
