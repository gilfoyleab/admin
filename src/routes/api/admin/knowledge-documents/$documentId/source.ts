import { createFileRoute } from "@tanstack/react-router";
import { getAdminKnowledgeSourceSignedUrl } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/knowledge-documents/$documentId/source")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        withAdmin(request, async () => {
          const url = new URL(request.url);
          const signedUrl = await getAdminKnowledgeSourceSignedUrl(params.documentId, {
            download: url.searchParams.get("download") === "1",
          });

          if (!signedUrl) {
            return Response.json({ error: "Original source file not found." }, { status: 404 });
          }

          return Response.redirect(signedUrl);
        }),
    },
  },
});
