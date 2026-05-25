import { createFileRoute } from "@tanstack/react-router";
import { adjustAdminUserCredits, listAdminCreditsLedger } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/credits-ledger")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const entries = await listAdminCreditsLedger();
          return Response.json({ entries });
        }),
      POST: async ({ request }) =>
        withAdmin(request, async (access) => {
          const payload = (await request.json()) as {
            userId: string;
            amount: number;
            description?: string;
          };
          if (!payload.userId?.trim()) {
            return Response.json({ error: "userId is required." }, { status: 400 });
          }
          if (!Number.isFinite(payload.amount) || payload.amount === 0) {
            return Response.json({ error: "amount must be a non-zero number." }, { status: 400 });
          }
          await adjustAdminUserCredits({
            userId: payload.userId.trim(),
            amount: Math.trunc(payload.amount),
            description: payload.description ?? "Manual admin adjustment",
            adminUserId: access.userId,
          });
          return Response.json({ ok: true }, { status: 201 });
        }),
    },
  },
});
