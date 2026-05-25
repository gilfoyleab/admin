import { createFileRoute } from "@tanstack/react-router";
import { listAdminUsers } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminUsers(request.url);
          return Response.json(result);
        }),
    },
  },
});
