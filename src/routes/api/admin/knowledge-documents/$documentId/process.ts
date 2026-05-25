import { createFileRoute } from "@tanstack/react-router";
import { getAdminKnowledgeDocument, processAdminKnowledgeDocument } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/knowledge-documents/$documentId/process")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        withAdmin(request, async () => {
          await processAdminKnowledgeDocument(params.documentId);
          const document = await getAdminKnowledgeDocument(params.documentId);
          return Response.json({
            ok: true,
            document: document
              ? {
                  id: document.id,
                  chunkCount: Number(document.chunk_count ?? 0),
                  processingStatus: document.processing_status ?? "draft",
                }
              : null,
          });
        }),
    },
  },
});
