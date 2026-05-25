import { createFileRoute } from "@tanstack/react-router";
import { listAdminChatSessions } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/chat-sessions")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminChatSessions(request.url);
          return Response.json(result);
        }),
    },
  },
});
