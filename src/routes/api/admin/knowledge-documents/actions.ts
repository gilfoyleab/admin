import { createFileRoute } from "@tanstack/react-router";
import { bulkProcessAdminKnowledgeDocuments } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/knowledge-documents/actions")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withAdmin(request, async () => {
          const payload = (await request.json()) as {
            action: "process";
            documentIds: string[];
          };
          if (payload.action !== "process") {
            return Response.json({ error: "Unsupported action." }, { status: 400 });
          }
          const result = await bulkProcessAdminKnowledgeDocuments(payload.documentIds);
          return Response.json(result);
        }),
    },
  },
});
