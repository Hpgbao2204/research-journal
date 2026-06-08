import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/http/handle-route";
import { venueService } from "@/lib/services/venue-service";

export const dynamic = "force-dynamic";

export const GET = handleRoute(
  "GET /api/conferences/[id]",
  async (_request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const conference = await venueService.getConference(id);
    return Response.json(conference);
  },
);
