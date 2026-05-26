import {
  assertAdminAccess,
  buildSessionCookies,
  clearSessionCookies,
} from "@/lib/server/admin-auth";
import { createSupabasePublicClient } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const access = await assertAdminAccess(request);
  if ("error" in access) {
    return jsonError(access.error, access.status);
  }

  return Response.json({
    user: {
      id: access.userId,
      email: access.email,
    },
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        email?: string;
        password?: string;
        accessToken?: string;
        refreshToken?: string;
      }
    | null;

  const email = payload?.email?.trim() ?? "";
  const password = payload?.password ?? "";
  const accessToken = payload?.accessToken?.trim() ?? "";
  const refreshToken = payload?.refreshToken?.trim() ?? "";

  const isOAuthPayload = Boolean(accessToken && refreshToken);

  if (isOAuthPayload) {
    const access = await assertAdminAccess(
      new Request(request.url, {
        headers: {
          cookie: `admin_delight_access_token=${encodeURIComponent(accessToken)}; admin_delight_refresh_token=${encodeURIComponent(refreshToken)}`,
        },
      }),
    );

    if ("error" in access) {
      return jsonError(access.error, access.status);
    }

    const headers = new Headers();
    for (const cookie of buildSessionCookies(accessToken, refreshToken)) {
      headers.append("set-cookie", cookie);
    }
    headers.set("content-type", "application/json");

    return new Response(
      JSON.stringify({
        user: { id: access.userId, email: access.email },
      }),
      { status: 200, headers },
    );
  }

  if (!email || !password) {
    return jsonError("Email and password are required.", 400);
  }

  const publicClient = createSupabasePublicClient();
  const { data, error } = await publicClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return jsonError(error?.message ?? "Invalid credentials.", 401);
  }

  const access = await assertAdminAccess(
    new Request(request.url, {
      headers: {
        cookie: `admin_delight_access_token=${encodeURIComponent(data.session.access_token)}; admin_delight_refresh_token=${encodeURIComponent(data.session.refresh_token)}`,
      },
    }),
  );

  if ("error" in access) {
    return jsonError(access.error, access.status);
  }

  const headers = new Headers();
  for (const cookie of buildSessionCookies(
    data.session.access_token,
    data.session.refresh_token,
    data.session.expires_in,
  )) {
    headers.append("set-cookie", cookie);
  }
  headers.set("content-type", "application/json");

  return new Response(
    JSON.stringify({
      user: { id: access.userId, email: access.email },
    }),
    { status: 200, headers },
  );
}

export async function DELETE() {
  const headers = new Headers();
  for (const cookie of clearSessionCookies()) {
    headers.append("set-cookie", cookie);
  }
  headers.set("content-type", "application/json");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}
