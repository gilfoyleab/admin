import { createFileRoute } from "@tanstack/react-router";
import { listAdminNoteRevisionLogs } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/note-revision-logs")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminNoteRevisionLogs(request.url);
          return Response.json(result);
        }),
    },
  },
});
