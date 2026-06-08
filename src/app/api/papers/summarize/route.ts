import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute } from "@/lib/http/handle-route";
import { aiClient } from "@/lib/services/recommendation/ai-client";

export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().trim().max(500).optional(),
  abstract: z.string().trim().min(1).max(8000),
});

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? "20000");

export const POST = handleRoute("POST /api/papers/summarize", async (request: NextRequest) => {
  const body = Body.parse(await request.json().catch(() => null));

  if (!aiClient.isConfigured()) {
    return Response.json({
      available: false,
      message: "AI is not configured. Set AI_API_BASE_URL (e.g. Ollama) in .env to enable summaries.",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const summary = await aiClient.completeText(
      "You are a research assistant. Summarize the paper abstract for a busy researcher. Use 3 concise bullet points: (1) problem, (2) method, (3) key result. Then one line starting 'Gap/limitation:'. Plain text only.",
      `${body.title ? `Title: ${body.title}\n` : ""}Abstract: ${body.abstract}`,
      controller.signal,
    );
    return Response.json({ available: true, summary });
  } catch {
    return Response.json({
      available: false,
      message: "AI summary failed (model unreachable or timed out).",
    });
  } finally {
    clearTimeout(timer);
  }
});
