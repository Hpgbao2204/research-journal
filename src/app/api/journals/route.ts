import { handleRoute } from "@/lib/http/handle-route";
import { venueService } from "@/lib/services/venue-service";

export const dynamic = "force-dynamic";

export const GET = handleRoute("GET /api/journals", async () => {
  const journals = await venueService.listJournals();
  return Response.json(journals);
});
