import { createFileRoute } from "@tanstack/react-router";
import {
  deleteAdminKnowledgeNotebook,
  getAdminKnowledgeNotebook,
  updateAdminKnowledgeNotebook,
} from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return parsed;
}

export const Route = createFileRoute("/api/admin/notebooks/$notebookId")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        withAdmin(request, async () => {
          const { searchParams } = new URL(request.url);
          const notebook = await getAdminKnowledgeNotebook(params.notebookId, {
            resourceQ: searchParams.get("resourceQ") ?? undefined,
            resourcePage: parsePositiveInt(searchParams.get("resourcePage")),
            resourcePageSize: parsePositiveInt(searchParams.get("resourcePageSize")),
            selectedResourceId: searchParams.get("selectedResourceId") ?? undefined,
          });

          if (!notebook) {
            return Response.json({ error: "Notebook not found." }, { status: 404 });
          }

          return Response.json({ notebook });
        }),
      PATCH: async ({ request, params }) =>
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
          const notebook = await updateAdminKnowledgeNotebook(params.notebookId, payload);
          return Response.json({ notebook });
        }),
      DELETE: async ({ request, params }) =>
        withAdmin(request, async () => {
          await deleteAdminKnowledgeNotebook(params.notebookId);
          return Response.json({ ok: true });
        }),
    },
  },
});
