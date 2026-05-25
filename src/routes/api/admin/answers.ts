import { createFileRoute } from "@tanstack/react-router";
import { listAdminAnswers } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/answers")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminAnswers(request.url);
          return Response.json(result);
        }),
    },
  },
});
