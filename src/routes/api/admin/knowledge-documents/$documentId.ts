import { createFileRoute } from "@tanstack/react-router";
import {
  deleteAdminKnowledgeDocument,
  updateAdminKnowledgeDocument,
} from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/knowledge-documents/$documentId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
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
          const document = await updateAdminKnowledgeDocument(params.documentId, payload);
          return Response.json({ document });
        }),
      DELETE: async ({ request, params }) =>
        withAdmin(request, async () => {
          await deleteAdminKnowledgeDocument(params.documentId);
          return Response.json({ ok: true });
        }),
    },
  },
});
