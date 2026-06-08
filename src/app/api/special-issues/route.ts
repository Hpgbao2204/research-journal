import { handleRoute } from "@/lib/http/handle-route";
import { venueService } from "@/lib/services/venue-service";

export const dynamic = "force-dynamic";

export const GET = handleRoute("GET /api/special-issues", async () => {
  const specialIssues = await venueService.listSpecialIssues();
  return Response.json(specialIssues);
});
