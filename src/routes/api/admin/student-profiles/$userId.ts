import { createFileRoute } from "@tanstack/react-router";
import { updateAdminStudentProfile } from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";

export const Route = createFileRoute("/api/admin/student-profiles/$userId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
        withAdmin(request, async (access) => {
          const payload = (await request.json()) as {
            fullName: string;
            college: string;
            board: string;
            grade: string;
            boardScore?: string;
            subjects?: string[];
            targetGrade?: string;
            languagePref: "EN" | "RN";
            role: "student" | "admin" | "super_admin";
          };
          await updateAdminStudentProfile({
            actorUserId: access.userId,
            actorRole: access.role,
            userId: params.userId,
            fullName: payload.fullName,
            college: payload.college,
            board: payload.board,
            grade: payload.grade,
            boardScore: payload.boardScore,
            subjects: payload.subjects,
            targetGrade: payload.targetGrade,
            languagePref: payload.languagePref,
            role: payload.role,
          });
          return Response.json({ ok: true });
        }),
    },
  },
});
