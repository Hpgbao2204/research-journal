import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/http/handle-route";
import { SaveRecommendationSchema } from "@/lib/schemas";
import { recommendationService } from "@/lib/services/recommendation-service";

export const dynamic = "force-dynamic";

export const GET = handleRoute("GET /api/saved-recommendations", async () => {
  const saved = await recommendationService.listSaved();
  return Response.json(saved);
});

export const POST = handleRoute("POST /api/saved-recommendations", async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const { resultId } = SaveRecommendationSchema.parse(body);
  const saved = await recommendationService.save(resultId);
  return Response.json(saved, { status: 201 });
});
