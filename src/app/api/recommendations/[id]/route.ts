import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/http/handle-route";
import { recommendationService } from "@/lib/services/recommendation-service";

export const dynamic = "force-dynamic";

export const GET = handleRoute(
  "GET /api/recommendations/[id]",
  async (_request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const result = await recommendationService.getByIdOrThrow(id);
    return Response.json(result);
  },
);
