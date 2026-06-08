import { handleRoute } from "@/lib/http/handle-route";
import { scimago } from "@/lib/providers/scimago";

export const dynamic = "force-dynamic";

/** Distinct Scimago subject areas, for the search filter dropdown. */
export const GET = handleRoute("GET /api/meta/areas", async () => {
  return Response.json({ areas: scimago.areas() });
});
