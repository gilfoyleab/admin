import { createFileRoute } from "@tanstack/react-router";
import { bulkUpdateAdminUserRoles } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/users/actions")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withAdmin(request, async (access) => {
          const payload = (await request.json()) as {
            action: "set_role";
            role: "student" | "admin" | "super_admin";
            userIds: string[];
          };
          if (payload.action !== "set_role") {
            return Response.json({ error: "Unsupported action." }, { status: 400 });
          }
          const result = await bulkUpdateAdminUserRoles({
            actorUserId: access.userId,
            actorRole: access.role,
            userIds: payload.userIds,
            role: payload.role,
          });
          return Response.json(result);
        }),
    },
  },
});
