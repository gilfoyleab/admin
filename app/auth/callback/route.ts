import {
  assertAdminAccess,
  buildSessionCookies,
  clearSessionCookies,
} from "@/lib/server/admin-auth";
import { createSupabasePublicClient } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

function appendCookies(headers: Headers, cookies: string[]) {
  for (const cookie of cookies) {
    headers.append("set-cookie", cookie);
  }
}

export async function GET(request: Request) {
  const origin = getBaseOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return Response.redirect(`${origin}/login`);
  }

  const publicClient = createSupabasePublicClient();
  const { data, error } = await publicClient.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    const message = encodeURIComponent(error?.message ?? "Failed to exchange auth code.");
    return Response.redirect(`${origin}/login?error=${message}`);
  }

  const cookieHeaders = new Headers();
  appendCookies(
    cookieHeaders,
    buildSessionCookies(
      data.session.access_token,
      data.session.refresh_token,
      data.session.expires_in,
    ),
  );

  const access = await assertAdminAccess(
    new Request(request.url, {
      headers: {
        cookie: `admin_delight_access_token=${encodeURIComponent(data.session.access_token)}; admin_delight_refresh_token=${encodeURIComponent(data.session.refresh_token)}`,
      },
    }),
  );

  if ("error" in access) {
    appendCookies(cookieHeaders, clearSessionCookies());
    const message = encodeURIComponent(
      access.status === 403 ? "Your account is not an admin." : access.error,
    );
    cookieHeaders.set("location", `${origin}/login?error=${message}`);
    return new Response(null, { status: 302, headers: cookieHeaders });
  }

  cookieHeaders.set("location", `${origin}/`);
  return new Response(null, { status: 302, headers: cookieHeaders });
}
