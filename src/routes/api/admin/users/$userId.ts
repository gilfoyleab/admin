import { createFileRoute } from "@tanstack/react-router";
import { updateAdminUserRole } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/users/$userId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
        withAdmin(request, async () => {
          const payload = (await request.json()) as { role: "student" | "admin" };
          await updateAdminUserRole(params.userId, payload.role);
          return Response.json({ ok: true });
        }),
    },
  },
});
