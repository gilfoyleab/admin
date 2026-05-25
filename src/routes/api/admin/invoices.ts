import { createFileRoute } from "@tanstack/react-router";
import { listAdminInvoices } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/invoices")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withAdmin(request, async () => {
          const invoices = await listAdminInvoices();
          return Response.json({ invoices });
        }),
    },
  },
});
