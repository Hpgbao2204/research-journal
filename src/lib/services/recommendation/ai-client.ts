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
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function readConfig() {
  const apiKey = process.env.AI_API_KEY?.trim() ?? "";
  const baseUrl = (process.env.AI_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal/.test(baseUrl);
  return { apiKey, baseUrl, model, isLocal };
}

export const aiClient: AiClient = {
  isConfigured(): boolean {
    const { apiKey, baseUrl } = readConfig();
    // Configured if an API key is present, OR the base URL points at a custom
    // endpoint (e.g. a local Ollama/LM Studio server, which needs no key).
    return apiKey.length > 0 || baseUrl !== DEFAULT_BASE_URL;
  },

  async complete(prompt: string, signal: AbortSignal): Promise<string> {
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
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are PaperScout AI, an assistant that recommends academic venues. You must only recommend venues from the provided candidate list and must reply with a single valid JSON object that matches the requested schema. Never invent venues.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("aiClient.complete", new Error(`HTTP ${res.status}`), {
        status: res.status,
        bodyPreview: text.slice(0, 200),
      });
      throw new Error(`AI provider returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned an empty completion");
    return content;
  },
};
