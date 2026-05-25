import { createFileRoute } from "@tanstack/react-router";
import { deletePromptTemplate, updatePromptTemplate } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/prompt-templates/$promptId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
        withAdmin(request, async (access) => {
          const payload = (await request.json()) as {
            name: string;
            slug?: string;
            purpose: "system" | "followup" | "rewrite";
            language: "EN" | "RN";
            description?: string;
            content: string;
            isActive?: boolean;
          };
          const prompt = await updatePromptTemplate(params.promptId, payload, access.userId);
          return Response.json({ prompt });
        }),
      DELETE: async ({ request, params }) =>
        withAdmin(request, async () => {
          await deletePromptTemplate(params.promptId);
          return Response.json({ ok: true });
        }),
    },
  },
});
