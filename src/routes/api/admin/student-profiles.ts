import { createFileRoute } from "@tanstack/react-router";
import { listAdminStudentProfiles } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/student-profiles")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const result = await listAdminStudentProfiles(request.url);
          return Response.json(result);
        }),
    },
  },
});
