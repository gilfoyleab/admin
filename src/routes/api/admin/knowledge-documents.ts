import { createFileRoute } from "@tanstack/react-router";
import { createAdminKnowledgeDocument, listAdminKnowledgeDocuments } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/knowledge-documents")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminKnowledgeDocuments(request.url);
          return Response.json(result);
        }),
      POST: async ({ request }) =>
        withAdmin(request, async () => {
          const payload = (await request.json()) as {
            notebookId: string;
            board: string;
            grade: string;
            faculty?: string;
            curriculum?: string;
            subject: string;
            chapter?: string | null;
            resourceKind: string;
            resourceSubtype: string;
            title: string;
            sourceName: string;
            sourceType: string;
            rawContent: string;
          };
          const document = await createAdminKnowledgeDocument(payload);
          return Response.json({ document }, { status: 201 });
        }),
    },
  },
});
