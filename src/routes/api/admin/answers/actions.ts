import { createFileRoute } from "@tanstack/react-router";
import { bulkUpdateAdminAnswerReview } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/answers/actions")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withAdmin(request, async (access) => {
          const payload = (await request.json()) as {
            action: "reviewed" | "unreviewed";
            messageIds: string[];
            adminReviewNote?: string | null;
          };
          const reviewed = payload.action === "reviewed";
          const result = await bulkUpdateAdminAnswerReview(payload.messageIds, {
            adminUserId: access.userId,
            reviewed,
            adminReviewNote: payload.adminReviewNote,
          });
          return Response.json(result);
        }),
    },
  },
});
