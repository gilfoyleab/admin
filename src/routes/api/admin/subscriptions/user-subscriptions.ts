import { createFileRoute } from "@tanstack/react-router";
import { grantAdminSubscription, listAdminSubscriptions } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/subscriptions/user-subscriptions")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const subscriptions = await listAdminSubscriptions();
          return Response.json({ subscriptions });
        }),
      POST: async ({ request }) =>
        withAdmin(request, async () => {
          const payload = (await request.json()) as {
            userId: string;
            planId: string;
            startsAt?: string | null;
            endsAt?: string | null;
          };
          const subscriptionId = await grantAdminSubscription(payload);
          return Response.json({ subscriptionId }, { status: 201 });
        }),
    },
  },
});
