import { createFileRoute } from "@tanstack/react-router";
import { listAdminChatMessages } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/chat-messages")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminChatMessages(request.url);
          return Response.json(result);
        }),
    },
  },
});
