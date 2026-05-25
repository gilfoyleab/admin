import { createFileRoute } from "@tanstack/react-router";
import { cancelAdminSubscription } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/subscriptions/user-subscriptions/$subscriptionId")(
  {
    server: {
      handlers: {
        PATCH: async ({ request, params }) =>
          withAdmin(request, async () => {
            const payload = (await request.json()) as { action: "cancel" };
            if (payload.action !== "cancel") {
              return Response.json({ error: "Unsupported action." }, { status: 400 });
            }
            await cancelAdminSubscription(params.subscriptionId);
            return Response.json({ ok: true });
          }),
        DELETE: async ({ request, params }) =>
          withAdmin(request, async () => {
            await cancelAdminSubscription(params.subscriptionId);
            return Response.json({ ok: true });
          }),
      },
    },
  },
);
