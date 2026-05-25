import { createFileRoute } from "@tanstack/react-router";
import { listAdminKnowledgeChunks } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/knowledge-chunks")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminKnowledgeChunks(request.url);
          return Response.json(result);
        }),
    },
  },
});
