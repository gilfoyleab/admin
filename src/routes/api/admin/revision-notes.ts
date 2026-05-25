import { createFileRoute } from "@tanstack/react-router";
import { listAdminRevisionNotes } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/revision-notes")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminRevisionNotes(request.url);
          return Response.json(result);
        }),
    },
  },
});
