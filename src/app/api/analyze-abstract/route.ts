import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/http/handle-route";
import { AnalyzeRequestSchema } from "@/lib/schemas";
import { recommendationService } from "@/lib/services/recommendation-service";

export const dynamic = "force-dynamic";

export const POST = handleRoute("POST /api/analyze-abstract", async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const parsed = AnalyzeRequestSchema.parse(body);
  const result = await recommendationService.analyze(parsed);
  return Response.json(result, { status: 201 });
});
