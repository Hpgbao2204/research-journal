import { handleRoute } from "@/lib/http/handle-route";
import { adminService } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

// NOTE (MVP): unauthenticated by design. Add an auth guard before deploying.
export const POST = handleRoute("POST /api/admin/seed", async () => {
  const result = await adminService.seed();
  return Response.json(result, { status: 201 });
});
