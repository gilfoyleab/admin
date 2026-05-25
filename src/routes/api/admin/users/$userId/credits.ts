import { createFileRoute } from "@tanstack/react-router";
import { adjustAdminUserCredits } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/users/$userId/credits")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        withAdmin(request, async (access) => {
          const payload = (await request.json()) as { amount: number; description?: string };
          if (!Number.isFinite(payload.amount) || payload.amount === 0) {
            return Response.json({ error: "amount must be a non-zero number." }, { status: 400 });
          }
          await adjustAdminUserCredits({
            userId: params.userId,
            amount: Math.trunc(payload.amount),
            description: payload.description ?? "Manual admin adjustment",
            adminUserId: access.userId,
          });
          return Response.json({ ok: true });
        }),
    },
  },
});
