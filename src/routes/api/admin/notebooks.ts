import { createFileRoute } from "@tanstack/react-router";
import { createAdminKnowledgeNotebook, listAdminKnowledgeNotebooks } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/notebooks")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminKnowledgeNotebooks(request.url);
          return Response.json(result);
        }),
      POST: async ({ request }) =>
        withAdmin(request, async () => {
          const payload = (await request.json()) as {
            title: string;
            board: string;
            level: string;
            faculty: string;
            subject: string;
            curriculum?: string;
            description?: string;
          };
          const notebook = await createAdminKnowledgeNotebook(payload);
          return Response.json({ notebook }, { status: 201 });
        }),
    },
  },
});
