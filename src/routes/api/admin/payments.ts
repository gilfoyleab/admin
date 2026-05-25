import { createFileRoute } from "@tanstack/react-router";
import { listAdminPaymentSubmissions } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/payments")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const submissions = await listAdminPaymentSubmissions();
          return Response.json({ submissions });
        }),
    },
  },
});
