import { createFileRoute } from "@tanstack/react-router";
import { createSupabasePublicClient } from "@/lib/server/supabase";

function getBaseOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export const Route = createFileRoute("/api/admin/session/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = getBaseOrigin(request);
        const redirectTo = `${origin}/auth/callback`;
        const supabase = createSupabasePublicClient();

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (error || !data?.url) {
          const message = encodeURIComponent(error?.message ?? "Failed to start Google sign-in.");
          return Response.redirect(`${origin}/login?error=${message}`);
        }

        return Response.redirect(data.url);
      },
    },
  },
});
