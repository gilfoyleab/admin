import { createFileRoute } from "@tanstack/react-router";
import { updateAdminAnswerReview } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/answers/$messageId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
        withAdmin(request, async (access) => {
          const payload = (await request.json()) as {
            reviewed?: boolean;
            adminReviewNote?: string | null;
          };
          await updateAdminAnswerReview(params.messageId, {
            adminUserId: access.userId,
            reviewed: payload.reviewed,
            adminReviewNote: payload.adminReviewNote,
          });
          return Response.json({ ok: true });
        }),
    },
  },
});
