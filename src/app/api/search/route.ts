import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/http/handle-route";
import { SearchParamsSchema } from "@/lib/schemas";
import { searchService } from "@/lib/services/search-service";

export const dynamic = "force-dynamic";

export const GET = handleRoute("GET /api/search", async (request: NextRequest) => {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  // Drop empty-string params so optional filters are treated as absent.
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== ""),
  );
  const params = SearchParamsSchema.parse(cleaned);
  const results = await searchService.search(params);
  return Response.json(results);
});
