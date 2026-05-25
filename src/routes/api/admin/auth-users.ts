import { createFileRoute } from "@tanstack/react-router";
import { listAdminAuthUsers } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/auth-users")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminAuthUsers(request.url);
          return Response.json(result);
        }),
    },
  },
});
