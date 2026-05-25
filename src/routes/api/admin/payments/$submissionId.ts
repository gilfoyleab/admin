import { createFileRoute } from "@tanstack/react-router";
import { updatePaymentSubmissionStatus } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/payments/$submissionId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
        withAdmin(request, async () => {
          const payload = (await request.json()) as { action: "approve" | "reject" };
          if (payload.action !== "approve" && payload.action !== "reject") {
            return Response.json({ error: "Unsupported action." }, { status: 400 });
          }
          await updatePaymentSubmissionStatus(params.submissionId, payload.action);
          return Response.json({ ok: true });
        }),
    },
  },
});
