import { createFileRoute } from "@tanstack/react-router";
import { createAdminSubscriptionPlan, listAdminSubscriptionPlans } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/subscriptions/plans")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const plans = await listAdminSubscriptionPlans();
          return Response.json({ plans });
        }),
      POST: async ({ request }) =>
        withAdmin(request, async () => {
          const payload = (await request.json()) as {
            name: string;
            slug?: string;
            credits: number;
            price: number;
            currency?: string;
            billingType: "monthly" | "one_time";
            isActive?: boolean;
          };
          const plan = await createAdminSubscriptionPlan(payload);
          return Response.json({ plan }, { status: 201 });
        }),
    },
  },
});
