import { createSupabaseAdminClient, createSupabasePublicClient } from "@/lib/server/supabase";

const ACCESS_TOKEN_COOKIE = "admin_delight_access_token";
const REFRESH_TOKEN_COOKIE = "admin_delight_refresh_token";

function parseCookies(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const idx = entry.indexOf("=");
      if (idx < 0) return acc;
      const key = decodeURIComponent(entry.slice(0, idx).trim());
      const value = decodeURIComponent(entry.slice(idx + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

function cookieBase(maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function buildSessionCookies(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds = 3600,
) {
  return [
    `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; ${cookieBase(expiresInSeconds)}`,
    `${REFRESH_TOKEN_COOKIE}=${encodeURIComponent(refreshToken)}; ${cookieBase(60 * 60 * 24 * 30)}`,
  ];
}

export function clearSessionCookies() {
  return [
    `${ACCESS_TOKEN_COOKIE}=; ${cookieBase(0)}`,
    `${REFRESH_TOKEN_COOKIE}=; ${cookieBase(0)}`,
  ];
}

type AccessSuccess = {
  userId: string;
  email: string;
  role: "admin" | "super_admin";
};

type AccessFailure = {
  error: string;
  status: number;
};

export async function assertAdminAccess(request: Request): Promise<AccessSuccess | AccessFailure> {
  const cookies = parseCookies(request);
  const accessToken = cookies[ACCESS_TOKEN_COOKIE];
  const refreshToken = cookies[REFRESH_TOKEN_COOKIE];
  if (!accessToken) {
    return { error: "Unauthorized", status: 401 };
  }

  const publicClient = createSupabasePublicClient();
  const { data: authData, error: authError } = await publicClient.auth.getUser(accessToken);

  let user = authData.user ?? null;

  if ((!user || authError) && refreshToken) {
    const { data: refreshed, error: refreshError } = await publicClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (!refreshError && refreshed.session) {
      const { data: refreshedUser } = await publicClient.auth.getUser(
        refreshed.session.access_token,
      );
      user = refreshedUser.user ?? null;
    }
  }

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("student_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, status: 500 };
  }

  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return { error: "Forbidden", status: 403 };
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role,
  };
}
