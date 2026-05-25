import { createFileRoute } from "@tanstack/react-router";
import { updateAdminSubscriptionPlan } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/subscriptions/plans/$planId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
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
          const plan = await updateAdminSubscriptionPlan(params.planId, payload);
          return Response.json({ plan });
        }),
    },
  },
});
