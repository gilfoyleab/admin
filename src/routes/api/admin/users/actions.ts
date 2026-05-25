import { createFileRoute } from "@tanstack/react-router";
import { bulkUpdateAdminUserRoles } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/users/actions")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withAdmin(request, async () => {
          const payload = (await request.json()) as {
            action: "set_role";
            role: "student" | "admin";
            userIds: string[];
          };
          if (payload.action !== "set_role") {
            return Response.json({ error: "Unsupported action." }, { status: 400 });
          }
          const result = await bulkUpdateAdminUserRoles(payload.userIds, payload.role);
          return Response.json(result);
        }),
    },
  },
});
