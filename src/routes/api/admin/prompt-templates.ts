import { createFileRoute } from "@tanstack/react-router";
import { createPromptTemplate, listPromptTemplates } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/prompt-templates")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const prompts = await listPromptTemplates(request.url);
          return Response.json({ prompts });
        }),
      POST: async ({ request }) =>
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
          const prompt = await createPromptTemplate(payload, access.userId);
          return Response.json({ prompt }, { status: 201 });
        }),
    },
  },
});
