import { assertAdminAccess } from "@/lib/server/admin-auth";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function withAdmin(
  request: Request,
  handler: (access: { userId: string; email: string }) => Promise<Response>,
) {
  try {
    const access = await assertAdminAccess(request);
    if ("error" in access) {
      return jsonError(access.error, access.status);
    }
    return await handler(access);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}
